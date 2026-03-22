import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import AppShell from "../components/AppShell";
import { findOrderById, subscribeLocalData } from "../services/localData";
import styles from "./TrackingPage.module.css";

const statuses = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "RIDER_ASSIGNED",
  "PICKED_UP",
  "IN_TRANSIT",
  "DELIVERED",
];

export default function TrackingPage() {
  const location = useLocation();
  const [orderId, setOrderId] = useState("");
  const [status, setStatus] = useState(location.state?.status || "PENDING");

  useEffect(() => {
    if (!orderId) {
      return undefined;
    }

    let mounted = true;
    const refresh = async () => {
      const order = await findOrderById(orderId.trim());
      if (!mounted || !order) {
        return;
      }
      setStatus(order.status);
    };

    refresh();
    const unsubscribe = subscribeLocalData(refresh);

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [orderId]);

  const activeIndex = useMemo(() => statuses.indexOf(status), [status]);

  return (
    <AppShell>
      <h1 className={styles.title}>Real-Time Order Tracking</h1>
      <p>Order ID</p>
      <input
        className={styles.input}
        placeholder="Paste your order UUID"
        value={orderId}
        onChange={(event) => setOrderId(event.target.value)}
      />

      <div className={styles.stepper}>
        {statuses.map((step, index) => (
          <div key={step} className={`${styles.step} ${index <= activeIndex ? styles.active : ""}`}>
            <span className={styles.dot}>{index + 1}</span>
            <p>{step.replaceAll("_", " ")}</p>
          </div>
        ))}
      </div>

      {activeIndex >= statuses.indexOf("RIDER_ASSIGNED") ? (
        <article className={styles.riderCard}>
          <h2>Rider Info</h2>
          <p>Name: Juan Dela Cruz</p>
          <p>Phone: 09171234567</p>
          <p>Route: Rider is approaching Manila, Globe St. ABC 123</p>
        </article>
      ) : null}
    </AppShell>
  );
}
