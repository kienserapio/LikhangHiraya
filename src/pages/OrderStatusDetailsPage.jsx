import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useOrderTracking } from "../hooks/useOrderTracking";
import { orderApi } from "../services/api";
import "./OrderStatusDetailsPage.css";

const timelineTemplate = [
  { title: "Order Confirmed", icon: "📦" },
  { title: "Order Processed", icon: "🎯" },
  { title: "On Delivery", icon: "🚚" },
  { title: "Order Completed", icon: "👍" },
];

function statusToTimelineIndex(status) {
  if (status === "CONFIRMED") {
    return 0;
  }
  if (status === "PREPARING") {
    return 1;
  }
  if (status === "RIDER_ASSIGNED" || status === "PICKED_UP" || status === "IN_TRANSIT" || status === "ARRIVED") {
    return 2;
  }
  if (status === "DELIVERED") {
    return 3;
  }
  return -1;
}

function formatTimelineDateTime(value) {
  if (!value) {
    return { date: ".......", time: "" };
  }

  const date = new Date(value);
  return {
    date: new Intl.DateTimeFormat("en-PH", { month: "2-digit", day: "2-digit", year: "numeric" }).format(date),
    time: new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit" }).format(date),
  };
}

export default function OrderStatusDetailsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [trackedOrderId, setTrackedOrderId] = useState(location.state?.orderId || "");

  useEffect(() => {
    if (trackedOrderId) {
      return undefined;
    }

    let mounted = true;
    orderApi
      .listMine("active")
      .then((orders) => {
        if (!mounted) {
          return;
        }
        if (Array.isArray(orders) && orders.length > 0) {
          setTrackedOrderId(orders[0].orderId || orders[0].id || "");
        }
      })
      .catch(() => {
        if (!mounted) {
          return;
        }
      });

    return () => {
      mounted = false;
    };
  }, [trackedOrderId]);

  const { order } = useOrderTracking(trackedOrderId);

  const timeline = useMemo(() => {
    const activeIndex = statusToTimelineIndex(order?.status);
    const confirmed = formatTimelineDateTime(order?.acceptedAt || order?.createdAt);
    const processed = formatTimelineDateTime(order?.acceptedAt || order?.createdAt);
    const onDelivery = formatTimelineDateTime(order?.pickedUpAt || order?.arrivedAt || order?.deliveredAt);
    const completed = formatTimelineDateTime(order?.deliveredAt);

    const entries = [confirmed, processed, onDelivery, completed];
    return timelineTemplate.map((item, index) => ({
      ...item,
      ...entries[index],
      active: index <= activeIndex,
    }));
  }, [order]);

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
              <div
                className={`dot ${item.active ? "active" : ""} ${
                  item.title === "Order Confirmed" || item.title === "Order Processed" ? "checked" : ""
                }`}
              />
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
