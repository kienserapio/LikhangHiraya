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
    password: z.string().min(8, "Password must be at least 8 chars"),
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
      <div className={styles.card}>
        <h1 className={styles.title}>Create Account</h1>
        <form className={styles.form} onSubmit={handleSubmit}>
          <input className={styles.input} placeholder="Full Name" onChange={(e) => handleChange("fullName", e.target.value)} />
          {errors.fullName ? <p className={styles.error}>{errors.fullName[0]}</p> : null}
          <input className={styles.input} placeholder="Email" onChange={(e) => handleChange("email", e.target.value)} />
          {errors.email ? <p className={styles.error}>{errors.email[0]}</p> : null}
          <input className={styles.input} placeholder="Phone (09XXXXXXXXX)" onChange={(e) => handleChange("phone", e.target.value)} />
          {errors.phone ? <p className={styles.error}>{errors.phone[0]}</p> : null}
          <input className={styles.input} placeholder="Username" onChange={(e) => handleChange("username", e.target.value)} />
          {errors.username ? <p className={styles.error}>{errors.username[0]}</p> : null}
          <input type="password" className={styles.input} placeholder="Password" onChange={(e) => handleChange("password", e.target.value)} />
          {errors.password ? <p className={styles.error}>{errors.password[0]}</p> : null}
          <input type="password" className={styles.input} placeholder="Confirm Password" onChange={(e) => handleChange("confirmPassword", e.target.value)} />
          {errors.confirmPassword ? <p className={styles.error}>{errors.confirmPassword[0]}</p> : null}
          <input className={styles.input} placeholder="Address" onChange={(e) => handleChange("address", e.target.value)} />
          {errors.address ? <p className={styles.error}>{errors.address[0]}</p> : null}

          <button className={styles.submit} type="submit">Register</button>
        </form>

        <div className={styles.row}>
          <span>Already have an account?</span>
          <Link className={styles.link} to="/login">Login</Link>
        </div>
      </div>
    </div>
  );
}
