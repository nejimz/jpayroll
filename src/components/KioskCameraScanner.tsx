"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

const FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
  Html5QrcodeSupportedFormats.PDF_417,
];

type Props = {
  enabled: boolean;
  paused?: boolean;
  onScan: (code: string) => void;
};

function isAbortLike(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { name?: string; message?: string };
  if (e.name === "AbortError") return true;
  const msg = (e.message ?? "").toLowerCase();
  return msg.includes("aborted") || msg.includes("abort");
}

async function safeStop(scanner: Html5Qrcode) {
  try {
    if (scanner.isScanning) await scanner.stop();
  } catch (err) {
    if (!isAbortLike(err)) {
      // Ignore stop races during remount
    }
  }
  try {
    scanner.clear();
  } catch {
    /* ignore */
  }
}

export function KioskCameraScanner({ enabled, paused = false, onScan }: Props) {
  const reactId = useId().replace(/:/g, "");
  const elementId = `kiosk-camera-${reactId}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled) {
      setReady(false);
      setError(null);
      return;
    }

    let cancelled = false;
    let scanner: Html5Qrcode | null = null;

    // Delay start so React Strict Mode's immediate remount does not abort getUserMedia.
    const startTimer = window.setTimeout(() => {
      if (cancelled) return;

      scanner = new Html5Qrcode(elementId, {
        verbose: false,
        formatsToSupport: FORMATS,
        useBarCodeDetectorIfSupported: true,
      });
      scannerRef.current = scanner;

      void scanner
        .start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const edge = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.72);
              return { width: edge, height: edge };
            },
            aspectRatio: 1.333,
          },
          (decodedText) => {
            if (cancelled) return;
            const code = decodedText.trim();
            if (code) onScanRef.current(code);
          },
          () => {
            // Frame miss — ignore
          }
        )
        .then(async () => {
          if (cancelled) {
            if (scanner) await safeStop(scanner);
            return;
          }
          setReady(true);
          setError(null);
        })
        .catch((err: unknown) => {
          if (cancelled || isAbortLike(err)) return;
          setReady(false);
          setError("Allow camera access to scan");
        });
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
      setReady(false);
      const instance = scanner ?? scannerRef.current;
      scannerRef.current = null;
      if (instance) {
        void safeStop(instance);
      }
    };
  }, [enabled, elementId]);

  useEffect(() => {
    const scanner = scannerRef.current;
    if (!scanner || !ready || !scanner.isScanning) return;
    try {
      if (paused) scanner.pause(true);
      else scanner.resume();
    } catch {
      /* pause/resume only valid while scanning */
    }
  }, [paused, ready]);

  return (
    <div className="mx-auto mt-10 w-full max-w-md">
      <div
        className={`overflow-hidden rounded-xl border border-[var(--border)] bg-black/5 ${
          enabled ? "" : "opacity-40"
        }`}
      >
        <div
          id={elementId}
          className="kiosk-camera-reader min-h-[220px] w-full [&_video]:h-auto [&_video]:w-full [&_img]:hidden"
        />
      </div>
      {error ? <p className="mt-3 text-sm text-[var(--muted)]">{error}</p> : null}
      {!error && enabled && !ready ? (
        <p className="mt-3 text-sm text-[var(--muted)]">Starting camera…</p>
      ) : null}
    </div>
  );
}
