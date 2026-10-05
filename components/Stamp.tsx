// carimbo torto laranja estilo ficha de necroterio
export function Stamp({
  children,
  rotate = -6,
  className = "",
}: {
  children: React.ReactNode;
  rotate?: number;
  className?: string;
}) {
  return (
    <span
      style={{ transform: `rotate(${rotate}deg)` }}
      className={`inline-block self-start rounded-md border-[3px] border-pumpkin px-2 py-0.5 font-mono text-xs font-bold uppercase tracking-widest text-pumpkin ${className}`}
    >
      {children}
    </span>
  );
}
