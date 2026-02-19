interface ProfileFieldProps {
  label: string;
  value: string | null | undefined;
  highlight?: boolean;
}

export const ProfileField = ({ label, value, highlight }: ProfileFieldProps) => {
  if (!value) return null;

  return (
    <div>
      <h3 className="text-[10px] tracking-[0.15em] uppercase text-charcoal-foreground/40 mb-1">
        {label}
      </h3>
      <p
        className={`text-sm leading-relaxed ${
          highlight
            ? "text-ochre/90"
            : "text-charcoal-foreground/70"
        }`}
      >
        {value}
      </p>
    </div>
  );
};
