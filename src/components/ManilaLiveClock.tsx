"use client";

import { useEffect, useState } from "react";

export function ManilaLiveClock({
  size = "lg",
}: {
  size?: "md" | "lg" | "xl";
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(now);

  const date = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(now);

  const timeClass =
    size === "xl"
      ? "text-5xl sm:text-6xl"
      : size === "lg"
        ? "text-4xl sm:text-5xl"
        : "text-2xl sm:text-3xl";

  return (
    <div className="text-center">
      <p className="text-sm font-medium uppercase tracking-[0.12em] text-muted">Asia/Manila</p>
      <p
        className={`mt-2 font-[family-name:var(--font-display)] tracking-tight text-foreground tabular-nums ${timeClass}`}
      >
        {time}
      </p>
      <p className="mt-2 text-sm text-muted">{date}</p>
    </div>
  );
}
