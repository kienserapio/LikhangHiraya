import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function readUsernameFromLocalStorage() {
  try {
    const authUser = JSON.parse(localStorage.getItem("lh_auth_user") || "null");
    return String(authUser?.username || "").trim();
  } catch {
    return "";
  }
}

const fetchWithCustomerHeaders = (input, init = {}) => {
  const headers = new Headers(init.headers || {});
  const username = readUsernameFromLocalStorage();

  if (username && !headers.has("X-Username")) {
    headers.set("X-Username", username);
  }

  return fetch(input, { ...init, headers });
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: fetchWithCustomerHeaders,
  },
});
