"use client";
import { useEffect } from "react";
export default function GlobalTimeTracker() {
  useEffect(() => {
    let start = Date.now();
    let interval: NodeJS.Timeout;

    const saveTime = () => {
      const now = Date.now();
      const diffMinutes = Math.floor((now - start) / 60000);
      if (diffMinutes <= 0) return;

      const today = new Date().toDateString();
      const stored = localStorage.getItem("airena-time-tracking");
      const data = stored ? JSON.parse(stored) : {};

      data[today] = (data[today] || 0) + diffMinutes;
      localStorage.setItem("airena-time-tracking", JSON.stringify(data));

      start = now;
    };

    interval = setInterval(saveTime, 10000);

    const handleVisibility = () => {
      if (document.hidden) saveTime();
      else start = Date.now();
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      saveTime();
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return null; // invisible global logic
}
