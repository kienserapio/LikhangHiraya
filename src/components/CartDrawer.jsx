import { Link } from "react-router-dom";
import { useCartStore } from "../store/cartStore";
import styles from "./CartDrawer.module.css";

function toPeso(value) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value);
}

export default function CartDrawer() {
  const isDrawerOpen = useCartStore((state) => state.isDrawerOpen);
  const closeDrawer = useCartStore((state) => state.closeDrawer);
  const items = useCartStore((state) => state.items);
  const increment = useCartStore((state) => state.increment);
  const decrement = useCartStore((state) => state.decrement);
  const removeItem = useCartStore((state) => state.removeItem);
  const subtotal = useCartStore((state) => state.subtotal());
  const deliveryFee = useCartStore((state) => state.deliveryFee);

  return (
    <>
      {isDrawerOpen ? <button className={styles.backdrop} onClick={closeDrawer} aria-label="Close cart" /> : null}
      <aside className={`${styles.drawer} ${isDrawerOpen ? styles.open : ""}`}>
        <header className={styles.header}>
          <h2>Cart</h2>
          <button onClick={closeDrawer} className={styles.close} aria-label="Close drawer">
            x
          </button>
        </header>

        <div className={styles.items}>
          {items.length === 0 ? <p>Your cart is empty.</p> : null}
          {items.map((item) => (
            <article key={item.cartKey || item.id} className={styles.item}>
              <div>
                <h3>{item.name}</h3>
                <p>{toPeso(item.pricePhp)}</p>
              </div>
              <div className={styles.actions}>
                <button onClick={() => decrement(item.cartKey || item.id)} aria-label={`Decrease ${item.name}`}>
                  -
                </button>
                <span>{item.quantity}</span>
                <button onClick={() => increment(item.cartKey || item.id)} aria-label={`Increase ${item.name}`}>
                  +
                </button>
                <button onClick={() => removeItem(item.cartKey || item.id)} aria-label={`Remove ${item.name}`}>
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>

        <footer className={styles.footer}>
          <p>Subtotal: {toPeso(subtotal)}</p>
          <p>Delivery: {toPeso(deliveryFee)}</p>
          <p>Total: {toPeso(subtotal + deliveryFee)}</p>
          <Link className={styles.checkout} to="/cart" onClick={closeDrawer}>
            Checkout
          </Link>
        </footer>
      </aside>
    </>
  );
}
