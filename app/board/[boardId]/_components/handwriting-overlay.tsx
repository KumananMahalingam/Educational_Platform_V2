"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { CanvasState } from "@/types/canvas";
import { captureCanvas } from "@/lib/capture-canvas";

import { ProgressBar } from "./progress-bar";

interface VerificationState {
  isLoading: boolean;
  isCorrect: boolean;
  percentage: number;
  feedback: string;
}

interface HandwritingOverlayProps {
  activeProblemSrc: string | null;
  canvasState: CanvasState;
  onProgressChange: (state: VerificationState) => void;
  onStrokeEnd: number | null;
}

const DEFAULT_STATE: VerificationState = {
  isLoading: false,
  isCorrect: true,
  percentage: 0,
  feedback: "Start writing to verify your latest step.",
};

export const HandwritingOverlay = ({
  activeProblemSrc,
  onProgressChange,
  onStrokeEnd,
}: HandwritingOverlayProps) => {
  const [state, setState] = useState<VerificationState>(DEFAULT_STATE);
  const [problemText, setProblemText] = useState("");
  const [debugImage, setDebugImage] = useState<string | null>(null);

  // Stable refs so async handlers can read the latest values without forcing
  // the recognition effect to re-run on every state/prop tick.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const onProgressChangeRef = useRef(onProgressChange);
  useEffect(() => {
    onProgressChangeRef.current = onProgressChange;
  }, [onProgressChange]);

  // Single source of truth: any time local state moves, push the same snapshot
  // to the parent so the side-panel ProgressBar updates in lock-step with the
  // floating overlay one.
  const pushState = (next: VerificationState) => {
    stateRef.current = next;
    setState(next);
    onProgressChangeRef.current(next);
  };

  useEffect(() => {
    if (!activeProblemSrc) {
      setProblemText("");
      return;
    }

    let ignore = false;
    const fetchProblemText = async () => {
      try {
        const imgResponse = await fetch(activeProblemSrc);
        const blob = await imgResponse.blob();
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const response = await fetch("/api/extract-math", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ src: base64 }),
        });
        if (!response.ok) return;
        const data = (await response.json()) as {
          text?: string;
          latex?: string;
        };
        if (!ignore) {
          setProblemText(data.text || data.latex || "");
        }
      } catch {
        if (!ignore) setProblemText("");
      }
    };
    fetchProblemText();

    return () => {
      ignore = true;
    };
  }, [activeProblemSrc]);

  // --- Rate-limit-aware scheduling ---------------------------------------
  // Gemini free tier = 20 req/min, so we throttle aggressively:
  //   * 2000ms debounce after a stroke ends (coalesces bursts of strokes)
  //   * 5000ms minimum gap between successful API calls (~12 RPM)
  //   * On a 429 we honour Gemini's retry-after hint
  //   * Only ever one request in flight at a time
  const DEBOUNCE_MS = 2000;
  const MIN_INTERVAL_MS = 5000;

  const inFlightRef = useRef(false);
  const nextAllowedAtRef = useRef(0);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownDisplayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  useEffect(() => {
    if (onStrokeEnd == null || onStrokeEnd <= 0) {
      return;
    }

    let cancelled = false;

    const runRecognition = async () => {
      if (cancelled) return;
      if (inFlightRef.current) {
        // A request is already running — when it finishes, the latest
        // strokeEndTick will retrigger this effect and we'll try again.
        return;
      }

      const now = Date.now();
      const wait = Math.max(0, nextAllowedAtRef.current - now);
      if (wait > 0) {
        // Still cooling down. Reschedule for exactly when we're allowed.
        if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = setTimeout(runRecognition, wait);
        return;
      }

      const imageBase64 = await captureCanvas();
      if (cancelled) return;
      if (!imageBase64) {
        console.warn("[handwriting] captureCanvas returned null");
        return;
      }

      console.log(
        `[handwriting] captured image, base64 length=${imageBase64.length}`
      );
      setDebugImage(`data:image/png;base64,${imageBase64}`);

      inFlightRef.current = true;
      nextAllowedAtRef.current = Date.now() + MIN_INTERVAL_MS;
      pushState({ ...stateRef.current, isLoading: true });

      try {
        const response = await fetch("/api/recognize-math", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64, problem: problemText }),
        });

        if (response.status === 429) {
          const data = (await response.json().catch(() => ({}))) as {
            retryAfterSeconds?: number;
          };
          const retrySec = Math.max(1, data.retryAfterSeconds ?? 30);
          nextAllowedAtRef.current = Date.now() + retrySec * 1000;
          console.warn(`[handwriting] rate limited, retry in ${retrySec}s`);
          if (cancelled) return;

          pushState({
            ...stateRef.current,
            isLoading: false,
            feedback: `Rate limited — retrying in ${retrySec}s.`,
          });

          // Once the cooldown is up, automatically retry with whatever's on
          // the canvas now.
          if (cooldownDisplayTimerRef.current) {
            clearTimeout(cooldownDisplayTimerRef.current);
          }
          cooldownDisplayTimerRef.current = setTimeout(() => {
            if (!cancelled) runRecognition();
          }, retrySec * 1000);
          return;
        }

        if (!response.ok) {
          throw new Error(`Recognition failed: ${response.status}`);
        }

        const data = (await response.json()) as {
          latex?: string;
          isCorrect?: boolean;
          percentage?: number;
          feedback?: string;
        };
        console.log("[handwriting] recognize-math response", data);

        if (cancelled) return;

        const nextPercentage =
          typeof data.percentage === "number" &&
          Number.isFinite(data.percentage)
            ? Math.max(0, Math.min(100, data.percentage))
            : stateRef.current.percentage;

        pushState({
          isLoading: false,
          isCorrect: data.isCorrect ?? true,
          percentage: nextPercentage,
          feedback:
            data.feedback ||
            (data.isCorrect === false
              ? "Something looks off — keep trying."
              : "Looking good — keep going."),
        });
      } catch (e) {
        console.error("[handwriting] recognition error", e);
        if (cancelled) return;
        pushState({
          ...stateRef.current,
          isLoading: false,
          feedback: "Could not analyse handwriting. Try again.",
        });
      } finally {
        inFlightRef.current = false;
      }
    };

    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    pendingTimerRef.current = setTimeout(runRecognition, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
    };
  }, [onStrokeEnd, problemText]);

  // Clean up the cooldown auto-retry timer on unmount.
  useEffect(() => {
    return () => {
      if (cooldownDisplayTimerRef.current) {
        clearTimeout(cooldownDisplayTimerRef.current);
      }
    };
  }, []);

  const showProgress = useMemo(
    () => state.isLoading || state.percentage > 0,
    [state.isLoading, state.percentage]
  );

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {showProgress && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[360px]">
          <ProgressBar
            percentage={state.percentage}
            isCorrect={state.isCorrect}
            feedback={state.feedback}
            isLoading={state.isLoading}
          />
        </div>
      )}
      {debugImage && (
        <div className="absolute bottom-4 left-4 pointer-events-auto rounded-lg overflow-hidden border border-white/20 bg-neutral-900/80 shadow-xl">
          <div className="px-2 py-1 text-[10px] font-medium text-white/60 uppercase tracking-wider">
            Captured (debug)
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={debugImage}
            alt="Last canvas capture sent to Gemini"
            className="block w-[180px] h-auto"
          />
        </div>
      )}
    </div>
  );
};
