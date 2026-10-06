import Image from "next/image";
import { coffySources, type CoffyExpression } from "@/lib/coffy";

export function Coffy({
  expression = "default",
  size = 240,
  className = "",
  priority = false,
}: {
  expression?: CoffyExpression;
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={coffySources[expression]}
      alt="Coffy, the coffin coroner"
      width={size}
      height={size}
      priority={priority}
      className={`drop-shadow-[0_8px_0_rgba(18,11,26,0.6)] ${className}`}
    />
  );
}
