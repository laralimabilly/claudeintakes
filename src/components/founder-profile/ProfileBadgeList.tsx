import { Badge } from "@/components/ui/badge";

interface ProfileBadgeListProps {
  label: string;
  items: string[] | null | undefined;
  variant: "default" | "accent" | "muted" | "destructive";
  icon?: string;
}

const variantStyles = {
  default: "bg-charcoal-foreground/5 text-charcoal-foreground/60 hover:bg-charcoal-foreground/10",
  accent: "bg-ochre/20 text-ochre hover:bg-ochre/30 border-0",
  muted: "bg-charcoal-foreground/5 text-charcoal-foreground/50 hover:bg-charcoal-foreground/10",
  destructive: "bg-destructive/10 text-destructive/70 hover:bg-destructive/20 border-0",
};

export const ProfileBadgeList = ({ label, items, variant, icon }: ProfileBadgeListProps) => {
  if (!items || items.length === 0) return null;

  return (
    <div>
      <h3 className="text-[10px] tracking-[0.15em] uppercase text-charcoal-foreground/40 mb-1.5">
        {label}
      </h3>
      {icon ? (
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li key={i} className="text-xs text-charcoal-foreground/60 flex items-start gap-1.5">
              <span className={variant === "destructive" ? "text-destructive/50 mt-0.5" : "text-ochre/70 mt-0.5"}>
                {icon}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <Badge
              key={i}
              variant="secondary"
              className={`text-[10px] px-2 py-0.5 ${variantStyles[variant]}`}
            >
              {item}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
