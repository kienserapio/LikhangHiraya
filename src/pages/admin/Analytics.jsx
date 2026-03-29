import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchAnalyticsSnapshot } from "../../services/adminApi";
import styles from "./Admin.module.css";

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const next = await fetchAnalyticsSnapshot();
      setAnalytics(next);
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Unable to load analytics data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return (
    <section className={styles.pageSection}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Analytics & Reporting</h2>
          <p className={styles.sectionSub}>Monitor category sales, top products, and rider delivery output.</p>
        </div>
        <button type="button" className={styles.buttonSecondary} onClick={loadAnalytics}>
          Refresh
        </button>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      <section className={styles.panel}>
        <h3>Sales Overview by Category</h3>
        <div className={styles.chartBox}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.categorySales}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="category" />
              <YAxis tickFormatter={(value) => `P${Number(value).toLocaleString()}`} />
              <Tooltip formatter={(value) => toPeso(value)} />
              <Bar dataKey="sales" fill="#7c4f34" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className={styles.gridTwo}>
        <section className={styles.panel}>
          <h3>Top 5 Most Ordered Items</h3>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Total Quantity</th>
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
                      <td>{item.quantity}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.panel}>
          <h3>Rider Performance</h3>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Rider</th>
                  <th>Completed Deliveries</th>
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
                      <td>{entry.completedDeliveries}</td>
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
