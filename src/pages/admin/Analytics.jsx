import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ExportButtonGroup from "../../components/admin/ExportButtonGroup";
import { fetchAdminDashboardSnapshot, fetchAnalyticsSnapshot, fetchLowStockProducts } from "../../services/adminApi";
import { supabase } from "../../services/supabaseClient";
import { exportRowsToExcel, exportRowsToPdf } from "../../utils/adminExports";
import adminStyles from "./Admin.module.css";
import styles from "./Analytics.module.css";

function toPeso(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

const INITIAL_ANALYTICS = {
  range: "WEEK",
  totalRevenueAllTime: 0,
  totalRevenueInRange: 0,
  salesTrend: [],
  categorySales: [],
  productSales: [],
  topSellers: [],
  riderPerformance: [],
};

const INITIAL_REVENUE_METRIC = {
  range: "WEEK",
  totalRevenueInRange: 0,
};

const CATEGORY_RANGE_OPTIONS = [
  { value: "WEEK", label: "This Week" },
  { value: "MONTH", label: "This Month" },
  { value: "YEAR", label: "This Year" },
  { value: "ALL", label: "All Time" },
];

const REVENUE_RANGE_OPTIONS = [
  { value: "YEAR", label: "This Year" },
  { value: "MONTH", label: "This Month" },
  { value: "WEEK", label: "This Week" },
  { value: "DAY", label: "This Day" },
];

const ALL_CATEGORIES_VALUE = "ALL_CATEGORIES";

function categoryRangeLabel(range) {
  const matched = CATEGORY_RANGE_OPTIONS.find((option) => option.value === range);
  return matched?.label || "This Week";
}

function revenueRangeLabel(range) {
  const matched = REVENUE_RANGE_OPTIONS.find((option) => option.value === range);
  return matched?.label || "This Year";
}

function revenueFromDashboard(range, dashboardSnapshot) {
  const revenueTrend = Array.isArray(dashboardSnapshot?.revenueTrend)
    ? dashboardSnapshot.revenueTrend
    : [];

  if (range === "DAY") {
    return Number(dashboardSnapshot?.kpis?.todaysRevenue || 0);
  }

  if (range === "WEEK") {
    return revenueTrend.reduce((sum, point) => sum + Number(point?.revenue || 0), 0);
  }

  if (revenueTrend.length === 0) {
    return 0;
  }

  const lastPoint = revenueTrend[revenueTrend.length - 1];
  return Number(lastPoint?.revenue || 0);
}

export default function Analytics() {
  const [analytics, setAnalytics] = useState(INITIAL_ANALYTICS);
  const [revenueMetric, setRevenueMetric] = useState(INITIAL_REVENUE_METRIC);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [timeRange, setTimeRange] = useState("WEEK");
  const [revenueRange, setRevenueRange] = useState("YEAR");
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES_VALUE);
  const [isRevenueMenuOpen, setIsRevenueMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const revenueFilterRef = useRef(null);

  const loadAnalytics = useCallback(async (background = false) => {
    if (!background) {
      setIsLoading(true);
    }

    try {
      const revenueDashboardRange = revenueRange === "DAY" ? "WEEK" : revenueRange;
      const [analyticsResult, revenueResult, lowStockResult] = await Promise.allSettled([
        fetchAnalyticsSnapshot(timeRange),
        fetchAdminDashboardSnapshot(revenueDashboardRange),
        fetchLowStockProducts(5),
      ]);

      if (analyticsResult.status === "fulfilled") {
        setAnalytics(analyticsResult.value);
        setError("");
      } else {
        setError(analyticsResult.reason?.message || "Unable to load analytics data.");
      }

      if (revenueResult.status === "fulfilled") {
        setRevenueMetric({
          range: revenueRange,
          totalRevenueInRange: revenueFromDashboard(revenueRange, revenueResult.value),
        });
      }

      if (lowStockResult.status === "fulfilled") {
        setLowStockProducts(lowStockResult.value);
      }
    } catch (loadError) {
      setError(loadError.message || "Unable to load analytics data.");
    } finally {
      setIsLoading(false);
    }
  }, [timeRange, revenueRange]);

  useEffect(() => {
    loadAnalytics(false);
  }, [loadAnalytics]);

  useEffect(() => {
    const channel = supabase
      .channel(`admin-analytics-${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        loadAnalytics(true);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => {
        loadAnalytics(true);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        loadAnalytics(true);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => {
        loadAnalytics(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAnalytics]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (!revenueFilterRef.current) {
        return;
      }

      if (revenueFilterRef.current.contains(event.target)) {
        return;
      }

      setIsRevenueMenuOpen(false);
    }

    window.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectedRangeLabel = useMemo(() => categoryRangeLabel(timeRange), [timeRange]);
  const selectedRevenueRangeLabel = useMemo(() => revenueRangeLabel(revenueRange), [revenueRange]);

  const availableCategories = useMemo(
    () => Array.from(new Set(analytics.categorySales.map((entry) => String(entry?.category || "UNCATEGORIZED")))),
    [analytics.categorySales]
  );

  const filteredCategorySales = useMemo(() => {
    if (selectedCategory === ALL_CATEGORIES_VALUE) {
      return analytics.categorySales;
    }

    return analytics.categorySales.filter(
      (entry) => String(entry?.category || "UNCATEGORIZED") === selectedCategory
    );
  }, [analytics.categorySales, selectedCategory]);

  useEffect(() => {
    if (selectedCategory === ALL_CATEGORIES_VALUE) {
      return;
    }

    if (availableCategories.includes(selectedCategory)) {
      return;
    }

    setSelectedCategory(ALL_CATEGORIES_VALUE);
  }, [availableCategories, selectedCategory]);

  const totals = useMemo(() => {
    const topCategory = filteredCategorySales[0]?.category || "No data";
    const topProduct = analytics.topSellers[0];
    const topRider = analytics.riderPerformance[0];

    return {
      totalRevenue: Number(revenueMetric.totalRevenueInRange || 0),
      topCategory,
      topProductLabel: topProduct ? `${topProduct.name} (${topProduct.quantity})` : "No data",
      topRiderLabel: topRider ? `${topRider.riderName} (${topRider.completedDeliveries})` : "No data",
    };
  }, [
    analytics.topSellers,
    analytics.riderPerformance,
    filteredCategorySales,
    revenueMetric.totalRevenueInRange,
  ]);

  const topOrderedRows = useMemo(
    () => analytics.topSellers.map((item) => ({
      item: item.name,
      totalQuantity: Number(item.quantity || 0),
    })),
    [analytics.topSellers]
  );

  const riderPerformanceRows = useMemo(
    () => analytics.riderPerformance.map((entry) => ({
      rider: entry.riderName,
      completedDeliveries: Number(entry.completedDeliveries || 0),
    })),
    [analytics.riderPerformance]
  );

  const lowStockRows = useMemo(
    () => lowStockProducts.map((item) => ({
      product: item.name,
      stock: Number(item.stockQuantity || 0),
    })),
    [lowStockProducts]
  );

  const topOrderedColumns = useMemo(
    () => [
      { key: "item", label: "Item" },
      { key: "totalQuantity", label: "Total Quantity" },
    ],
    []
  );

  const riderPerformanceColumns = useMemo(
    () => [
      { key: "rider", label: "Rider" },
      { key: "completedDeliveries", label: "Completed Deliveries" },
    ],
    []
  );

  const lowStockColumns = useMemo(
    () => [
      { key: "product", label: "Product" },
      { key: "stock", label: "Stock" },
    ],
    []
  );

  function exportTopOrderedPdf() {
    exportRowsToPdf({
      title: "Top Most Ordered Products",
      rows: topOrderedRows,
      columns: topOrderedColumns,
      fileName: "likhang-hiraya-top-most-ordered-products",
    });
  }

  function exportTopOrderedExcel() {
    exportRowsToExcel({
      rows: topOrderedRows,
      columns: topOrderedColumns,
      fileName: "likhang-hiraya-top-most-ordered-products",
      sheetName: "Top Products",
    });
  }

  function exportRiderPerformancePdf() {
    exportRowsToPdf({
      title: "Rider Performance Leaderboard",
      rows: riderPerformanceRows,
      columns: riderPerformanceColumns,
      fileName: "likhang-hiraya-rider-performance",
    });
  }

  function exportRiderPerformanceExcel() {
    exportRowsToExcel({
      rows: riderPerformanceRows,
      columns: riderPerformanceColumns,
      fileName: "likhang-hiraya-rider-performance",
      sheetName: "Rider Performance",
    });
  }

  function exportLowStockPdf() {
    exportRowsToPdf({
      title: "Low Stock Watchlist",
      rows: lowStockRows,
      columns: lowStockColumns,
      fileName: "likhang-hiraya-low-stock-watchlist",
    });
  }

  function exportLowStockExcel() {
    exportRowsToExcel({
      rows: lowStockRows,
      columns: lowStockColumns,
      fileName: "likhang-hiraya-low-stock-watchlist",
      sheetName: "Low Stock",
    });
  }

  return (
    <section className={styles.analyticsPage}>
      <header className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>Analytics & Reporting</h2>
          <p className={styles.pageSub}>Track revenue and category performance by timeframe.</p>
        </div>
        <div className={styles.pageHeaderActions}>
          <button type="button" className={adminStyles.buttonSecondary} onClick={() => loadAnalytics(false)}>
            Refresh
          </button>
        </div>
      </header>

      {error ? <p className={adminStyles.error}>{error}</p> : null}

      <div className={styles.metricsGrid}>
        <article className={`${styles.metricCard} ${styles.metricCardPrimary}`}>
          <div className={styles.metricCardHeader}>
            <p className={styles.metricLabel}>Total Revenue</p>
            <div className={styles.revenueFilter} ref={revenueFilterRef}>
              <button
                type="button"
                className={styles.revenueFilterButton}
                aria-haspopup="menu"
                aria-expanded={isRevenueMenuOpen}
                aria-label="Filter total revenue timeframe"
                onClick={() => setIsRevenueMenuOpen((open) => !open)}
              >
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M4 6h12M6 10h8M8 14h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
              {isRevenueMenuOpen ? (
                <div className={styles.revenueMenu} role="menu" aria-label="Revenue timeframe options">
                  {REVENUE_RANGE_OPTIONS.map((option) => {
                    const isActive = option.value === revenueRange;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="menuitemradio"
                        aria-checked={isActive}
                        className={`${styles.revenueOption} ${isActive ? styles.revenueOptionActive : ""}`.trim()}
                        onClick={() => {
                          setRevenueRange(option.value);
                          setIsRevenueMenuOpen(false);
                        }}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
          <p className={styles.metricValue}>{toPeso(totals.totalRevenue)}</p>
          <p className={styles.metricMeta}>{selectedRevenueRangeLabel}</p>
        </article>

        <article className={styles.metricCard}>
          <p className={styles.metricLabel}>Top Category</p>
          <p className={styles.metricValue}>{totals.topCategory}</p>
        </article>

        <article className={styles.metricCard}>
          <p className={styles.metricLabel}>Top Product</p>
          <p className={styles.metricValue}>{totals.topProductLabel}</p>
        </article>

        <article className={`${styles.metricCard} ${styles.metricCardWarn}`}>
          <p className={styles.metricLabel}>Low Stock Products</p>
          <p className={styles.metricValue}>{lowStockProducts.length}</p>
        </article>
      </div>

      <section className={styles.chartPanel}>
        <div className={styles.panelHeader}>
          <div>
            <h3 className={styles.panelTitle}>Category Sales Bar Chart</h3>
            <p className={styles.panelSub}>Category revenue for {selectedRangeLabel.toLowerCase()}.</p>
          </div>
          <div className={styles.panelHeaderMeta}>
            <label className={styles.rangeField} htmlFor="analytics-category-filter">
              <span>Category</span>
              <select
                id="analytics-category-filter"
                className={styles.rangeSelect}
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
              >
                <option value={ALL_CATEGORIES_VALUE}>All Categories</option>
                {availableCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.rangeField} htmlFor="analytics-category-range">
              <span>Timeframe</span>
              <select
                id="analytics-category-range"
                className={styles.rangeSelect}
                value={timeRange}
                onChange={(event) => setTimeRange(event.target.value)}
              >
                {CATEGORY_RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <p className={styles.liveNote}>{isLoading ? "Syncing..." : "Live"}</p>
          </div>
        </div>

        <div className={styles.chartsGrid}>
          <article className={styles.chartCard}>
            <h4 className={styles.chartTitle}>Category Sales</h4>
            <p className={styles.chartSub}>Revenue grouped by product category.</p>
            {filteredCategorySales.length === 0 && !isLoading ? (
              <p className={styles.emptyState}>No category sales data for the selected filters.</p>
            ) : (
              <div className={styles.chartBox}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredCategorySales}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="category" />
                    <YAxis tickFormatter={(value) => `P${Number(value).toLocaleString("en-PH")}`} />
                    <Tooltip formatter={(value) => toPeso(value)} />
                    <Bar
                      dataKey="sales"
                      fill="#6f4e37"
                      radius={[8, 8, 0, 0]}
                      isAnimationActive
                      animationDuration={380}
                      animationEasing="ease-out"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </article>
        </div>
      </section>

      <div className={styles.dataGrid}>
        <section className={styles.tablePanel}>
          <div className={styles.panelHeader}>
            <div>
              <h3 className={styles.panelTitle}>Top Most Ordered Products</h3>
              <p className={styles.panelSub}>Highest quantity products from delivered orders.</p>
            </div>
            <ExportButtonGroup
              compact
              disabled={topOrderedRows.length === 0}
              onExportPdf={exportTopOrderedPdf}
              onExportExcel={exportTopOrderedExcel}
            />
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Item</th>
                  <th className={styles.alignRight}>Total Quantity</th>
                </tr>
              </thead>
              <tbody>
                {analytics.topSellers.length === 0 ? (
                  <tr>
                    <td colSpan={2}>
                      <p className={styles.emptyState}>{isLoading ? "Loading top sellers..." : "No sales yet."}</p>
                    </td>
                  </tr>
                ) : (
                  analytics.topSellers.map((item) => (
                    <tr key={item.name}>
                      <td>{item.name}</td>
                      <td className={styles.alignRight}>{item.quantity}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.tablePanel}>
          <div className={styles.panelHeader}>
            <div>
              <h3 className={styles.panelTitle}>Rider Performance Leaderboard</h3>
              <p className={styles.panelSub}>Completed deliveries per rider.</p>
            </div>
            <div className={styles.panelHeaderActions}>
              <p className={styles.topRider}>{totals.topRiderLabel}</p>
              <ExportButtonGroup
                compact
                disabled={riderPerformanceRows.length === 0}
                onExportPdf={exportRiderPerformancePdf}
                onExportExcel={exportRiderPerformanceExcel}
              />
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Rider</th>
                  <th className={styles.alignRight}>Completed Deliveries</th>
                </tr>
              </thead>
              <tbody>
                {analytics.riderPerformance.length === 0 ? (
                  <tr>
                    <td colSpan={2}>
                      <p className={styles.emptyState}>{isLoading ? "Loading rider performance..." : "No rider data yet."}</p>
                    </td>
                  </tr>
                ) : (
                  analytics.riderPerformance.map((entry) => (
                    <tr key={entry.riderName}>
                      <td>{entry.riderName}</td>
                      <td className={styles.alignRight}>{entry.completedDeliveries}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.tablePanel}>
          <div className={styles.panelHeader}>
            <div>
              <h3 className={styles.panelTitle}>Low Stock Watchlist</h3>
              <p className={styles.panelSub}>Products at or below 5 units.</p>
            </div>
            <ExportButtonGroup
              compact
              disabled={lowStockRows.length === 0}
              onExportPdf={exportLowStockPdf}
              onExportExcel={exportLowStockExcel}
            />
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th className={styles.alignRight}>Stock</th>
                </tr>
              </thead>
              <tbody>
                {lowStockProducts.length === 0 ? (
                  <tr>
                    <td colSpan={2}>
                      <p className={styles.emptyState}>{isLoading ? "Loading stock watchlist..." : "All products are healthy."}</p>
                    </td>
                  </tr>
                ) : (
                  lowStockProducts.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td className={styles.alignRight}>
                        <span className={item.stockQuantity <= 2 ? styles.stockCritical : styles.stockWarn}>{item.stockQuantity}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  );
}
