import { useCallback, useEffect, useState } from "react";
import { orderApi } from "../services/api";
import { supabase } from "../services/supabaseClient";

export function useOrderTracking(orderId) {
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(orderId));
  const [error, setError] = useState("");

  const refresh = useCallback(
    async ({ background = false } = {}) => {
      if (!orderId) {
        setOrder(null);
        setError("");
        setIsLoading(false);
        return;
      }

      if (!background) {
        setIsLoading(true);
      }

      try {
        const nextOrder = await orderApi.getById(orderId);
        setOrder(nextOrder);
        setError("");
      } catch (err) {
        setError(err?.message || "Unable to load order status.");
      } finally {
        setIsLoading(false);
      }
    },
    [orderId]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!orderId) {
      return undefined;
    }

    const channel = supabase
      .channel(`customer-order-tracking-${orderId}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        () => {
          refresh({ background: true });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, refresh]);

  return {
    order,
    isLoading,
    error,
    refresh,
  };
}
