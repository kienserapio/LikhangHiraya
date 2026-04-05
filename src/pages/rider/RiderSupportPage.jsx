import { useNavigate } from "react-router-dom";
import RiderBottomNav from "../../components/rider/RiderBottomNav";
import styles from "./RiderSupportPage.module.css";

export default function RiderSupportPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <button type="button" className={styles.backButton} onClick={() => navigate("/rider/dashboard")} aria-label="Back to dashboard">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M14.8 6.5 9.3 12l5.5 5.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className={styles.topTitle}>Support</h1>
      </header>

      <main className={styles.main}>
        <section className={styles.card}>
          <h2>Need help on your current delivery?</h2>
          <p>Contact the dispatch team for rider concerns, order routing issues, and emergency updates.</p>
        </section>

        <a className={styles.actionCard} href="tel:+639171234567">
          <h3>Call Dispatch</h3>
          <p>+63 917 123 4567</p>
        </a>

        <a className={styles.actionCard} href="mailto:support@likhanghiraya.ph">
          <h3>Email Support</h3>
          <p>support@likhanghiraya.ph</p>
        </a>

        <section className={styles.card}>
          <h3>Quick Tips</h3>
          <ul className={styles.tipList}>
            <li>Confirm pickup only when items are complete.</li>
            <li>Use in-app status updates for every delivery step.</li>
            <li>Report unreachable addresses immediately.</li>
          </ul>
        </section>
      </main>

      <RiderBottomNav />
    </div>
  );
}
