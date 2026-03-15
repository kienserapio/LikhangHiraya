import Navbar from "./Navbar";
import CartDrawer from "./CartDrawer";
import styles from "./AppShell.module.css";

export default function AppShell({ children, onSearch, searchValue }) {
  return (
    <div className={styles.page}>
      <Navbar onSearch={onSearch} searchValue={searchValue} />
      <main className={styles.content}>{children}</main>
      <CartDrawer />
    </div>
  );
}
