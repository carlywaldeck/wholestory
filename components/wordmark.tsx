export function Wordmark({ size = "md", inverse = false }: {
  size?: "sm" | "md" | "lg"; inverse?: boolean;
}) {
  return <span className={`wordmark wordmark--${size}${inverse ? " wordmark--inverse" : ""}`}>elya</span>;
}
