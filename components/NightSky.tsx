// lua crescente e estrelinhas de fundo
const stars = [
  [8, 12, 3],
  [22, 6, 2],
  [35, 18, 2],
  [52, 8, 3],
  [68, 22, 2],
  [90, 30, 2],
  [14, 40, 2],
  [80, 48, 3],
  [5, 62, 2],
  [94, 70, 2],
];

export function NightSky() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg
        className="absolute right-4 top-6 h-16 w-16 sm:right-12 sm:h-24 sm:w-24"
        viewBox="0 0 40 40"
      >
        <circle cx="20" cy="20" r="16" fill="#f3ead6" />
        <circle cx="27" cy="14" r="14" fill="#241733" />
      </svg>
      {stars.map(([x, y, r], i) => (
        <span
          key={i}
          className="absolute rounded-full bg-bone opacity-80"
          style={{ left: `${x}%`, top: `${y}%`, width: r * 2, height: r * 2 }}
        />
      ))}
    </div>
  );
}
