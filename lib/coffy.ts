export type CoffyExpression =
  | "default"
  | "laughing"
  | "crying"
  | "fainted"
  | "digging"
  | "winking";

// mascote trocavel: quando a arte final chegar, apontar cada expressao pro arquivo em /public/coffy
export const coffySources: Record<CoffyExpression, string> = {
  default: "/coffy/coffy.svg",
  laughing: "/coffy/coffy.svg",
  crying: "/coffy/coffy.svg",
  fainted: "/coffy/coffy.svg",
  digging: "/coffy/coffy.svg",
  winking: "/coffy/coffy.svg",
};

// expressao do coffy por faixa de nota
export function expressionForScore(score: number): CoffyExpression {
  if (score < 20) return "fainted";
  if (score < 40) return "crying";
  if (score < 60) return "laughing";
  if (score < 80) return "digging";
  return "winking";
}
