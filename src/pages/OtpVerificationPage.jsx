import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./Auth.module.css";

export default function OtpVerificationPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [otp, setOtp] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    if (otp.length === 6) {
      navigate("/reset-password", { state: { email: location.state?.email } });
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1 className={styles.title}>Verify OTP</h1>
        <p>Enter the 6-digit code sent to {location.state?.email || "your email"}.</p>
        <form className={styles.form} onSubmit={handleSubmit}>
          <input className={styles.input} maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" />
          <button className={styles.submit} type="submit">Verify</button>
        </form>
      </div>
    </div>
  );
}
