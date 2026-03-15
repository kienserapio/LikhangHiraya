import { Link } from "react-router-dom";
import { useCartStore } from "../store/cartStore";
import { useAuthStore } from "../store/authStore";
import "./UniversalBottomNav.css";

export default function UniversalBottomNav({ active }) {
  const cartCount = useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));
  const profile = useAuthStore((state) => state.profile);
  const avatarLetter = (profile.fullName || profile.username || "A").charAt(0).toUpperCase();

  return (
    <nav className="ubn-wrap" data-purpose="bottom-nav">
      <div className="ubn-inner">
        <Link className={`ubn-tab ${active === "home" ? "active" : ""}`} to="/home">
          {active === "home" ? <div className="ubn-bar" /> : null}
          <svg width="28" height="28" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 9.5L12 4l9 5.5V19a1 1 0 01-1 1h-5v-5h-2v5H5a1 1 0 01-1-1V9.5z" /></svg>
          <span>Home</span>
        </Link>

        <Link className={`ubn-tab ${active === "favorites" ? "active" : ""}`} to="/favorites">
          {active === "favorites" ? <div className="ubn-bar" /> : null}
          <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
          <span>Favourite</span>
        </Link>

        <Link className={`ubn-tab ${active === "cart" ? "active" : ""}`} to="/cart">
          {active === "cart" ? <div className="ubn-bar" /> : null}
          <div style={{ position: "relative" }}>
            {cartCount > 0 ? <span className="ubn-badge">{Math.min(cartCount, 99)}</span> : null}
            <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
          <span>Cart</span>
        </Link>

        <Link className={`ubn-tab ${active === "profile" ? "active" : ""}`} to="/profile">
          {active === "profile" ? <div className="ubn-bar" /> : null}
          <div className="ubn-avatar">{avatarLetter}</div>
          <span>Profile</span>
        </Link>
      </div>
    </nav>
  );
}
