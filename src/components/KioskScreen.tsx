"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { KioskCameraScanner } from "@/components/KioskCameraScanner";

type KioskStatus = {
  available: boolean;
  companyName: string | null;
  clientIp: string | null;
};

type Flash =
  | { kind: "success"; name: string; punchType: "IN" | "OUT"; punchedAt: string }
  | { kind: "error"; message: string };

function useManilaClock() {
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
  return { time, date };
}

export function KioskScreen() {
  const { time, date } = useManilaClock();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<KioskStatus | null>(null);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [busy, setBusy] = useState(false);
  const bufferRef = useRef("");

  const focusScan = useEffectEvent(() => {
    inputRef.current?.focus();
  });

  const submitBadge = useEffectEvent(async (code: string) => {
    const badgeCode = code.trim();
    if (!badgeCode || busy || flash) return;
    setBusy(true);
    try {
      const res = await fetch("/api/kiosk/punch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ badgeCode }),
      });
      const data = await res.json();
      if (data.ok) {
        setFlash({
          kind: "success",
          name: data.employeeName,
          punchType: data.punchType,
          punchedAt: data.punchedAt,
        });
      } else {
        setFlash({ kind: "error", message: data.message ?? "Punch failed." });
      }
    } catch {
      setFlash({ kind: "error", message: "Could not reach the server." });
    } finally {
      setBusy(false);
      bufferRef.current = "";
      if (inputRef.current) inputRef.current.value = "";
      focusScan();
    }
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/kiosk/status");
        const data = (await res.json()) as KioskStatus;
        if (!cancelled) setStatus(data);
      } catch {
        if (!cancelled) setStatus({ available: false, companyName: null, clientIp: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    focusScan();
    const onVisibility = () => {
      if (document.visibilityState === "visible") focusScan();
    };
    window.addEventListener("focus", focusScan);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", focusScan);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => {
      setFlash(null);
      focusScan();
    }, 2500);
    return () => clearTimeout(id);
  }, [flash]);

  const available = status?.available ?? false;
  const flashSuccess = flash?.kind === "success";

  return (
    <div className="safe-pad relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--accent-soft)_0%,transparent_65%)]"
      />
      <div className="relative z-10 w-full max-w-2xl text-center">
        {status && !available ? (
          <p className="mb-8 text-sm text-muted">
            Kiosk not available on this network
            {status.clientIp ? ` (${status.clientIp})` : ""}.
          </p>
        ) : null}

        <p className="font-[family-name:var(--font-display)] text-6xl tabular-nums tracking-tight text-foreground md:text-7xl">
          {time}
        </p>
        <p className="mt-3 text-lg text-muted">{date}</p>

        <p className="mt-12 font-[family-name:var(--font-display)] text-2xl text-foreground md:text-3xl">
          {available ? "Scan your badge" : "Waiting for network access"}
        </p>
        <p className="mt-2 text-sm text-muted">
          {available
            ? "Use camera or barcode scanner"
            : "Ask HR to enable this kiosk IP"}
        </p>
        {available && status?.companyName ? (
          <p className="mt-1 text-sm text-muted">{status.companyName} · Asia/Manila</p>
        ) : null}

        {available ? (
          <KioskCameraScanner
            enabled
            paused={busy || Boolean(flash)}
            onScan={(code) => {
              void submitBadge(code);
            }}
          />
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label="Badge scan input"
        disabled={!available || busy || Boolean(flash)}
        className="absolute bottom-4 left-4 h-8 w-40 opacity-[0.02]"
        onBlur={() => {
          setTimeout(focusScan, 0);
        }}
        onChange={(e) => {
          bufferRef.current = e.target.value;
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void submitBadge(bufferRef.current || e.currentTarget.value);
          }
        }}
      />

      {flash ? (
        <div
          className={`absolute inset-0 z-40 flex flex-col items-center justify-center px-6 text-center ${
            flashSuccess ? "bg-[var(--accent)] text-white" : "bg-[var(--danger)] text-white"
          }`}
          role="status"
          aria-live="polite"
        >
          {flash.kind === "success" ? (
            <>
              <p className="text-sm uppercase tracking-[0.2em] opacity-80">
                Time {flash.punchType === "IN" ? "In" : "Out"}
              </p>
              <p className="mt-4 font-[family-name:var(--font-display)] text-4xl md:text-5xl">{flash.name}</p>
              <p className="mt-4 text-lg tabular-nums opacity-90">{flash.punchedAt}</p>
            </>
          ) : (
            <>
              <p className="text-sm uppercase tracking-[0.2em] opacity-80">Unable to punch</p>
              <p className="mt-4 font-[family-name:var(--font-display)] text-3xl md:text-4xl">{flash.message}</p>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
