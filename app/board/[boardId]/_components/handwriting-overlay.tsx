"use client";

import { useEffect, useMemo, useState } from "react";

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

  useEffect(() => {
    onProgressChange(state);
  }, [onProgressChange, state]);

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
              const data = (await response.json()) as { text?: string; latex?: string };
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

  useEffect(() => {
    if (onStrokeEnd == null || onStrokeEnd <= 0) {
      return;
    }

    const timer = setTimeout(async () => {
      const imageBase64 = await captureCanvas();
      if (!imageBase64) {
        return;
      }

      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        const response = await fetch("/api/recognize-math", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64, problem: problemText }),
        });

        if (!response.ok) {
          throw new Error("Recognition failed");
        }

        const data = (await response.json()) as {
          isCorrect?: boolean;
          percentage?: number;
          feedback?: string;
        };

        setState((prev) => ({
          isLoading: false,
          isCorrect: data.isCorrect ?? prev.isCorrect,
          percentage: Math.max(prev.percentage, data.percentage ?? prev.percentage),
          feedback: data.feedback || prev.feedback,
        }));
      } catch {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [onStrokeEnd, problemText]);

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
    </div>
  );
};
