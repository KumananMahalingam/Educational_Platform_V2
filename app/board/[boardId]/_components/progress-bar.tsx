interface ProgressBarProps {
  percentage: number;
  isCorrect: boolean;
  feedback: string;
  isLoading: boolean;
}

export const ProgressBar = ({
  percentage,
  isCorrect,
  feedback,
  isLoading,
}: ProgressBarProps) => {
  const value = Number.isFinite(percentage) ? Math.max(0, Math.min(100, Math.round(percentage))) : 0;
  const fillClass = isCorrect ? "bg-green-500" : "bg-red-500";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="h-2.5 flex-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full ${fillClass} transition-all duration-500 ${isLoading ? "animate-pulse" : ""}`}
            style={{ width: `${value}%` }}
          />
        </div>
        <span className="text-xs text-white/80 w-10 text-right">{value}%</span>
      </div>
      <p className="text-xs text-white/60">{feedback}</p>
    </div>
  );
};
