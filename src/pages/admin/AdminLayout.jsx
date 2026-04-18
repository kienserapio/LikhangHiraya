import { useCallback, useEffect, useRef } from "react";
import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { fetchLowStockProducts } from "../../services/adminApi";
import { supabase } from "../../services/supabaseClient";
import { HIRAYA_LOGO_URL } from "../../constants/branding";
import styles from "./Admin.module.css";

function navLinkClass({ isActive }) {
  return `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`.trim();
}

function navSubLinkClass({ isActive }) {
  return `${styles.navLink} ${styles.navLinkSub} ${isActive ? styles.navLinkActive : ""}`.trim();
}

function NavItemIcon({ type }) {
  const iconProps = {
    className: styles.navIconGlyph,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  switch (type) {
    case "dashboard":
      return (
        <svg {...iconProps}>
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.2" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="1.2" />
        </svg>
      );
    case "inventory":
      return (
        <svg {...iconProps}>
          <path d="M4 7.5 12 3l8 4.5-8 4.5-8-4.5Z" />
          <path d="M4 7.5v9L12 21l8-4.5v-9" />
          <path d="M12 12v9" />
        </svg>
      );
    case "analytics":
      return (
        <svg {...iconProps}>
          <path d="M4 19h16" />
          <path d="M8 15V11" />
          <path d="M12 15V7" />
          <path d="M16 15V9" />
        </svg>
      );
    case "orders":
      return (
        <svg {...iconProps}>
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M9 8h6" />
          <path d="M9 12h6" />
          <path d="M9 16h4" />
        </svg>
      );
    case "orders-active":
      return (
        <svg {...iconProps}>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M8 8h8" />
          <path d="M8 12h6" />
          <path d="M8 16h4" />
          <path d="m14.5 15.5 1.2 1.2 2.3-2.6" />
        </svg>
      );
    case "orders-recent":
      return (
        <svg {...iconProps}>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M8 8h8" />
          <path d="M8 12h8" />
          <path d="M8 16h5" />
          <circle cx="16.5" cy="16.5" r="2.5" />
          <path d="m16.5 15.3.9 1" />
        </svg>
      );
    case "riders":
      return (
        <svg {...iconProps}>
          <circle cx="9" cy="9" r="2.2" />
          <path d="M5.5 16c.7-2 2.1-3.2 3.5-3.2s2.8 1.2 3.5 3.2" />
          <circle cx="16.4" cy="9.8" r="1.8" />
          <path d="M13.8 16c.5-1.5 1.5-2.4 2.6-2.4 1.1 0 2.1.9 2.6 2.4" />
        </svg>
      );
    default:
      return null;
  }
}

const navItems = [
  { to: "/admin/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/admin/inventory", label: "Inventory", icon: "inventory" },
  { to: "/admin/analytics", label: "Analytics", icon: "analytics" },
  { to: "/admin/riders", label: "Riders", icon: "riders" },
];

const orderNavItems = [
  { to: "/admin/orders/active", label: "Active Orders", icon: "orders-active" },
  { to: "/admin/orders/recent", label: "Order History", icon: "orders-recent" },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const alertedLowStockIdsRef = useRef(new Set());

  const checkLowStockNotifications = useCallback(async () => {
    try {
      const lowStockProducts = await fetchLowStockProducts(5);
      for (const product of lowStockProducts) {
        if (alertedLowStockIdsRef.current.has(product.id)) {
          continue;
        }

        alertedLowStockIdsRef.current.add(product.id);
        window.alert(`Low stock alert: ${product.name} is now at ${product.stockQuantity}.`);
      }
    } catch {
      // Keep layout stable even when admin checks fail.
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const lowStockProducts = await fetchLowStockProducts(5);
        if (!mounted) {
          return;
        }
        alertedLowStockIdsRef.current = new Set(lowStockProducts.map((item) => item.id));
      } catch {
        if (!mounted) {
          return;
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel(`admin-order-alerts-${Date.now()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, () => {
        checkLowStockNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [checkLowStockNotifications]);

  if (!user || user.role !== "ADMIN") {
    return <Navigate to="/home" replace />;
  }

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className={styles.adminShell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandRow}>
            <img className={styles.brandLogo} src={HIRAYA_LOGO_URL} alt="Likhang Hiraya" />
            <div>
              <h1 className={styles.brandTitle}>Likhang Hiraya</h1>
              <p className={styles.brandSub}>Restaurant Console</p>
            </div>
          </div>
        </div>

        <nav className={styles.nav}>
          <div className={styles.navGroup}>
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={navLinkClass}>
                <span className={styles.navIcon} aria-hidden="true">
                  <NavItemIcon type={item.icon} />
                </span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>

          <div className={styles.navGroup}>
            <p className={styles.navGroupLabel}>Orders</p>
            {orderNavItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={navSubLinkClass}>
                <span className={styles.navIcon} aria-hidden="true">
                  <NavItemIcon type={item.icon} />
                </span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        <div className={styles.sidebarFooter}>
          <button type="button" className={styles.buttonSecondary} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      <div className={styles.contentArea}>
        <header className={styles.topBar}>
          <div>
            <h2>Admin Workspace</h2>
            <p>Welcome, {user.username}</p>
          </div>
        </header>

        <Outlet />
      </div>
    </div>
  );
}
