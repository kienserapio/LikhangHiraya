import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Auth.module.css";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    if (password.length >= 8 && password === confirm) {
      navigate("/login");
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1 className={styles.title}>Reset Password</h1>
        <form className={styles.form} onSubmit={handleSubmit}>
          <input className={styles.input} type="password" placeholder="New Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <input className={styles.input} type="password" placeholder="Confirm Password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <button className={styles.submit} type="submit">Save Password</button>
        </form>
      </div>
    </div>
  );
}
