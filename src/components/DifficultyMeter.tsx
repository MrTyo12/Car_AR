interface DifficultyMeterProps {
  score: number;
  max?: number;
}

export function DifficultyMeter({ score, max = 10 }: DifficultyMeterProps) {
  const percentage = (score / max) * 100;
  const color =
    score <= 3
      ? 'bg-emerald-500'
      : score <= 6
        ? 'bg-amber-500'
        : 'bg-scat-600';

  return (
    <div className="flex items-center gap-2">
      <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-carbon-700">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="font-mono text-sm font-semibold text-carbon-200">
        {score}/{max}
      </span>
    </div>
  );
}
