import { useNavigate } from "react-router-dom";
import "./OrderConfirmationPage.css";

export default function OrderConfirmationPage() {
  const navigate = useNavigate();

  return (
    <div className="confirm-page" data-purpose="confirmation-screen">
      <section className="confirm-center" data-purpose="message-block">
        <div style={{ marginBottom: 16, color: "#d3b58e" }}>
          <svg fill="none" width="120" height="80" viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
            <line x1="5" y1="15" x2="35" y2="15" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            <line x1="0" y1="30" x2="30" y2="30" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            <line x1="8" y1="45" x2="28" y2="45" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            <path d="M45 10H85V45H45V10Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
            <path d="M85 15L95 30V45H85" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M85 22H91L85 30V22Z" fill="currentColor" />
            <circle cx="55" cy="50" r="6" stroke="currentColor" strokeWidth="4" />
            <circle cx="82" cy="50" r="6" stroke="currentColor" strokeWidth="4" />
          </svg>
        </div>
        <h1>Thank You For Your Order!</h1>
        <p>Wait For The Call</p>
      </section>

      <section className="confirm-footer" data-purpose="footer-actions">
        <button className="track-btn" type="button" onClick={() => navigate("/order-status")}>Track Your Order</button>
      </section>
    </div>
  );
}
