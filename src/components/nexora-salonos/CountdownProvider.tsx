/**
 * Shares one countdown between the sticky header and the sticky footer bar so
 * both always show the same time. Counts down from COUNTDOWN_START_SECONDS and
 * restarts when it reaches zero (a rolling offer window).
 */
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { COUNTDOWN_START_SECONDS } from "./content";

const CountdownContext = createContext<string>("00:00");

const format = (total: number) => {
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

export function CountdownProvider({ children }: { children: ReactNode }) {
  const [seconds, setSeconds] = useState(COUNTDOWN_START_SECONDS);

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds((s) => (s <= 1 ? COUNTDOWN_START_SECONDS : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return <CountdownContext.Provider value={format(seconds)}>{children}</CountdownContext.Provider>;
}

export const useCountdown = () => useContext(CountdownContext);
