import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuthStore } from "../../store/authStore";
import styles from "./RiderSignupPage.module.css";

const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const schema = z
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
    vehicleType: z.enum(["MOTORCYCLE", "BICYCLE", "E_BIKE"]),
    plateNumber: z.string().optional(),
    driversLicenseNumber: z.string().min(4, "Driver license number is required"),
    emergencyContactName: z.string().min(2, "Emergency contact name is required"),
    emergencyContactPhone: z.string().regex(/^09\d{9}$/, "Use 09XXXXXXXXX"),
    gcashNumber: z.string().regex(/^09\d{9}$/, "Use 09XXXXXXXXX"),
    workingShift: z.enum(["MORNING", "AFTERNOON", "EVENING"]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords must match",
  });

export default function RiderSignupPage() {
  const navigate = useNavigate();
  const registerRider = useAuthStore((state) => state.registerRider);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    username: "",
    password: "",
    confirmPassword: "",
    address: "",
    vehicleType: "MOTORCYCLE",
    plateNumber: "",
    driversLicenseNumber: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    gcashNumber: "",
    workingShift: "MORNING",
  });

  function onChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    try {
      const otpContext = await registerRider({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        username: form.username,
        password: form.password,
        address: form.address,
        vehicleType: form.vehicleType,
        plateNumber: form.plateNumber,
        driversLicenseNumber: form.driversLicenseNumber,
        emergencyContactName: form.emergencyContactName,
        emergencyContactPhone: form.emergencyContactPhone,
        gcashNumber: form.gcashNumber,
        workingShift: form.workingShift,
      });
      navigate("/verify-otp", {
        state: otpContext || {
          email: form.email,
          otpType: "signup",
          identifier: form.username,
        },
      });
    } catch (error) {
      setErrors({ username: [error.message || "Unable to create rider account"] });
    }
  }

  return (
    <div className={styles.page}>
      <main className={styles.card}>
        <header className={styles.header}>
          <h1>Delivery Rider Sign Up</h1>
          <p>Complete your rider profile for logistics, compliance, payouts, and shift assignment.</p>
        </header>

        <form onSubmit={handleSubmit} className={styles.grid}>
          <div className={styles.field}>
            <label>Full Name</label>
            <input value={form.fullName} onChange={(event) => onChange("fullName", event.target.value)} />
            {errors.fullName ? <p className={styles.error}>{errors.fullName[0]}</p> : null}
          </div>

          <div className={styles.field}>
            <label>Email</label>
            <input value={form.email} onChange={(event) => onChange("email", event.target.value)} />
            {errors.email ? <p className={styles.error}>{errors.email[0]}</p> : null}
          </div>

          <div className={styles.field}>
            <label>Phone</label>
            <input value={form.phone} placeholder="09XXXXXXXXX" onChange={(event) => onChange("phone", event.target.value)} />
            {errors.phone ? <p className={styles.error}>{errors.phone[0]}</p> : null}
          </div>

          <div className={styles.field}>
            <label>Username</label>
            <input value={form.username} onChange={(event) => onChange("username", event.target.value)} />
            {errors.username ? <p className={styles.error}>{errors.username[0]}</p> : null}
          </div>

          <div className={styles.field}>
            <label>Password</label>
            <input type="password" value={form.password} onChange={(event) => onChange("password", event.target.value)} />
            {errors.password ? <p className={styles.error}>{errors.password[0]}</p> : null}
          </div>

          <div className={styles.field}>
            <label>Confirm Password</label>
            <input type="password" value={form.confirmPassword} onChange={(event) => onChange("confirmPassword", event.target.value)} />
            {errors.confirmPassword ? <p className={styles.error}>{errors.confirmPassword[0]}</p> : null}
          </div>

          <div className={`${styles.field} ${styles.span2}`}>
            <label>Address</label>
            <input value={form.address} onChange={(event) => onChange("address", event.target.value)} />
            {errors.address ? <p className={styles.error}>{errors.address[0]}</p> : null}
          </div>

          <div className={styles.field}>
            <label>Vehicle Type</label>
            <select value={form.vehicleType} onChange={(event) => onChange("vehicleType", event.target.value)}>
              <option value="MOTORCYCLE">Motorcycle</option>
              <option value="BICYCLE">Bicycle</option>
              <option value="E_BIKE">E-Bike</option>
            </select>
          </div>

          <div className={styles.field}>
            <label>Plate Number (if applicable)</label>
            <input value={form.plateNumber} onChange={(event) => onChange("plateNumber", event.target.value)} />
          </div>

          <div className={styles.field}>
            <label>Driver's License Number</label>
            <input
              value={form.driversLicenseNumber}
              onChange={(event) => onChange("driversLicenseNumber", event.target.value)}
            />
            {errors.driversLicenseNumber ? <p className={styles.error}>{errors.driversLicenseNumber[0]}</p> : null}
          </div>

          <div className={styles.field}>
            <label>Emergency Contact Name</label>
            <input
              value={form.emergencyContactName}
              onChange={(event) => onChange("emergencyContactName", event.target.value)}
            />
            {errors.emergencyContactName ? <p className={styles.error}>{errors.emergencyContactName[0]}</p> : null}
          </div>

          <div className={styles.field}>
            <label>Emergency Contact Phone</label>
            <input
              value={form.emergencyContactPhone}
              placeholder="09XXXXXXXXX"
              onChange={(event) => onChange("emergencyContactPhone", event.target.value)}
            />
            {errors.emergencyContactPhone ? <p className={styles.error}>{errors.emergencyContactPhone[0]}</p> : null}
          </div>

          <div className={styles.field}>
            <label>G-Cash Registered Number</label>
            <input value={form.gcashNumber} placeholder="09XXXXXXXXX" onChange={(event) => onChange("gcashNumber", event.target.value)} />
            {errors.gcashNumber ? <p className={styles.error}>{errors.gcashNumber[0]}</p> : null}
          </div>

          <div className={styles.field}>
            <label>Working Shift</label>
            <select value={form.workingShift} onChange={(event) => onChange("workingShift", event.target.value)}>
              <option value="MORNING">Morning</option>
              <option value="AFTERNOON">Afternoon</option>
              <option value="EVENING">Evening</option>
            </select>
          </div>

          <div className={`${styles.cta} ${styles.span2}`}>
            <button type="submit" className={styles.submit}>Create Rider Account</button>
            <button type="button" className={styles.secondary} onClick={() => navigate("/register")}>Sign up as Customer</button>
          </div>
        </form>
      </main>
    </div>
  );
}
