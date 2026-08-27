export default function DisciplineRing({ score = 0, size = 168 }) {
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 80 ? "#4FAF8B" : score >= 50 ? "#C9A24B" : "#C1573F";

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90 absolute inset-0">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#2C313F"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="relative flex flex-col items-center justify-center">
        <span className="font-mono text-3xl" style={{ color }}>
          {score}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-parchment-faint mt-0.5">
          Discipline
        </span>
      </div>
    </div>
  );
}
