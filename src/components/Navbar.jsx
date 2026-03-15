import { Link } from "react-router-dom";
import { useCartStore } from "../store/cartStore";
import styles from "./Navbar.module.css";

export default function Navbar({ onSearch, searchValue = "" }) {
  const openDrawer = useCartStore((state) => state.openDrawer);
  const count = useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));

  return (
    <header className={styles.navbar}>
      <div className={styles.topRow}>
        <div>
          <p className={styles.logo}>Likhang Hiraya</p>
          <p className={styles.location}>Manila, Globe St. ABC 123</p>
        </div>

        <input id="menu-toggle" type="checkbox" className={styles.menuToggle} />
        <label htmlFor="menu-toggle" className={styles.hamburger} aria-label="Toggle menu">
          <span />
          <span />
          <span />
        </label>

        <nav className={styles.desktopLinks}>
          <Link to="/home">Home</Link>
          <Link to="/favorites">Favorites</Link>
          <Link to="/tracking">Tracking</Link>
          <button type="button" className={styles.cartButton} onClick={openDrawer}>
            Cart
            {count > 0 ? <span className={styles.badge}>{count}</span> : null}
          </button>
        </nav>
      </div>

      <div className={styles.mobileDrawer}>
        <Link to="/home">Home</Link>
        <Link to="/favorites">Favorites</Link>
        <Link to="/cart">Cart</Link>
        <Link to="/tracking">Tracking</Link>
      </div>

      {onSearch ? (
        <div className={styles.searchWrap}>
          <input
            value={searchValue}
            onChange={(event) => onSearch(event.target.value)}
            className={styles.search}
            placeholder="Search menu..."
            aria-label="Search menu"
          />
        </div>
      ) : null}
    </header>
  );
}
