import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import RiderBottomNav from "../../components/rider/RiderBottomNav";
import RiderPageLoader from "../../components/rider/RiderPageLoader";
import { fetchRiderProfile, updateRiderProfile } from "../../services/riderApi";
import { useAuthStore } from "../../store/authStore";
import styles from "./RiderProfilePage.module.css";

function memberSinceLabel(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    year: "numeric",
  }).format(date);
}

function toRiderId(value, fallbackUsername) {
  const text = String(value || fallbackUsername || "").replaceAll("-", "").toUpperCase();
  if (!text) {
    return "#RH-000";
  }
  return `#RH-${text.slice(0, 6)}`;
}

export default function RiderProfilePage() {
  const navigate = useNavigate();
  const authUser = useAuthStore((state) => state.user);
  const localProfile = useAuthStore((state) => state.profile);
  const updateLocalProfile = useAuthStore((state) => state.updateProfile);
  const logout = useAuthStore((state) => state.logout);

  const [riderProfile, setRiderProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savingField, setSavingField] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadRiderProfile = useCallback(async () => {
    const data = await fetchRiderProfile();
    setRiderProfile(data || null);
  }, []);

  useEffect(() => {
    let mounted = true;

    loadRiderProfile()
      .catch((loadError) => {
        if (mounted) {
          setError(loadError.message || "Unable to load rider profile from database.");
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [loadRiderProfile]);

  const profile = useMemo(
    () => ({
      id: riderProfile?.id || "",
      fullName: riderProfile?.fullName || localProfile.fullName || authUser?.username || "Rider",
      username: riderProfile?.username || authUser?.username || localProfile.username || "",
      phone: riderProfile?.phone || localProfile.phone || "",
      vehicleType: riderProfile?.vehicleType || localProfile.vehicleDetails || "",
      createdAt: riderProfile?.createdAt || "",
    }),
    [authUser?.username, localProfile.fullName, localProfile.phone, localProfile.username, localProfile.vehicleDetails, riderProfile]
  );

  async function editField(fieldKey) {
    const labels = {
      fullName: "Full Name",
      phone: "Phone Number",
      vehicleType: "Vehicle Details",
    };

    const currentValue = String(profile[fieldKey] || "");
    const nextValue = window.prompt(`Update ${labels[fieldKey]}`, currentValue);
    if (nextValue === null) {
      return;
    }

    const trimmedValue = String(nextValue).trim();
    if (!trimmedValue) {
      setError(`${labels[fieldKey]} cannot be empty.`);
      setNotice("");
      return;
    }

    setSavingField(fieldKey);
    setError("");
    setNotice("");

    const nextChanges = { [fieldKey]: trimmedValue };

    try {
      const updated = await updateRiderProfile(nextChanges);
      if (updated) {
        setRiderProfile(updated);
      }

      const localPatch = {};
      if (fieldKey === "fullName") {
        localPatch.fullName = trimmedValue;
      }
      if (fieldKey === "phone") {
        localPatch.phone = trimmedValue;
      }
      if (fieldKey === "vehicleType") {
        localPatch.vehicleDetails = trimmedValue;
      }
      updateLocalProfile(localPatch);

      setNotice(`${labels[fieldKey]} updated successfully.`);
    } catch (updateError) {
      const fallbackPatch = {};
      if (fieldKey === "fullName") {
        fallbackPatch.fullName = trimmedValue;
      }
      if (fieldKey === "phone") {
        fallbackPatch.phone = trimmedValue;
      }
      if (fieldKey === "vehicleType") {
        fallbackPatch.vehicleDetails = trimmedValue;
      }
      updateLocalProfile(fallbackPatch);

      setError(updateError.message || "Database update failed. Saved locally instead.");
      setNotice(`${labels[fieldKey]} saved locally.`);
    } finally {
      setSavingField("");
    }
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <header className={styles.topBar}>
          <button type="button" className={styles.backButton} onClick={() => navigate("/rider/dashboard")} aria-label="Back to dashboard">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M14.8 6.5 9.3 12l5.5 5.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className={styles.topTitle}>Profile</h1>
        </header>
        <RiderPageLoader topOffset={64} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <button type="button" className={styles.backButton} onClick={() => navigate("/rider/dashboard")} aria-label="Back to dashboard">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M14.8 6.5 9.3 12l5.5 5.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className={styles.topTitle}>Profile</h1>
      </header>

      <main className={styles.main}>
        <section className={styles.summarySection}>
          <div className={styles.avatarBlank} aria-hidden="true" />
          <div className={styles.summaryText}>
            <h2>{profile.fullName}</h2>
            <p>Rider ID: {toRiderId(profile.id, profile.username)}</p>
          </div>
        </section>

        {error ? <p className={styles.errorText}>{error}</p> : null}
        {notice ? <p className={styles.noticeText}>{notice}</p> : null}

        <section className={styles.statsGrid}>
          <article className={styles.statCard}>
            <p>Member Since</p>
            <strong>{memberSinceLabel(profile.createdAt)}</strong>
          </article>
        </section>

        <section className={styles.detailsSection}>
          <h3>Account Information</h3>

          <button type="button" className={styles.detailRow} onClick={() => editField("fullName")}>
            <div>
              <p className={styles.detailLabel}>Full Name</p>
              <p className={styles.detailValue}>{profile.fullName}</p>
            </div>
            <span className={styles.detailAction}>{savingField === "fullName" ? "Saving..." : "Edit"}</span>
          </button>

          <button type="button" className={styles.detailRow} onClick={() => editField("phone")}>
            <div>
              <p className={styles.detailLabel}>Phone Number</p>
              <p className={styles.detailValue}>{profile.phone || "Not set"}</p>
            </div>
            <span className={styles.detailAction}>{savingField === "phone" ? "Saving..." : "Edit"}</span>
          </button>

          <button type="button" className={styles.detailRow} onClick={() => editField("vehicleType")}>
            <div>
              <p className={styles.detailLabel}>Vehicle Details</p>
              <p className={styles.detailValue}>{profile.vehicleType || "Not set"}</p>
            </div>
            <span className={styles.detailAction}>{savingField === "vehicleType" ? "Saving..." : "Edit"}</span>
          </button>

          <button type="button" className={styles.detailRow} onClick={() => navigate("/rider/support")}>
            <div>
              <p className={styles.detailLabel}>Support</p>
              <p className={styles.detailValue}>Get rider help and contact dispatch</p>
            </div>
            <span className={styles.detailAction}>Open</span>
          </button>
        </section>

        <section>
          <button type="button" className={styles.logoutButton} onClick={handleLogout}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9 6.3H6.7A1.7 1.7 0 0 0 5 8v8a1.7 1.7 0 0 0 1.7 1.7H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="m12 15.7 3.6-3.7L12 8.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M15.6 12H8.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Logout
          </button>
        </section>
      </main>

      <RiderBottomNav />
    </div>
  );
}
