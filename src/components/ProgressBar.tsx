interface ProgressBarProps {
  completed: number;
  total: number;
}

export function ProgressBar({ completed, total }: ProgressBarProps) {
  const percentage = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-carbon-700">
        <div
          className="h-full rounded-full bg-gradient-to-r from-scat-600 to-scat-400 transition-all duration-700 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="font-mono text-xs font-semibold text-carbon-300 whitespace-nowrap">
        {completed}/{total}
      </span>
    </div>
  );
}
