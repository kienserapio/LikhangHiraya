import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchAnalyticsSnapshot, fetchLowStockProducts } from "../../services/adminApi";
import { supabase } from "../../services/supabaseClient";
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
  categorySales: [],
  topSellers: [],
  riderPerformance: [],
};

export default function Analytics() {
  const [analytics, setAnalytics] = useState(INITIAL_ANALYTICS);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(async (background = false) => {
    if (!background) {
      setIsLoading(true);
    }

    try {
      const [next, nextLowStockProducts] = await Promise.all([
        fetchAnalyticsSnapshot(),
        fetchLowStockProducts(5),
      ]);
      setAnalytics(next);
      setLowStockProducts(nextLowStockProducts);
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Unable to load analytics data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  const totals = useMemo(() => {
    const totalSales = analytics.categorySales.reduce((sum, category) => sum + Number(category.sales || 0), 0);
    const topCategory = analytics.categorySales[0]?.category || "No data";
    const topItem = analytics.topSellers[0];
    const topRider = analytics.riderPerformance[0];

    return {
      totalSales,
      topCategory,
      topItemLabel: topItem ? `${topItem.name} (${topItem.quantity})` : "No data",
      topRiderLabel: topRider ? `${topRider.riderName} (${topRider.completedDeliveries})` : "No data",
    };
  }, [analytics]);

  return (
    <section className={styles.analyticsPage}>
      <header className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>Analytics & Reporting</h2>
          <p className={styles.pageSub}>Monitor category sales, top products, rider output, and low-stock risk in real time.</p>
        </div>
        <div className={styles.pageHeaderActions}>
          <button type="button" className={adminStyles.buttonSecondary} onClick={() => loadAnalytics(false)}>
            Refresh
          </button>
        </div>
      </header>

      {error ? <p className={adminStyles.error}>{error}</p> : null}

      <div className={styles.metricsGrid}>
        <article className={styles.metricCard}>
          <p className={styles.metricLabel}>Total Category Sales</p>
          <p className={styles.metricValue}>{toPeso(totals.totalSales)}</p>
        </article>

        <article className={styles.metricCard}>
          <p className={styles.metricLabel}>Top Category</p>
          <p className={styles.metricValue}>{totals.topCategory}</p>
        </article>

        <article className={styles.metricCard}>
          <p className={styles.metricLabel}>Top Seller</p>
          <p className={styles.metricValue}>{totals.topItemLabel}</p>
        </article>

        <article className={`${styles.metricCard} ${styles.metricCardWarn}`}>
          <p className={styles.metricLabel}>Low Stock Products</p>
          <p className={styles.metricValue}>{lowStockProducts.length}</p>
        </article>
      </div>

      <section className={styles.chartPanel}>
        <div className={styles.panelHeader}>
          <div>
            <h3 className={styles.panelTitle}>Sales Overview by Category</h3>
            <p className={styles.panelSub}>Values are sourced live from delivered order totals.</p>
          </div>
          <p className={styles.liveNote}>{isLoading ? "Syncing..." : "Live"}</p>
        </div>

        {analytics.categorySales.length === 0 && !isLoading ? (
          <p className={styles.emptyState}>No category sales data yet.</p>
        ) : (
          <div className={styles.chartBox}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.categorySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="category" />
                <YAxis tickFormatter={(value) => `P${Number(value).toLocaleString()}`} />
                <Tooltip formatter={(value) => toPeso(value)} />
                <Bar dataKey="sales" fill="#6f4e37" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <div className={styles.dataGrid}>
        <section className={styles.tablePanel}>
          <div className={styles.panelHeader}>
            <div>
              <h3 className={styles.panelTitle}>Top 5 Most Ordered Items</h3>
              <p className={styles.panelSub}>Highest quantity products from delivered orders.</p>
            </div>
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
              <h3 className={styles.panelTitle}>Rider Performance</h3>
              <p className={styles.panelSub}>Completed deliveries per rider.</p>
            </div>
            <p className={styles.topRider}>{totals.topRiderLabel}</p>
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
