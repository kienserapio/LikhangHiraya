import { Link, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";

export default function SuccessPage() {
  const { orderId } = useParams();

  return (
    <AppShell>
      <h1>Order Confirmed</h1>
      <p>Order ID: {orderId}</p>
      <p>Estimated Delivery Time: 35-45 minutes</p>
      <Link to="/order-status">Track Order</Link>
    </AppShell>
  );
}
