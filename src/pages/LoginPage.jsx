import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuthStore } from "../store/authStore";
import styles from "./Auth.module.css";

const loginSchema = z.object({
  usernameOrEmail: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const rememberMeUsername = useAuthStore((state) => state.rememberMeUsername);
  const [form, setForm] = useState({ usernameOrEmail: rememberMeUsername || "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(Boolean(rememberMeUsername));
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setNotice("");

    const parsed = loginSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    try {
      const loginResult = await login(form, rememberMe);
      setErrors({});

      if (loginResult?.bypassOtp) {
        setNotice("");
        navigate(loginResult.nextRoute || "/admin/dashboard", { replace: true });
        return;
      }

      setNotice(`We sent a 6-digit OTP to ${loginResult?.email || "your email"}.`);
      navigate("/verify-otp", { state: loginResult });
    } catch (error) {
      setErrors({ password: [error.message || "Unable to login"] });
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
          <p className={`${styles.subtitle} ${styles.loginHeaderSubtitle}`}>Login to your account.</p>
        </header>

        <div className={styles.card}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="usernameOrEmail">
                Email or Username:
                <span className={styles["required-star"]}>*</span>
              </label>
              <input
                id="usernameOrEmail"
                className={styles.input}
                value={form.usernameOrEmail}
                onChange={(event) => setForm((prev) => ({ ...prev, usernameOrEmail: event.target.value }))}
                placeholder="you@example.com or username"
              />
              {errors.usernameOrEmail ? <p className={styles.error}>{errors.usernameOrEmail[0]}</p> : null}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="password">
                Password:
                <span className={styles["required-star"]}>*</span>
              </label>
              <div className={styles.passwordInputWrap}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className={`${styles.input} ${styles.inputWithIcon}`}
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                />
                <button
                  type="button"
                  className={styles.passwordIconButton}
                  onClick={() => setShowPassword((previous) => !previous)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M10.58 10.58a2 2 0 0 0 2.84 2.84" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M9.88 5.09A9.77 9.77 0 0 1 12 4.8c5.5 0 9.4 4.2 10.7 6.1a1.8 1.8 0 0 1 0 2.2 18.9 18.9 0 0 1-3.12 3.42" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M6.1 6.1A18.1 18.1 0 0 0 1.3 10.9a1.8 1.8 0 0 0 0 2.2C2.6 15 6.5 19.2 12 19.2c1.64 0 3.13-.37 4.44-.94" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M1.5 12s3.8-6.7 10.5-6.7S22.5 12 22.5 12s-3.8 6.7-10.5 6.7S1.5 12 1.5 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                  )}
                </button>
              </div>
              <p className={styles.subtitle} style={{ marginTop: 4, fontSize: "0.82rem" }}>
                8+ characters with uppercase, lowercase, number, and special character.
              </p>
              {errors.password ? <p className={styles.error}>{errors.password[0]}</p> : null}
            </div>

            <label className={styles.checkRow}>
              <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
              <span>Remember me</span>
            </label>

            <button className={styles.submit} type="submit">Login</button>

            {notice ? <p className={styles.successText}>{notice}</p> : null}
          </form>

          <div className={styles.row}>
            <span className={styles.forgotLink}>Don't have an account?</span>
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
