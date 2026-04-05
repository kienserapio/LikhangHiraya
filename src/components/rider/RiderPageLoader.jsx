import styles from "./RiderPageLoader.module.css";

export default function RiderPageLoader({ topOffset = 0, message = "Let's Wait!" }) {
  return (
    <div className={styles.stage} style={{ "--loader-top-offset": `${Number(topOffset) || 0}px` }}>
      <div className={styles.floatWrap}>
        <div className={styles.iconWrap} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M5 8.2h10.7v6.8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M15.7 9.6h2.1a2.5 2.5 0 0 1 0 5h-2.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8.1 6.7c0-.9.7-1.5 1.5-1.5M11 6.2c0-1.1.8-2 1.8-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M4.5 19.3h12.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
        <p className={styles.text}>{message}</p>
      </div>
    </div>
  );
}
