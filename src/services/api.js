import { localAuthApi, localOrderApi, localProductApi, localRiderApi } from "./localData";

export async function apiRequest() {
  throw new Error("apiRequest is disabled in frontend-only mode.");
}

export const authApi = {
  login: (payload) => localAuthApi.login(payload),
  register: (payload) => localAuthApi.register(payload),
  registerRider: (payload) => localAuthApi.registerRider(payload),
};

export const productApi = {
  list: () => localProductApi.list(),
};

export const orderApi = {
  placeOrder: (payload) => localOrderApi.placeOrder(payload),
  listMine: (scope = "active") => localOrderApi.listMine(scope),
  clearMineActive: () => localOrderApi.clearMineActive(),
};

export const riderApi = {
  dashboard: () => localRiderApi.dashboard(),
  setAvailability: (payload) => localRiderApi.setAvailability(payload),
  acceptOrder: (orderId) => localRiderApi.acceptOrder(orderId),
  declineOrder: (orderId) => localRiderApi.declineOrder(orderId),
  confirmPickup: (orderId) => localRiderApi.confirmPickup(orderId),
  startTransit: (orderId) => localRiderApi.startTransit(orderId),
  confirmArrival: (orderId) => localRiderApi.confirmArrival(orderId),
  completeDelivery: (orderId) => localRiderApi.completeDelivery(orderId),
};
