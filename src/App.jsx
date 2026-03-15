import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import OtpVerificationPage from "./pages/OtpVerificationPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import MathChallengePage from "./pages/MathChallengePage";
import HomePage from "./pages/HomePage";
import FavoritesPage from "./pages/FavoritesPage";
import CartPage from "./pages/CartPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import TrackingPage from "./pages/TrackingPage";
import SuccessPage from "./pages/SuccessPage";
import ProfilePage from "./pages/ProfilePage";
import CreateOrderPage from "./pages/CreateOrderPage";
import OrderConfirmationPage from "./pages/OrderConfirmationPage";
import OrderStatusDetailsPage from "./pages/OrderStatusDetailsPage";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/verify-otp" element={<OtpVerificationPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/mfa" element={<MathChallengePage />} />

      <Route path="/home" element={<ProtectedRoute requireMfa><HomePage /></ProtectedRoute>} />
      <Route path="/favorites" element={<ProtectedRoute requireMfa><FavoritesPage /></ProtectedRoute>} />
      <Route path="/cart" element={<ProtectedRoute requireMfa><CartPage /></ProtectedRoute>} />
      <Route path="/products/:productId" element={<ProtectedRoute requireMfa><ProductDetailPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute requireMfa><ProfilePage /></ProtectedRoute>} />
      <Route path="/create-order" element={<ProtectedRoute requireMfa><CreateOrderPage /></ProtectedRoute>} />
      <Route path="/order-confirmation" element={<ProtectedRoute requireMfa><OrderConfirmationPage /></ProtectedRoute>} />
      <Route path="/order-status" element={<ProtectedRoute requireMfa><OrderStatusDetailsPage /></ProtectedRoute>} />
      <Route path="/tracking" element={<ProtectedRoute requireMfa><TrackingPage /></ProtectedRoute>} />
      <Route path="/success/:orderId" element={<ProtectedRoute requireMfa><SuccessPage /></ProtectedRoute>} />
    </Routes>
  );
}
