import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuthStore } from "../store/authStore";
import styles from "./Auth.module.css";

const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const loginSchema = z.object({
  usernameOrEmail: z.string().min(1, "Username or email is required"),
  password: z
    .string()
    .regex(
      strongPasswordPattern,
      "Password must be at least 8 chars and include uppercase, lowercase, number, and special character"
    ),
});

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const rememberMeUsername = useAuthStore((state) => state.rememberMeUsername);
  const [form, setForm] = useState({ usernameOrEmail: rememberMeUsername || "", password: "" });
  const [loginAsRole, setLoginAsRole] = useState("CUSTOMER");
  const [rememberMe, setRememberMe] = useState(Boolean(rememberMeUsername));
  const [errors, setErrors] = useState({});

  async function handleSubmit(event) {
    event.preventDefault();
    const parsed = loginSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    try {
      await login(form, rememberMe, loginAsRole);
      navigate("/mfa");
    } catch (error) {
      setErrors({ password: [error.message || "Invalid credentials"] });
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={`${styles.decorationContainer} ${styles.headerDecoration}`} aria-hidden="true">
        <svg className={styles.decorationSvg} preserveAspectRatio="none" viewBox="0 0 500 200" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,0 L500,0 L500,100 C420,160 300,50 180,130 C100,180 40,110 0,160 Z" fill="#a68f82" />
        </svg>
        <img className={styles.placeholderPattern} src="/assets/Background.png" alt="" />
      </div>

      <div className={`${styles.decorationContainer} ${styles.footerDecoration}`} aria-hidden="true">
        <svg className={styles.decorationSvg} preserveAspectRatio="none" viewBox="0 0 500 150" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,150 L500,150 L500,60 C420,120 300,10 180,90 C100,140 40,70 0,120 Z" fill="#a68f82" />
        </svg>
        <img className={styles.placeholderPattern} src="/assets/Background.png" alt="" />
      </div>

      <main className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.welcomeTitle}>Welcome back to<br />Likhang Hiraya!</h1>
          <p className={styles.subtitle}>Login to your account.</p>
        </header>

        <div className={styles.card}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="usernameOrEmail">Username or Email:</label>
              <input
                id="usernameOrEmail"
                className={styles.input}
                value={form.usernameOrEmail}
                onChange={(event) => setForm((prev) => ({ ...prev, usernameOrEmail: event.target.value }))}
              />
              {errors.usernameOrEmail ? <p className={styles.error}>{errors.usernameOrEmail[0]}</p> : null}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="password">Password:</label>
              <input
                id="password"
                type="password"
                className={styles.input}
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              />
              <p className={styles.subtitle} style={{ marginTop: 4, fontSize: "0.82rem" }}>
                Must be 8+ chars with uppercase, lowercase, number, and special character.
              </p>
              {errors.password ? <p className={styles.error}>{errors.password[0]}</p> : null}
            </div>

            <label className={styles.checkRow}>
              <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
              <span>Remember me</span>
            </label>

            <div className={styles.field}>
              <label className={styles.label}>Login as:</label>
              <select
                className={styles.input}
                value={loginAsRole}
                onChange={(event) => setLoginAsRole(event.target.value)}
              >
                <option value="CUSTOMER">Customer</option>
                <option value="RIDER">Delivery Rider</option>
              </select>
            </div>

            <button className={styles.submit} type="submit">Login</button>
          </form>

          <div className={styles.row}>
            <Link className={styles.forgotLink} to="/forgot-password">Forgot Password?</Link>
            <Link className={styles.link} to="/register">Sign up</Link>
          </div>
          <div className={styles.row} style={{ marginTop: 8 }}>
            <Link className={styles.link} to="/rider-signup">Sign up as Delivery Rider</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
