import { NavLink, useLocation } from "react-router-dom";
import styles from "./RiderBottomNav.module.css";

const navItems = [
  {
    to: "/rider/dashboard",
    label: "Home",
    key: "home",
    match: (pathname) => pathname.startsWith("/rider/dashboard"),
  },
  {
    to: "/rider/active",
    label: "Orders",
    key: "orders",
    match: (pathname) => pathname.startsWith("/rider/active"),
  },
  {
    to: "/rider/profile",
    label: "Profile",
    key: "profile",
    match: (pathname) => pathname.startsWith("/rider/profile") || pathname.startsWith("/rider/support"),
  },
];

function RiderNavIcon({ type }) {
  if (type === "home") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3.5 9.8 12 4.5l8.5 5.3v9.2a1.5 1.5 0 0 1-1.5 1.5h-5.6v-5.4H10.6v5.4H5a1.5 1.5 0 0 1-1.5-1.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === "orders") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M2.75 6.75h10.5v8.5H2.75z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13.25 9h4.2l2.3 2.9v3.35h-6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="7.1" cy="17.2" r="1.55" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="16.55" cy="17.2" r="1.55" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (type === "profile") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="8.25" r="3.2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5.25 18.5c1.6-2.55 3.95-3.8 6.75-3.8s5.15 1.25 6.75 3.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  return null;
}

export default function RiderBottomNav() {
  const location = useLocation();

  return (
    <nav className={styles.navWrap} aria-label="Rider navigation">
      {navItems.map((item) => {
        const isActive = item.match(location.pathname);
        return (
          <NavLink key={item.to} to={item.to} className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`.trim()}>
            <span className={styles.navIcon}><RiderNavIcon type={item.key} /></span>
            <span className={styles.navLabel}>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
