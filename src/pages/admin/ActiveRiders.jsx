import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAdminRiders } from "../../services/adminApi";
import { supabase } from "../../services/supabaseClient";
import adminStyles from "./Admin.module.css";
import styles from "./ActiveRiders.module.css";

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(parsed);
}

function formatShift(value) {
  const normalized = String(value || "").trim().toUpperCase();
  if (!normalized || normalized === "UNSET") {
    return "Unset";
  }

  if (normalized === "MORNING") {
    return "Morning";
  }
  if (normalized === "AFTERNOON") {
    return "Afternoon";
  }
  if (normalized === "EVENING") {
    return "Evening";
  }
  if (normalized === "NIGHT") {
    return "Night";
  }

  return normalized;
}

export default function ActiveRiders() {
  const [riders, setRiders] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRiders = useCallback(async (background = false) => {
    if (!background) {
      setIsLoading(true);
    }

    try {
      const next = await fetchAdminRiders();
      setRiders(Array.isArray(next) ? next : []);
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Unable to load riders.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRiders(false);
  }, [loadRiders]);

  useEffect(() => {
    const channel = supabase
      .channel(`admin-riders-${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => {
        loadRiders(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadRiders]);

  const filteredRiders = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return riders.filter((rider) => {
      if (onlineOnly && !rider.online) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [rider.fullName, rider.username, rider.email, rider.phone]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [onlineOnly, riders, searchText]);

  const onlineCount = useMemo(
    () => filteredRiders.filter((rider) => rider.online).length,
    [filteredRiders]
  );

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Active Riders</h2>
          <p className={styles.subtitle}>View all registered riders and monitor who is currently online.</p>
        </div>

        <div className={styles.headerActions}>
          <button type="button" className={adminStyles.buttonSecondary} onClick={() => loadRiders(false)}>
            Refresh
          </button>
        </div>
      </header>

      {error ? <p className={adminStyles.error}>{error}</p> : null}

      <div className={styles.metricsRow}>
        <article className={styles.metricCard}>
          <p>Riders Found</p>
          <strong>{filteredRiders.length}</strong>
        </article>
        <article className={styles.metricCard}>
          <p>Online Riders</p>
          <strong>{onlineCount}</strong>
        </article>
        <article className={styles.metricCard}>
          <p>Offline Riders</p>
          <strong>{Math.max(0, filteredRiders.length - onlineCount)}</strong>
        </article>
      </div>

      <section className={styles.filtersPanel}>
        <label className={styles.searchField} htmlFor="admin-rider-search">
          <span>Search</span>
          <input
            id="admin-rider-search"
            type="text"
            placeholder="Search by name, username, phone, or email"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </label>

        <label className={styles.checkboxField} htmlFor="admin-rider-online-only">
          <input
            id="admin-rider-online-only"
            type="checkbox"
            checked={onlineOnly}
            onChange={(event) => setOnlineOnly(event.target.checked)}
          />
          <span>Online only</span>
        </label>
      </section>

      <section className={styles.tablePanel}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Rider</th>
                <th>Contact</th>
                <th>Shift</th>
                <th>Status</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {filteredRiders.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <p className={styles.emptyState}>{isLoading ? "Loading riders..." : "No riders match the current filter."}</p>
                  </td>
                </tr>
              ) : (
                filteredRiders.map((rider) => (
                  <tr key={rider.id}>
                    <td>
                      <div className={styles.riderCell}>
                        <strong>{rider.fullName}</strong>
                        <span>@{rider.username || "rider"}</span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.contactCell}>
                        <span>{rider.phone || "No phone"}</span>
                        <span>{rider.email || "No email"}</span>
                      </div>
                    </td>
                    <td>{formatShift(rider.workingShift)}</td>
                    <td>
                      <span className={rider.online ? styles.statusOnline : styles.statusOffline}>
                        {rider.online ? "Online" : "Offline"}
                      </span>
                    </td>
                    <td>{formatDate(rider.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
