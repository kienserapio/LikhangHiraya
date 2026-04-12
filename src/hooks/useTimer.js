import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function clampSeconds(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }
  return Math.floor(parsed);
}

export function useTimer(initialSeconds = 300) {
  const base = clampSeconds(initialSeconds);
  const [secondsLeft, setSecondsLeft] = useState(base);
  const intervalRef = useRef(null);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback((nextSeconds = base) => {
    const safeNext = clampSeconds(nextSeconds);
    stop();
    setSecondsLeft(safeNext);

    if (safeNext <= 0) {
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          stop();
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  }, [base, stop]);

  useEffect(() => {
    start(base);
    return () => stop();
  }, [base, start, stop]);

  const formatted = useMemo(() => {
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }, [secondsLeft]);

  return {
    secondsLeft,
    formatted,
    isExpired: secondsLeft <= 0,
    restart: start,
    stop,
  };
}
