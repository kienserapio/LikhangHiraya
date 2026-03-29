import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuthStore } from "../store/authStore";
import styles from "./Auth.module.css";

const registerSchema = z
  .object({
    fullName: z.string().min(2, "Full name is required"),
    email: z.string().email("Invalid email"),
    phone: z.string().regex(/^09\d{9}$/, "Use 09XXXXXXXXX"),
    username: z.string().min(4, "Username must be at least 4 chars"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8),
    address: z.string().min(8, "Address is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords must match",
  });

export default function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    username: "",
    password: "",
    confirmPassword: "",
    address: "",
  });
  const [errors, setErrors] = useState({});

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    try {
      updateProfile({
        fullName: form.fullName,
        username: form.username,
        email: form.email,
        phone: form.phone,
        address: form.address,
      });
      await register({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        username: form.username,
        password: form.password,
        address: form.address,
      });
      navigate("/login");
    } catch (error) {
      setErrors({ username: [error.message || "Unable to create account"] });
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
          <h1 className={styles.welcomeTitle}>Welcome to<br />Likhang Hiraya!</h1>
          <p className={styles.subtitle}>Create your account.</p>
        </header>

        <div className={styles.card}>
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="fullName">Full Name:</label>
              <input id="fullName" className={styles.input} onChange={(e) => handleChange("fullName", e.target.value)} />
              {errors.fullName ? <p className={styles.error}>{errors.fullName[0]}</p> : null}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="email">Email:</label>
              <input id="email" className={styles.input} onChange={(e) => handleChange("email", e.target.value)} />
              {errors.email ? <p className={styles.error}>{errors.email[0]}</p> : null}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="phone">Phone:</label>
              <input id="phone" className={styles.input} placeholder="09XXXXXXXXX" onChange={(e) => handleChange("phone", e.target.value)} />
              {errors.phone ? <p className={styles.error}>{errors.phone[0]}</p> : null}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="username">Username:</label>
              <input id="username" className={styles.input} onChange={(e) => handleChange("username", e.target.value)} />
              {errors.username ? <p className={styles.error}>{errors.username[0]}</p> : null}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="password">Password:</label>
              <input id="password" type="password" className={styles.input} onChange={(e) => handleChange("password", e.target.value)} />
              {errors.password ? <p className={styles.error}>{errors.password[0]}</p> : null}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="confirmPassword">Confirm Password:</label>
              <input id="confirmPassword" type="password" className={styles.input} onChange={(e) => handleChange("confirmPassword", e.target.value)} />
              {errors.confirmPassword ? <p className={styles.error}>{errors.confirmPassword[0]}</p> : null}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="address">Address:</label>
              <input id="address" className={styles.input} onChange={(e) => handleChange("address", e.target.value)} />
              {errors.address ? <p className={styles.error}>{errors.address[0]}</p> : null}
            </div>

            <button className={styles.submit} type="submit">Sign up</button>
          </form>

          <div className={styles.row}>
            <span>Already have an account?</span>
            <Link className={styles.link} to="/login">Login</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
