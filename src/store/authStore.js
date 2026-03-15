import { create } from "zustand";
import { authApi } from "../services/api";

const AUTH_BYPASS = import.meta.env.VITE_AUTH_BYPASS === "true";
const PROFILE_KEY = "lh_profile";

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
        };
  } catch {
    return {
      fullName: "Guest User",
      username: "guest",
      email: "",
      phone: "",
      address: "Manila, Globe St. ABC 123",
    };
  }
}

function saveProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: loadProfile(),
  token: localStorage.getItem("token") || "",
  rememberMeUsername: sessionStorage.getItem("rememberMeUsername") || "",
  mfaVerified: sessionStorage.getItem("mfaVerified") === "true",
  isLoading: false,
  error: "",

  setRememberMe(username, enabled) {
    if (enabled) {
      sessionStorage.setItem("rememberMeUsername", username);
      set({ rememberMeUsername: username });
      return;
    }
    sessionStorage.removeItem("rememberMeUsername");
    set({ rememberMeUsername: "" });
  },

  async login(payload, rememberMe) {
    set({ isLoading: true, error: "" });

    if (AUTH_BYPASS) {
      const username = payload.usernameOrEmail?.trim() || "guest";
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
        user: { username, role: "CUSTOMER" },
        profile,
        mfaVerified: false,
        isLoading: false,
      });
      return;
    }

    try {
      const data = await authApi.login(payload);
      const profile = {
        ...get().profile,
        username: data.username,
        fullName: get().profile.fullName || data.username,
      };
      saveProfile(profile);
      localStorage.setItem("token", data.token);
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
      };
      saveProfile(nextProfile);
      await authApi.register(payload);
      set({ isLoading: false, profile: nextProfile });
    } catch (error) {
      set({ error: error.message || "Unable to register", isLoading: false });
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
    sessionStorage.removeItem("mfaVerified");
    set({ token: "", user: null, mfaVerified: false });
  },
}));
