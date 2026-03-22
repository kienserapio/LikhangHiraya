import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import { findLatestOrderForCurrentUser, findOrderById, subscribeLocalData } from "../services/localData";

function toPeso(value) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value || 0));
}

export default function SuccessPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    let mounted = true;

    const refresh = async () => {
      const result = orderId ? await findOrderById(orderId) : await findLatestOrderForCurrentUser();
      if (mounted) {
        setOrder(result);
      }
    };

    refresh();
    const cleanup = subscribeLocalData(refresh);
    return () => {
      mounted = false;
      cleanup();
    };
  }, [orderId]);

  if (!order) {
    return (
      <AppShell>
        <h1>Order Summary</h1>
        <p>No order found yet.</p>
        <Link to="/home">Back to Home</Link>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1>Order Summary</h1>
      <p>Order ID: {order.orderId}</p>
      <p>Status: {order.status.replaceAll("_", " ")}</p>
      <p>Estimated Delivery Time: 35-45 minutes</p>

      <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
        {(order.items || []).map((item) => (
          <div key={`${order.orderId}-${item.productId}`} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <span>{item.quantity}x {item.productName}</span>
            <strong>{toPeso(item.subtotal)}</strong>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, display: "grid", gap: 4 }}>
        <p style={{ margin: 0 }}>Subtotal: {toPeso(order.subtotal)}</p>
        <p style={{ margin: 0 }}>Delivery Fee: {toPeso(order.deliveryFee)}</p>
        <p style={{ margin: 0, fontWeight: 800 }}>Total: {toPeso(order.total)}</p>
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link to="/order-status">Track Order</Link>
        <Link to="/home">Back to Home</Link>
      </div>
    </AppShell>
  );
}
