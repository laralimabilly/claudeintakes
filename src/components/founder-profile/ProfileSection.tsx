interface ProfileSectionProps {
  title: string;
  children: React.ReactNode;
}

export const ProfileSection = ({ title, children }: ProfileSectionProps) => (
  <div className="px-5 sm:px-6 py-5 space-y-3">
    <h2 className="text-[11px] tracking-[0.2em] uppercase text-charcoal-foreground/40 font-medium border-b border-charcoal-foreground/10 pb-2 mb-3">
      {title}
    </h2>
    {children}
  </div>
);
