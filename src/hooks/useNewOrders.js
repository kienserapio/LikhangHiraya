import { useEffect, useRef } from "react";
import { supabase } from "../services/supabaseClient";

export function useNewOrders({ enabled = true, onIncoming }) {
  const callbackRef = useRef(onIncoming);

  useEffect(() => {
    callbackRef.current = onIncoming;
  }, [onIncoming]);

  useEffect(() => {
    if (!enabled || typeof callbackRef.current !== "function") {
      return undefined;
    }

    const channel = supabase
      .channel(`rider-new-orders-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: "status=eq.PENDING",
        },
        (payload) => {
          callbackRef.current?.(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled]);
}
