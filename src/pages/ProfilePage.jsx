import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useCartStore } from "../store/cartStore";
import UniversalBottomNav from "../components/UniversalBottomNav";
import "./ProfilePage.css";

function Icon({ children }) {
  return <span style={{ display: "inline-grid", placeItems: "center", width: 24, height: 24 }}>{children}</span>;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const profile = useAuthStore((state) => state.profile);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const logout = useAuthStore((state) => state.logout);
  const cartCount = useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));

  const avatarLetter = (profile.fullName || profile.username || "A").charAt(0).toUpperCase();

  const editField = (field, label) => {
    const current = profile[field] || "";
    const next = window.prompt(`Edit ${label}`, current);
    if (next !== null) {
      updateProfile({ [field]: next });
    }
  };

  return (
    <div className="profile-screen">
      <div className="iphone-canvas">
        <main className="profile-main">
          <section className="profile-summary" data-purpose="profile-summary">
            <div className="profile-avatar-gradient">{avatarLetter}</div>
            <div className="name-row">
              <h1>{profile.fullName || profile.username || "hello po"}</h1>
              <button className="icon-btn" onClick={() => editField("fullName", "name")} aria-label="Edit name">
                <Icon>✎</Icon>
              </button>
            </div>
          </section>

          <section className="settings" data-purpose="settings-list">
            <h2>Settings</h2>

            <div className="setting-row">
              <div className="setting-left">
                <Icon>📞</Icon>
                <span className="setting-text">{profile.phone || "+380483746375"}</span>
              </div>
              <button className="icon-btn" onClick={() => editField("phone", "phone")} aria-label="Edit phone"><Icon>›</Icon></button>
            </div>

            <div className="setting-row">
              <div className="setting-left">
                <Icon>📍</Icon>
                <span className="setting-text">{profile.address || "Ukraine, Ivano-Frankivsk, Kon..."}</span>
              </div>
              <button className="icon-btn" onClick={() => editField("address", "address")} aria-label="Edit address"><Icon>›</Icon></button>
            </div>

            <div className="setting-row">
              <div className="setting-left">
                <Icon>⚙️</Icon>
                <span className="setting-text">Settings</span>
              </div>
              <button className="icon-btn" onClick={() => navigate("/settings")} aria-label="Open settings"><Icon>›</Icon></button>
            </div>

            <div className="setting-row">
              <div className="setting-left">
                <div style={{ position: "relative" }}>
                  <Icon>🛒</Icon>
                  <span style={{ position: "absolute", top: -2, right: -2, width: 12, height: 12, borderRadius: 999, background: "#111", color: "#fff", fontSize: 10, display: "grid", placeItems: "center" }}>+</span>
                </div>
                <span className="setting-text">My Cart ({cartCount})</span>
              </div>
              <button className="icon-btn" onClick={() => navigate("/cart")} aria-label="Go to cart"><Icon>›</Icon></button>
            </div>

            <div className="logout-wrap">
              <button
                className="logout-btn"
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
              >
                <span>Logout</span>
                <span style={{ transform: "rotate(180deg)", display: "inline-block" }}>↪</span>
              </button>
            </div>
          </section>
        </main>

        <UniversalBottomNav active="profile" />
      </div>
    </div>
  );
}
