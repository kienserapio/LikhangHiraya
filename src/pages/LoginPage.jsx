import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuthStore } from "../store/authStore";
import styles from "./Auth.module.css";

const loginSchema = z.object({
  usernameOrEmail: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const rememberMeUsername = useAuthStore((state) => state.rememberMeUsername);
  const [form, setForm] = useState({ usernameOrEmail: rememberMeUsername || "", password: "" });
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
      await login(form, rememberMe);
      navigate("/mfa");
    } catch (error) {
      setErrors({ password: [error.message || "Invalid credentials"] });
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1 className={styles.title}>Welcome Back</h1>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            className={styles.input}
            placeholder="Username or Email"
            value={form.usernameOrEmail}
            onChange={(event) => setForm((prev) => ({ ...prev, usernameOrEmail: event.target.value }))}
          />
          {errors.usernameOrEmail ? <p className={styles.error}>{errors.usernameOrEmail[0]}</p> : null}

          <input
            type="password"
            className={styles.input}
            placeholder="Password"
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
          />
          {errors.password ? <p className={styles.error}>{errors.password[0]}</p> : null}

          <label>
            <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} /> Remember me
          </label>

          <button className={styles.submit} type="submit">Login</button>
        </form>

        <div className={styles.row}>
          <Link className={styles.link} to="/forgot-password">Forgot Password?</Link>
          <Link className={styles.link} to="/register">Create Account</Link>
        </div>
      </div>
    </div>
  );
}
