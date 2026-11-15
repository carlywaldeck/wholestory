import type { HTMLAttributes } from "react";
export function GlassCard({ as: Tag = "div", className = "", ...props }: HTMLAttributes<HTMLElement> & { as?: "div" | "section" | "nav" }) {
  return <Tag {...props} className={`glass-card ${className}`} />;
}
