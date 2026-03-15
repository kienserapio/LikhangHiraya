import { useNavigate } from "react-router-dom";
import "./OrderStatusDetailsPage.css";

const timeline = [
  { title: "Order Confirmed", date: "20-12-2022", time: "11.00PM", icon: "📦", active: true },
  { title: "Order Processed", date: "20-12-2022", time: "10.00PM", icon: "🎯", active: false },
  { title: "On Delivery", date: "20-12-2022", time: "12.00PM", icon: "🚚", active: false },
  { title: "Order Completed", date: ".......", time: "", icon: "👍", active: false },
];

export default function OrderStatusDetailsPage() {
  const navigate = useNavigate();

  return (
    <div className="order-status">
      <header className="status-header">
        <button className="status-back" onClick={() => navigate("/home")} aria-label="Go Back">
          <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1>Order Status Details</h1>
      </header>

      <main className="status-main">
        <div className="vline" data-purpose="vertical-timeline-guide" />
        <div className="status-list">
          {timeline.map((item) => (
            <div key={item.title} className="timeline-item" data-purpose="timeline-item">
              <div className="icon-wrap">{item.icon}</div>
              <div className={`dot ${item.active ? "active" : ""}`} />
              <div className="status-card">
                <div className="status-top">
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.date}</p>
                  </div>
                  {item.time ? <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280" }}>{item.time}</div> : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
