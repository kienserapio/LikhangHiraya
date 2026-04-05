import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuthStore } from "../store/authStore";
import styles from "./Register.module.css";

const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const registerSchema = z
  .object({
    fullName: z.string().min(2, "Full name is required"),
    email: z.string().email("Invalid email"),
    phone: z.string().regex(/^09\d{9}$/, "Use 09XXXXXXXXX"),
    username: z.string().min(4, "Username must be at least 4 chars"),
    password: z
      .string()
      .regex(
        strongPasswordPattern,
        "Password must be at least 8 characters and include uppercase, lowercase, number, and special character"
      ),
    confirmPassword: z.string().min(8),
    address: z.string().min(8, "Address is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords must match",
  });

export default function Register() {
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
    <div className={styles.page}>
      <main className={styles.container}>
        <header className={styles.header}>
          <h1>Welcome to Likhang Hiraya</h1>
          <p>Create your account to order your coffee.</p>
        </header>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span>Full Name <span className={styles["required-star"]}>*</span></span>
            <input value={form.fullName} onChange={(event) => handleChange("fullName", event.target.value)} />
            {errors.fullName ? <small>{errors.fullName[0]}</small> : null}
          </label>

          <label className={styles.field}>
            <span>Email <span className={styles["required-star"]}>*</span></span>
            <input value={form.email} onChange={(event) => handleChange("email", event.target.value)} />
            {errors.email ? <small>{errors.email[0]}</small> : null}
          </label>

          <label className={styles.field}>
            <span>Phone <span className={styles["required-star"]}>*</span></span>
            <input value={form.phone} placeholder="09XXXXXXXXX" onChange={(event) => handleChange("phone", event.target.value)} />
            {errors.phone ? <small>{errors.phone[0]}</small> : null}
          </label>

          <label className={styles.field}>
            <span>Username <span className={styles["required-star"]}>*</span></span>
            <input value={form.username} onChange={(event) => handleChange("username", event.target.value)} />
            {errors.username ? <small>{errors.username[0]}</small> : null}
          </label>

          <label className={styles.field}>
            <span>Password <span className={styles["required-star"]}>*</span></span>
            <input type="password" value={form.password} onChange={(event) => handleChange("password", event.target.value)} />
            <p className={styles.help}>8+ characters with uppercase, lowercase, number, and special character.</p>
            {errors.password ? <small>{errors.password[0]}</small> : null}
          </label>

          <label className={styles.field}>
            <span>Confirm Password <span className={styles["required-star"]}>*</span></span>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(event) => handleChange("confirmPassword", event.target.value)}
            />
            {errors.confirmPassword ? <small>{errors.confirmPassword[0]}</small> : null}
          </label>

          <label className={styles.field}>
            <span>Delivery Address <span className={styles["required-star"]}>*</span></span>
            <input value={form.address} onChange={(event) => handleChange("address", event.target.value)} />
            {errors.address ? <small>{errors.address[0]}</small> : null}
          </label>

          <button type="submit" className={styles.submit}>Sign up</button>
        </form>

        <p className={styles.loginLink}>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </main>
    </div>
  );
}
