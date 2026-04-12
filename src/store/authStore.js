import { create } from "zustand";
import { authApi, usersApi } from "../services/api";
import { supabase } from "../services/supabaseClient";

const AUTH_BYPASS = import.meta.env.VITE_AUTH_BYPASS === "true";
const PROFILE_KEY = "lh_profile";
const AUTH_USER_KEY = "lh_auth_user";
const REMEMBER_ME_KEY = "lh_remember_me_username";
const OTP_CONTEXT_KEY = "lh_pending_otp_context";

function normalizeRole(value) {
  const normalized = String(value || "CUSTOMER").trim().toUpperCase();
  if (normalized === "ADMIN" || normalized === "RIDER") {
    return normalized;
  }
  return "CUSTOMER";
}

function defaultProfile() {
  return {
    fullName: "Guest User",
    username: "guest",
    email: "",
    phone: "",
    address: "Manila, Globe St. ABC 123",
    notificationsEnabled: true,
  };
}

function safeJsonParse(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function loadProfile() {
  const raw = localStorage.getItem(PROFILE_KEY);
  return raw ? safeJsonParse(raw, defaultProfile()) : defaultProfile();
}

function saveProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

function loadAuthUser() {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  return raw ? safeJsonParse(raw, null) : null;
}

function saveAuthUser(user) {
  if (!user) {
    localStorage.removeItem(AUTH_USER_KEY);
    return;
  }
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

function loadRememberMeUsername() {
  const persisted = localStorage.getItem(REMEMBER_ME_KEY);
  if (persisted) {
    return persisted;
  }

  const legacySessionValue = sessionStorage.getItem("rememberMeUsername") || "";
  if (legacySessionValue) {
    localStorage.setItem(REMEMBER_ME_KEY, legacySessionValue);
    sessionStorage.removeItem("rememberMeUsername");
  }
  return legacySessionValue;
}

function loadOtpContext() {
  const raw = sessionStorage.getItem(OTP_CONTEXT_KEY);
  return raw ? safeJsonParse(raw, null) : null;
}

function saveOtpContext(context) {
  if (!context) {
    sessionStorage.removeItem(OTP_CONTEXT_KEY);
    return;
  }
  sessionStorage.setItem(OTP_CONTEXT_KEY, JSON.stringify(context));
}

async function loadProfileFromSessionUser(sessionUser) {
  const userId = String(sessionUser?.id || "").trim();
  const userEmail = String(sessionUser?.email || "").trim().toLowerCase();

  let userRow = null;

  if (userId) {
    const userResById = await supabase
      .from("users")
      .select("id, username, email, full_name, phone, address, role")
      .eq("id", userId)
      .maybeSingle();

    if (!userResById.error && userResById.data) {
      userRow = userResById.data;
    }
  }

  if (!userRow && userEmail) {
    const userResByEmail = await supabase
      .from("users")
      .select("username, full_name, email, phone, address, role")
      .ilike("email", userEmail)
      .limit(1)
      .maybeSingle();

    if (!userResByEmail.error && userResByEmail.data) {
      userRow = userResByEmail.data;
    }
  }

  let profileRow = null;
  if (!userRow && userId) {
    const profileRes = await supabase
      .from("profiles")
      .select("id, username, email, full_name, phone, address, role")
      .eq("id", userId)
      .maybeSingle();

    if (!profileRes.error && profileRes.data) {
      profileRow = profileRes.data;
    }
  }

  const metadata = sessionUser?.user_metadata || {};
  const fallbackUsername = String(
    userRow?.username ||
      profileRow?.username ||
      metadata?.username ||
      (userEmail ? userEmail.split("@")[0] : "user")
  ).trim();

  const normalizedRole = normalizeRole(userRow?.role || profileRow?.role || metadata?.role);

  return {
    username: fallbackUsername,
    role: normalizedRole,
    fullName: String(userRow?.full_name || profileRow?.full_name || metadata?.full_name || fallbackUsername).trim(),
    email: String(userRow?.email || profileRow?.email || userEmail).trim(),
    phone: String(userRow?.phone || profileRow?.phone || metadata?.phone || "").trim(),
    address: String(userRow?.address || profileRow?.address || metadata?.address || "").trim(),
  };
}

async function completeAdminLogin({ directAuth, identifier, rememberMe, set, get }) {
  const normalizedUsername = String(directAuth?.username || identifier || "admin").trim() || "admin";
  const accessToken = String(directAuth?.token || `admin-db-token-${Date.now()}`).trim();

  await supabase.auth.signOut({ scope: "local" });

  const profile = {
    ...defaultProfile(),
    ...get().profile,
    fullName: String(directAuth?.fullName || get().profile.fullName || "Administrator").trim(),
    username: normalizedUsername,
    email: String(directAuth?.email || get().profile.email || "").trim(),
    phone: String(directAuth?.phone || get().profile.phone || "").trim(),
    address: String(directAuth?.address || get().profile.address || "").trim(),
    notificationsEnabled: get().profile.notificationsEnabled ?? true,
  };

  const user = {
    username: normalizedUsername,
    role: "ADMIN",
  };

  saveProfile(profile);
  saveAuthUser(user);
  localStorage.setItem("token", accessToken);
  sessionStorage.setItem("mfaVerified", "true");
  saveOtpContext(null);
  get().setRememberMe(identifier, rememberMe);

  set({
    token: accessToken,
    user,
    profile,
    otpContext: null,
    mfaVerified: true,
    isLoading: false,
    error: "",
  });

  return {
    bypassOtp: true,
    nextRoute: "/admin/dashboard",
  };
}

export const useAuthStore = create((set, get) => ({
  user: loadAuthUser(),
  profile: loadProfile(),
  token: localStorage.getItem("token") || "",
  otpContext: loadOtpContext(),
  rememberMeUsername: loadRememberMeUsername(),
  mfaVerified: sessionStorage.getItem("mfaVerified") === "true",
  isLoading: false,
  error: "",

  getPostMfaRoute() {
    const role = String(get().user?.role || "").toUpperCase();
    if (role === "RIDER") {
      return "/rider/dashboard";
    }
    if (role === "ADMIN") {
      return "/admin/dashboard";
    }
    return "/home";
  },

  async initializeAuth() {
    if (AUTH_BYPASS) {
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        return;
      }

      await get().hydrateFromSession(session);
    } catch {
      // Keep existing local auth state if session bootstrap fails.
    }
  },

  async hydrateFromSession(session) {
    if (!session?.user) {
      throw new Error("Unable to establish authenticated session.");
    }

    const resolved = await loadProfileFromSessionUser(session.user);
    const user = {
      id: String(session.user.id || ""),
      username: resolved.username,
      role: resolved.role,
    };

    const profile = {
      ...defaultProfile(),
      ...get().profile,
      fullName: resolved.fullName || get().profile.fullName,
      username: resolved.username || get().profile.username,
      email: resolved.email || get().profile.email,
      phone: resolved.phone || get().profile.phone,
      address: resolved.address || get().profile.address,
      notificationsEnabled: get().profile.notificationsEnabled ?? true,
    };

    const accessToken = String(session.access_token || "").trim();

    saveProfile(profile);
    saveAuthUser(user);
    localStorage.setItem("token", accessToken);
    sessionStorage.setItem("mfaVerified", "true");
    saveOtpContext(null);

    set({
      token: accessToken,
      user,
      profile,
      otpContext: null,
      mfaVerified: true,
      isLoading: false,
      error: "",
    });
  },

  setOtpContext(context) {
    saveOtpContext(context);
    sessionStorage.setItem("mfaVerified", "false");
    set({ otpContext: context, mfaVerified: false });
  },

  clearOtpContext() {
    saveOtpContext(null);
    set({ otpContext: null });
  },

  setRememberMe(username, enabled) {
    if (enabled) {
      localStorage.setItem(REMEMBER_ME_KEY, username);
      set({ rememberMeUsername: username });
      return;
    }
    localStorage.removeItem(REMEMBER_ME_KEY);
    sessionStorage.removeItem("rememberMeUsername");
    set({ rememberMeUsername: "" });
  },

  async login(payload, rememberMe) {
    set({ isLoading: true, error: "" });

    if (AUTH_BYPASS) {
      const username = payload.usernameOrEmail?.trim() || "guest";
      const selectedRole = username.toLowerCase().includes("admin")
        ? "ADMIN"
        : username.toLowerCase().includes("rider")
          ? "RIDER"
          : "CUSTOMER";
      const profile = {
        ...get().profile,
        username,
        fullName: get().profile.fullName || username,
      };
      saveProfile(profile);
      localStorage.setItem("token", "dev-bypass-token");
      sessionStorage.setItem("mfaVerified", "false");
      get().setRememberMe(username, rememberMe);
      set({
        token: "dev-bypass-token",
        user: { username, role: selectedRole },
        profile,
        mfaVerified: false,
        isLoading: false,
      });
      saveAuthUser({ username, role: selectedRole });
      return;
    }

    try {
      const identifier = String(payload?.usernameOrEmail || "").trim();
      const password = String(payload?.password || "");
      const normalizedIdentifier = identifier.toLowerCase();

      if (!identifier) {
        throw new Error("Username or email is required.");
      }
      if (!password) {
        throw new Error("Password is required.");
      }

      let directAuth = null;
      try {
        directAuth = await authApi.login({ usernameOrEmail: identifier, password });
      } catch (directAuthError) {
        if (normalizedIdentifier === "admin") {
          throw new Error(directAuthError.message || "Invalid admin credentials.");
        }
      }

      if (normalizeRole(directAuth?.role) === "ADMIN") {
        return completeAdminLogin({ directAuth, identifier, rememberMe, set, get });
      }

      const resolved = await usersApi.resolveIdentifier(identifier);
      const resolvedEmail = String(resolved?.email || "").trim().toLowerCase();

      if (!resolvedEmail) {
        throw new Error("Unable to resolve account email.");
      }

      const passwordCheck = await supabase.auth.signInWithPassword({
        email: resolvedEmail,
        password,
      });

      if (passwordCheck.error || !passwordCheck.data?.session?.user) {
        throw new Error("Invalid username/email or password.");
      }

      await supabase.auth.signOut({ scope: "local" });

      const { error } = await supabase.auth.signInWithOtp({
        email: resolvedEmail,
        options: {
          shouldCreateUser: false,
        },
      });

      if (error) {
        throw new Error(error.message || "Unable to send OTP code.");
      }

      const otpContext = {
        email: resolvedEmail,
        otpType: "magiclink",
        identifier,
      };

      get().setRememberMe(identifier, rememberMe);
      get().setOtpContext(otpContext);

      localStorage.removeItem("token");
      saveAuthUser(null);

      set({
        token: "",
        user: null,
        mfaVerified: false,
        isLoading: false,
        error: "",
      });

      return otpContext;
    } catch (error) {
      set({ error: error.message || "Unable to login", isLoading: false });
      throw error;
    }
  },

  async register(payload) {
    set({ isLoading: true, error: "" });
    try {
      const email = String(payload?.email || "").trim().toLowerCase();
      const username = String(payload?.username || "").trim();
      const fullName = String(payload?.fullName || "").trim();

      if (!email || !username || !fullName || !payload?.password) {
        throw new Error("Please complete all required fields.");
      }

      const { error } = await supabase.auth.signUp({
        email,
        password: String(payload.password),
        options: {
          data: {
            username,
            full_name: fullName,
            role: "CUSTOMER",
            phone: String(payload.phone || "").trim(),
            address: String(payload.address || "").trim(),
          },
        },
      });

      if (error) {
        throw new Error(error.message || "Unable to register account.");
      }

      const nextProfile = {
        ...get().profile,
        fullName,
        username,
        email,
        phone: String(payload.phone || "").trim(),
        address: String(payload.address || "").trim(),
        notificationsEnabled: true,
      };

      saveProfile(nextProfile);

      const otpContext = {
        email,
        otpType: "signup",
        identifier: username,
      };

      get().setOtpContext(otpContext);

      localStorage.removeItem("token");
      saveAuthUser(null);

      set({
        token: "",
        user: null,
        profile: nextProfile,
        isLoading: false,
        error: "",
      });

      return otpContext;
    } catch (error) {
      set({ error: error.message || "Unable to register", isLoading: false });
      throw error;
    }
  },

  async registerRider(payload) {
    set({ isLoading: true, error: "" });
    try {
      const email = String(payload?.email || "").trim().toLowerCase();
      const username = String(payload?.username || "").trim();
      const fullName = String(payload?.fullName || "").trim();

      if (!email || !username || !fullName || !payload?.password) {
        throw new Error("Please complete all required rider fields.");
      }

      const { error } = await supabase.auth.signUp({
        email,
        password: String(payload.password),
        options: {
          data: {
            username,
            full_name: fullName,
            role: "RIDER",
            phone: String(payload.phone || "").trim(),
            address: String(payload.address || "").trim(),
            vehicle_type: String(payload.vehicleType || "").trim(),
            plate_number: String(payload.plateNumber || "").trim(),
            drivers_license_number: String(payload.driversLicenseNumber || "").trim(),
            emergency_contact_name: String(payload.emergencyContactName || "").trim(),
            emergency_contact_phone: String(payload.emergencyContactPhone || "").trim(),
            gcash_number: String(payload.gcashNumber || "").trim(),
            working_shift: String(payload.workingShift || "MORNING").trim().toUpperCase(),
            is_online: false,
          },
        },
      });

      if (error) {
        throw new Error(error.message || "Unable to register rider account.");
      }

      const nextProfile = {
        ...get().profile,
        fullName,
        username,
        email,
        phone: String(payload.phone || "").trim(),
        address: String(payload.address || "").trim(),
        notificationsEnabled: true,
      };

      saveProfile(nextProfile);

      const otpContext = {
        email,
        otpType: "signup",
        identifier: username,
      };

      get().setOtpContext(otpContext);

      localStorage.removeItem("token");
      saveAuthUser(null);

      set({
        token: "",
        user: null,
        profile: nextProfile,
        isLoading: false,
        error: "",
      });

      return otpContext;
    } catch (error) {
      set({ error: error.message || "Unable to register rider account", isLoading: false });
      throw error;
    }
  },

  async verifyOtpCode({ email, token, otpType }) {
    set({ isLoading: true, error: "" });

    try {
      const normalizedEmail = String(email || "").trim().toLowerCase();
      const normalizedToken = String(token || "").trim();
      const normalizedType = otpType === "signup" ? "signup" : "magiclink";

      if (!normalizedEmail || !normalizedToken || normalizedToken.length !== 6) {
        throw new Error("Please enter the 6-digit verification code.");
      }

      const verifyRes = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: normalizedToken,
        type: normalizedType,
      });

      if (verifyRes.error) {
        throw new Error(verifyRes.error.message || "OTP verification failed.");
      }

      const activeSession = verifyRes.data?.session || (await supabase.auth.getSession()).data?.session;
      if (!activeSession?.user) {
        throw new Error("Session was not created after OTP verification.");
      }

      await get().hydrateFromSession(activeSession);
      return get().getPostMfaRoute();
    } catch (error) {
      set({ error: error.message || "Unable to verify OTP", isLoading: false });
      throw error;
    }
  },

  async resendOtp({ email, otpType }) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error("Email is required to resend the OTP code.");
    }

    if (otpType === "signup") {
      const resendRes = await supabase.auth.resend({
        type: "signup",
        email: normalizedEmail,
      });

      if (resendRes.error) {
        throw new Error(resendRes.error.message || "Unable to resend OTP code.");
      }
    } else {
      const signInRes = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: false,
        },
      });

      if (signInRes.error) {
        throw new Error(signInRes.error.message || "Unable to resend OTP code.");
      }
    }

    const currentContext = get().otpContext;
    get().setOtpContext({
      email: normalizedEmail,
      otpType: otpType === "signup" ? "signup" : "magiclink",
      identifier: currentContext?.identifier || normalizedEmail,
    });
  },

  updateProfile: (partial) => {
    const profile = { ...get().profile, ...partial };
    saveProfile(profile);
    set({
      profile,
      user: get().user
        ? {
            ...get().user,
            username: profile.username || get().user.username,
          }
        : get().user,
    });
  },

  verifyMfa() {
    sessionStorage.setItem("mfaVerified", "true");
    set({ mfaVerified: true });
  },

  logout() {
    void supabase.auth.signOut();
    localStorage.removeItem("token");
    localStorage.removeItem(AUTH_USER_KEY);
    sessionStorage.removeItem("mfaVerified");
    saveOtpContext(null);
    saveAuthUser(null);
    set({ token: "", user: null, otpContext: null, mfaVerified: false });
  },
}));
