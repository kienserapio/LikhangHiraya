import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import UniversalBottomNav from "../components/UniversalBottomNav";
import styles from "./SettingsPage.module.css";

const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

function passwordChecklist(password) {
  return {
    minLength: password.length >= 8,
    special: /[^A-Za-z\d]/.test(password),
    upperLower: /[A-Z]/.test(password) && /[a-z]/.test(password),
    number: /\d/.test(password),
  };
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const profile = useAuthStore((state) => state.profile);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const logout = useAuthStore((state) => state.logout);

  const savedAddresses = profile.savedAddresses || {
    home: profile.address || "",
    work: "",
    partnerHouse: "",
  };

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [addressHome, setAddressHome] = useState(savedAddresses.home || "");
  const [addressWork, setAddressWork] = useState(savedAddresses.work || "");
  const [addressPartner, setAddressPartner] = useState(savedAddresses.partnerHouse || "");
  const [alwaysUseCod, setAlwaysUseCod] = useState(profile.alwaysUseCod ?? true);
  const [orderStatusUpdates, setOrderStatusUpdates] = useState(profile.orderStatusUpdates ?? true);
  const [promotionalAlerts, setPromotionalAlerts] = useState(profile.promotionalAlerts ?? false);

  const checklist = passwordChecklist(newPassword);

  function handleChangePassword(event) {
    event.preventDefault();
    if (!currentPassword.trim()) {
      setPasswordMessage("Current password is required.");
      return;
    }
    if (!strongPasswordPattern.test(newPassword)) {
      setPasswordMessage("New password does not meet the required rules.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordMessage("Confirm new password must match.");
      return;
    }

    setPasswordMessage("Password updated locally. Backend password endpoint can be linked next.");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
  }

  function handleSavePreferences(event) {
    event.preventDefault();

    updateProfile({
      address: addressHome.trim() || profile.address,
      savedAddresses: {
        home: addressHome.trim(),
        work: addressWork.trim(),
        partnerHouse: addressPartner.trim(),
      },
      alwaysUseCod,
      orderStatusUpdates,
      notificationsEnabled: orderStatusUpdates,
      promotionalAlerts,
    });
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className={styles.screen}>
      <section className={styles.page}>
        <h1>Settings</h1>

        <section className={styles.sectionCard}>
          <h2>2. Security & Login</h2>
          <form onSubmit={handleChangePassword} className={styles.form}>
            <label className={styles.field}>
              <span>Current Password</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Enter current password"
              />
            </label>

            <label className={styles.field}>
              <span>New Password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Enter new password"
              />
            </label>

            <ul className={styles.checklist}>
              <li className={checklist.minLength ? styles.valid : styles.invalid}>8 characters minimum</li>
              <li className={checklist.special ? styles.valid : styles.invalid}>At least 1 special character</li>
              <li className={checklist.upperLower ? styles.valid : styles.invalid}>At least 1 uppercase and 1 lowercase</li>
              <li className={checklist.number ? styles.valid : styles.invalid}>At least 1 number</li>
            </ul>

            <label className={styles.field}>
              <span>Confirm New Password</span>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(event) => setConfirmNewPassword(event.target.value)}
                placeholder="Confirm new password"
              />
            </label>

            {passwordMessage ? <p className={styles.infoText}>{passwordMessage}</p> : null}
            <button type="submit" className={styles.saveBtn}>Update Password</button>
          </form>
        </section>

        <section className={styles.sectionCard}>
          <h2>3. Order & Payment Preferences</h2>
          <form onSubmit={handleSavePreferences} className={styles.form}>
            <label className={styles.field}>
              <span>Saved Address: Home</span>
              <input value={addressHome} onChange={(event) => setAddressHome(event.target.value)} placeholder="Home address" />
            </label>

            <label className={styles.field}>
              <span>Saved Address: Work</span>
              <input value={addressWork} onChange={(event) => setAddressWork(event.target.value)} placeholder="Work address" />
            </label>

            <label className={styles.field}>
              <span>Saved Address: Partner's House</span>
              <input value={addressPartner} onChange={(event) => setAddressPartner(event.target.value)} placeholder="Partner's house" />
            </label>

            <label className={styles.toggleRow}>
              <div>
                <strong>Default Payment Method</strong>
                <p>Always use COD (Cash on Delivery)</p>
              </div>
              <input type="checkbox" checked={alwaysUseCod} onChange={(event) => setAlwaysUseCod(event.target.checked)} />
            </label>

            <button type="button" className={styles.secondaryBtn} onClick={() => navigate("/tracking")}>
              Open Order History (Active / Past)
            </button>

            <button type="submit" className={styles.saveBtn}>Save Preferences</button>
          </form>
        </section>

        <section className={styles.sectionCard}>
          <h2>4. Notifications</h2>

          <label className={styles.field}>
            <span>Contact Number</span>
            <input value={profile.phone || ""} onChange={(event) => updateProfile({ phone: event.target.value })} placeholder="09XXXXXXXXX" />
          </label>

          <label className={styles.toggleRow}>
            <div>
              <strong>Push Notifications</strong>
              <p>Order status updates (preparing, rider nearby, delivered)</p>
            </div>
            <input
              type="checkbox"
              checked={orderStatusUpdates}
              onChange={(event) => {
                const checked = event.target.checked;
                setOrderStatusUpdates(checked);
                updateProfile({ orderStatusUpdates: checked, notificationsEnabled: checked });
              }}
            />
          </label>

          <label className={styles.toggleRow}>
            <div>
              <strong>Promotional Alerts</strong>
              <p>New coffee blends and discounts</p>
            </div>
            <input
              type="checkbox"
              checked={promotionalAlerts}
              onChange={(event) => {
                const checked = event.target.checked;
                setPromotionalAlerts(checked);
                updateProfile({ promotionalAlerts: checked });
              }}
            />
          </label>
        </section>

        <section className={styles.sectionCard}>
          <h2>5. Support & About</h2>
          <div className={styles.supportBlock}>
            <h3>Help Center / FAQ</h3>
            <p>
              Choose your coffee, confirm checkout, and track status updates until your rider arrives.
              You can open order history anytime from the shortcut above.
            </p>
          </div>

          <div className={styles.supportBlock}>
            <h3>Terms & Conditions</h3>
            <p>
              This school project demo stores user preferences locally and uses available backend and Supabase services
              for order workflow simulation.
            </p>
          </div>

          <button type="button" className={styles.logoutBtn} onClick={handleLogout}>Logout</button>
        </section>
      </section>

      <UniversalBottomNav active="profile" />
    </div>
  );
}
