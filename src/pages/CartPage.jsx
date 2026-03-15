import { Link, useNavigate } from "react-router-dom";
import { useCartStore } from "../store/cartStore";
import UniversalBottomNav from "../components/UniversalBottomNav";
import "./CartPage.css";

function toPeso(value) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value);
}

export default function CartPage() {
  const navigate = useNavigate();
  const items = useCartStore((state) => state.items);
  const increment = useCartStore((state) => state.increment);
  const decrement = useCartStore((state) => state.decrement);
  const subtotal = useCartStore((state) => state.subtotal());

  return (
    <div className="cart-page">
      <main className="main-content">
        <header className="header-right">
          <div>
            <svg fill="none" height="40" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="40" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="3" width="15" height="13" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
              <line x1="1" y1="13" x2="16" y2="13" />
            </svg>
          </div>
        </header>

        <section>
          <h1 className="cart-title">Your Order:</h1>
        </section>

        <section className="items" id="order-items-list">
          {items.length === 0 ? <p>Your cart is empty.</p> : null}
          {items.map((item) => (
            <div className="item-card" key={item.id} data-purpose="order-item-card">
              <div className="thumb">
                <img alt={item.name} src={item.imageUrl || ""} />
              </div>
              <div className="item-body">
                <div className="item-top">
                  <div>
                    <h3>{item.name}</h3>
                    <p>{toPeso(item.pricePhp)}</p>
                  </div>
                  <div className="rate"><span>★</span> 4.8</div>
                </div>
                <div className="qty-row">
                  <button className="qty-btn" onClick={() => decrement(item.id)} aria-label="Decrease quantity">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4" /></svg>
                  </button>
                  <span className="qty-val">{item.quantity}</span>
                  <button className="qty-btn" onClick={() => increment(item.id)} aria-label="Increase quantity">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="total-row">
          <div>
            <p>Total: {toPeso(subtotal)}</p>
          </div>
        </section>

        <section className="cta-wrap">
          <button className="cta" onClick={() => navigate("/create-order")}>
            <span>Go to Cart</span>
            <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
          </button>
        </section>
      </main>

      <UniversalBottomNav active="cart" />
    </div>
  );
}
