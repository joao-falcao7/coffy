import Image from "next/image";

// cenario do cemiterio no fundo, com degrade pra manter o texto legivel
export function Graveyard({
  dim = "medium",
  className = "inset-0",
}: {
  dim?: "medium" | "strong";
  className?: string;
}) {
  return (
    <div aria-hidden className={`pointer-events-none absolute overflow-hidden ${className}`}>
      <Image
        src="/art/bg-graveyard.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-[50%_35%]"
      />
      <div
        className={
          dim === "strong"
            ? "absolute inset-0 bg-gradient-to-b from-night/80 via-night/85 to-night"
            : "absolute inset-0 bg-gradient-to-b from-night/30 via-night/55 to-night"
        }
      />
    </div>
  );
}
