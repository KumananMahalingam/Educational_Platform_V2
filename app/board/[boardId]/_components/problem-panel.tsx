"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

type ProblemAnalysis = {
  topic: string;
  concepts: string[];
  hints: [string, string, string];
  solution: {
    steps: Array<{
      step: number;
      explanation: string;
      working: string;
    }>;
    finalAnswer: string;
  };
};

interface ProblemPanelProps {
  activeProblemSrc: string | null;
}

export const ProblemPanel = ({ activeProblemSrc }: ProblemPanelProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latex, setLatex] = useState("");
  const [text, setText] = useState("");
  const [analysis, setAnalysis] = useState<ProblemAnalysis | null>(null);
  const [revealedHints, setRevealedHints] = useState(0);
  const [showSolution, setShowSolution] = useState(false);

  useEffect(() => {
    setError(null);
    setIsLoading(false);
    setLatex("");
    setText("");
    setAnalysis(null);
    setRevealedHints(0);
    setShowSolution(false);
  }, [activeProblemSrc]);

  const canAnalyse = Boolean(activeProblemSrc) && !isLoading;
  const hintsLocked = !analysis;
  const solutionLocked = !analysis;

  const conceptList = useMemo(() => analysis?.concepts ?? [], [analysis]);

  const runAnalysis = async () => {
    if (!activeProblemSrc) {
      setError("Select a problem image layer first.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const extractResponse = await fetch("/api/extract-math", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ src: activeProblemSrc }),
      });

      const extractData = (await extractResponse.json()) as {
        latex?: string;
        text?: string;
        error?: string;
      };

      if (!extractResponse.ok) {
        throw new Error(extractData.error ?? "Failed to extract problem");
      }

      const extractedLatex = extractData.latex ?? "";
      const extractedText = extractData.text ?? "";
      setLatex(extractedLatex);
      setText(extractedText);

      const analyseResponse = await fetch("/api/analyse-problem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latex: extractedLatex,
          text: extractedText,
        }),
      });

      const analyseData = (await analyseResponse.json()) as ProblemAnalysis & { error?: string };
      if (!analyseResponse.ok) {
        throw new Error(analyseData.error ?? "Failed to analyse problem");
      }

      setAnalysis(analyseData);
      setRevealedHints(0);
      setShowSolution(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Analysis failed";
      setError(message);
      setAnalysis(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <aside
      className={`fixed top-0 right-0 h-screen z-50 transition-all duration-200 ${
        collapsed ? "w-10" : "w-[380px]"
      }`}
    >
      <div className="relative h-full">
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 h-12 w-10 rounded-l-md border border-r-0 border-neutral-200 bg-white shadow-sm flex items-center justify-center"
          aria-label={collapsed ? "Expand panel" : "Collapse panel"}
        >
          {collapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        {collapsed ? (
          <div className="h-full w-10 bg-white/95 border-l border-neutral-200 shadow-lg flex items-center justify-center pointer-events-none">
            <span className="text-xs font-semibold text-neutral-600 [writing-mode:vertical-rl] rotate-180 tracking-wide">
              Problem Analysis
            </span>
          </div>
        ) : (
          <div className="h-full bg-white border-l border-neutral-200 shadow-lg overflow-y-auto">
            <div className="p-4 border-b border-neutral-200">
              <h2 className="text-lg font-semibold">Problem Analysis</h2>
              <p className="text-xs text-neutral-500 mt-1">
                Select an image layer, then run extraction and analysis.
              </p>
            </div>

            <section className="p-4 border-b border-neutral-200 space-y-3">
              <h3 className="text-sm font-semibold">Problem</h3>

              {latex ? (
                <pre className="rounded-md bg-neutral-100 border border-neutral-200 p-3 text-xs whitespace-pre-wrap break-words">
                  {latex}
                </pre>
              ) : (
                <div className="rounded-md border border-dashed border-neutral-300 p-3 text-xs text-neutral-500">
                  {activeProblemSrc
                    ? "No extracted problem yet."
                    : "Select an image layer to analyse."}
                </div>
              )}

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700 space-y-2">
                  <p>{error}</p>
                  <button
                    type="button"
                    className="rounded bg-red-600 px-2 py-1 text-white hover:bg-red-700"
                    onClick={runAnalysis}
                    disabled={!canAnalyse}
                  >
                    Retry
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={runAnalysis}
                disabled={!canAnalyse}
                className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Analyse Problem
              </button>
            </section>

            <section className={`p-4 border-b border-neutral-200 space-y-3 ${hintsLocked ? "opacity-50 pointer-events-none" : ""}`}>
              <h3 className="text-sm font-semibold">Hints</h3>
              <div className="space-y-2">
                <p className="text-xs text-neutral-500">Topic</p>
                <p className="text-sm font-medium">{analysis?.topic || "-"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {conceptList.length > 0 ? conceptList.map((concept) => (
                  <span key={concept} className="text-xs px-2 py-1 rounded-full bg-neutral-100 border border-neutral-200">
                    {concept}
                  </span>
                )) : (
                  <span className="text-xs text-neutral-500">No concepts yet</span>
                )}
              </div>

              {[0, 1, 2].map((index) => {
                const hintNumber = index + 1;
                const canReveal = revealedHints === index;
                const visible = revealedHints > index;

                return (
                  <div key={hintNumber} className="rounded-md border border-neutral-200 p-2">
                    {visible ? (
                      <p className="text-sm">{analysis?.hints[index]}</p>
                    ) : (
                      <button
                        type="button"
                        disabled={!canReveal}
                        onClick={() => setRevealedHints((prev) => prev + 1)}
                        className="text-xs rounded bg-neutral-900 text-white px-2 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Reveal Hint {hintNumber}
                      </button>
                    )}
                  </div>
                );
              })}
            </section>

            <section className={`p-4 space-y-3 ${solutionLocked ? "opacity-50 pointer-events-none" : ""}`}>
              <h3 className="text-sm font-semibold">Solution</h3>

              {!showSolution ? (
                <div className="space-y-2">
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded-md">
                    Showing the solution will reduce your learning. Are you sure?
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowSolution(true)}
                    className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
                  >
                    Show Worked Solution
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {analysis?.solution.steps.map((step) => (
                    <div key={step.step} className="rounded-md border border-neutral-200 p-3 space-y-1">
                      <p className="text-xs font-semibold text-neutral-500">Step {step.step}</p>
                      <p className="text-sm">{step.explanation}</p>
                      <pre className="rounded bg-neutral-100 p-2 text-xs whitespace-pre-wrap break-words">
                        {step.working}
                      </pre>
                    </div>
                  ))}
                  <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3">
                    <p className="text-xs font-semibold text-emerald-700">Final Answer</p>
                    <p className="text-sm font-medium text-emerald-900 mt-1">
                      {analysis?.solution.finalAnswer}
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </aside>
  );
};
