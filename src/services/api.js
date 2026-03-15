const API_URL = import.meta.env.VITE_API_URL;

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const isAuthEndpoint = path.startsWith("/api/auth/");
  if (token && !isAuthEndpoint) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error("Cannot reach backend API. Make sure Spring Boot is running on " + API_URL);
  }

  if (!response.ok) {
    let message = "Request failed";
    try {
      const payload = await response.json();
      message = payload.message || message;
    } catch {
      const text = await response.text();
      if (text) {
        message = text;
      }
    }
    throw new Error(message);
  }

  return response.json();
}

export const authApi = {
  login: (payload) => apiRequest("/api/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  register: (payload) => apiRequest("/api/auth/register", { method: "POST", body: JSON.stringify(payload) }),
};

export const productApi = {
  list: () => apiRequest("/api/products"),
};

export const orderApi = {
  placeOrder: (payload) => apiRequest("/api/orders", { method: "POST", body: JSON.stringify(payload) }),
};
