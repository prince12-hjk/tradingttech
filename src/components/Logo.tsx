import { Link } from "react-router-dom";
import { Activity } from "lucide-react";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dims = size === "sm" ? "h-7 w-7" : size === "lg" ? "h-10 w-10" : "h-8 w-8";
  const text = size === "sm" ? "text-base" : size === "lg" ? "text-2xl" : "text-lg";
  return (
    <Link to="/" className="flex items-center gap-2 group">
      <div className={`${dims} rounded-lg bg-gradient-primary grid place-items-center shadow-glow group-hover:scale-105 transition-transform`}>
        <Activity className="h-1/2 w-1/2 text-primary-foreground" strokeWidth={2.5} />
      </div>
      <span className={`font-display font-bold tracking-tight ${text}`}>
        Nexus<span className="text-primary">Trade</span>
      </span>
    </Link>
  );
}
