import { create } from "zustand";
import { authApi } from "../services/api";

const AUTH_BYPASS = import.meta.env.VITE_AUTH_BYPASS === "true";
const PROFILE_KEY = "lh_profile";
const AUTH_USER_KEY = "lh_auth_user";
const REMEMBER_ME_KEY = "lh_remember_me_username";

function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw
      ? JSON.parse(raw)
      : {
          fullName: "Guest User",
          username: "guest",
          email: "",
          phone: "",
          address: "Manila, Globe St. ABC 123",
          notificationsEnabled: true,
        };
  } catch {
    return {
      fullName: "Guest User",
      username: "guest",
      email: "",
      phone: "",
      address: "Manila, Globe St. ABC 123",
      notificationsEnabled: true,
    };
  }
}

function saveProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

function loadAuthUser() {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
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

export const useAuthStore = create((set, get) => ({
  user: loadAuthUser(),
  profile: loadProfile(),
  token: localStorage.getItem("token") || "",
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
      const data = await authApi.login(payload);
      const profile = {
        ...get().profile,
        username: data.username,
        fullName: data.fullName || get().profile.fullName || data.username,
        email: data.email || get().profile.email,
        phone: data.phone || get().profile.phone,
        address: data.address || get().profile.address,
      };
      saveProfile(profile);
      localStorage.setItem("token", data.token);
      saveAuthUser({ username: data.username, role: data.role });
      sessionStorage.setItem("mfaVerified", "false");
      get().setRememberMe(payload.usernameOrEmail, rememberMe);
      set({
        token: data.token,
        user: { username: data.username, role: data.role },
        profile,
        mfaVerified: false,
        isLoading: false,
      });
    } catch (error) {
      set({ error: error.message || "Unable to login", isLoading: false });
      throw error;
    }
  },

  async register(payload) {
    set({ isLoading: true, error: "" });
    try {
      const nextProfile = {
        fullName: payload.fullName,
        username: payload.username,
        email: payload.email,
        phone: payload.phone,
        address: payload.address,
        notificationsEnabled: true,
      };
      saveProfile(nextProfile);
      await authApi.register(payload);
      set({ isLoading: false, profile: nextProfile });
    } catch (error) {
      set({ error: error.message || "Unable to register", isLoading: false });
      throw error;
    }
  },

  async registerRider(payload) {
    set({ isLoading: true, error: "" });
    try {
      const nextProfile = {
        fullName: payload.fullName,
        username: payload.username,
        email: payload.email,
        phone: payload.phone,
        address: payload.address,
        notificationsEnabled: true,
      };
      saveProfile(nextProfile);
      await authApi.registerRider(payload);
      set({ isLoading: false, profile: nextProfile });
    } catch (error) {
      set({ error: error.message || "Unable to register rider account", isLoading: false });
      throw error;
    }
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
    localStorage.removeItem("token");
    localStorage.removeItem(AUTH_USER_KEY);
    sessionStorage.removeItem("mfaVerified");
    saveAuthUser(null);
    set({ token: "", user: null, mfaVerified: false });
  },
}));
