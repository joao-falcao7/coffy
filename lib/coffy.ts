export type CoffyExpression =
  | "default"
  | "laughing"
  | "crying"
  | "fainted"
  | "digging"
  | "winking";

// mascote trocavel: quando a arte final chegar, apontar cada expressao pro arquivo em /public/coffy
export const coffySources: Record<CoffyExpression, string> = {
  default: "/coffy/coffy-default.png",
  laughing: "/coffy/coffy-laughing.png",
  crying: "/coffy/coffy-crying.png",
  fainted: "/coffy/coffy-fainted.png",
  digging: "/coffy/coffy-digging.png",
  winking: "/coffy/coffy-winking.png",
};

// expressao do coffy por faixa de nota
export function expressionForScore(score: number): CoffyExpression {
  if (score < 20) return "fainted";
  if (score < 40) return "crying";
  if (score < 60) return "laughing";
  if (score < 80) return "digging";
  return "winking";
}
