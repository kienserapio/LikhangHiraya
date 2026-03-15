import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Auth.module.css";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    navigate("/verify-otp", { state: { email } });
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1 className={styles.title}>Forgot Password</h1>
        <p>Enter your email to receive a 6-digit OTP (5-minute expiry).</p>
        <form className={styles.form} onSubmit={handleSubmit}>
          <input className={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <button className={styles.submit} type="submit">Send OTP</button>
        </form>
      </div>
    </div>
  );
}
