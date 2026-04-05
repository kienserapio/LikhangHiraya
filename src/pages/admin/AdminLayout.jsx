import { useCallback, useEffect, useRef } from "react";
import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { fetchLowStockProducts } from "../../services/adminApi";
import { supabase } from "../../services/supabaseClient";
import styles from "./Admin.module.css";

function navLinkClass({ isActive }) {
  return `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`.trim();
}

const navItems = [
  { to: "/admin/dashboard", label: "Dashboard", icon: "▦" },
  { to: "/admin/inventory", label: "Inventory", icon: "◫" },
  { to: "/admin/analytics", label: "Analytics", icon: "◍" },
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
            <img className={styles.brandLogo} src="/assets/hiraya.png" alt="Likhang Hiraya" />
            <div>
              <h1 className={styles.brandTitle}>Likhang Hiraya</h1>
              <p className={styles.brandSub}>Restaurant Console</p>
            </div>
          </div>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={navLinkClass}>
              <span className={styles.navIcon} aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
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
