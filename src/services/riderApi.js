import { riderApi } from "./api";
import { subscribeLocalData } from "./localData";

export async function fetchRiderDashboard() {
  return riderApi.dashboard();
}

export async function setRiderOnline(online, workingShift) {
  return riderApi.setAvailability({ online, workingShift });
}

export async function acceptRiderOrder(orderId) {
  return riderApi.acceptOrder(orderId);
}

export async function declineRiderOrder(orderId) {
  return riderApi.declineOrder(orderId);
}

export async function confirmPickup(orderId) {
  await riderApi.confirmPickup(orderId);
  return riderApi.startTransit(orderId);
}

export async function confirmArrival(orderId) {
  return riderApi.confirmArrival(orderId);
}

export async function completeRiderDelivery(orderId) {
  return riderApi.completeDelivery(orderId);
}

export function subscribeToRiderOrders(onRefresh) {
  return subscribeLocalData(onRefresh);
}
