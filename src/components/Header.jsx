import { Link } from "react-router-dom";
import { useCartStore } from "../store/cartStore";
import styles from "./Header.module.css";

const logoSrc = new URL("../../assets/hiraya.png", import.meta.url).href;

export default function Header({ onSearch, searchValue = "" }) {
  const openDrawer = useCartStore((state) => state.openDrawer);
  const count = useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <img className={styles.logo} src={logoSrc} alt="Likhang Hiraya" />
          <div>
            <p className={styles.title}>Likhang Hiraya</p>
            <p className={styles.subtitle}>Coffee Delivery</p>
          </div>
        </div>

        <nav className={styles.nav}>
          <Link to="/home">Home</Link>
          <Link to="/favorites">Favorites</Link>
          <Link to="/tracking">Active Orders</Link>
          <button type="button" className={styles.cartButton} onClick={openDrawer}>
            Cart
            {count > 0 ? <span className={styles.badge}>{count}</span> : null}
          </button>
        </nav>
      </div>

      {onSearch ? (
        <div className={styles.searchWrap}>
          <input
            value={searchValue}
            onChange={(event) => onSearch(event.target.value)}
            className={styles.search}
            placeholder="Search menu"
            aria-label="Search menu"
          />
        </div>
      ) : null}
    </header>
  );
}
