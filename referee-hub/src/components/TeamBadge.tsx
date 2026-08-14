export function TeamBadge({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return (
    <div className="team-badge" style={logoUrl ? { backgroundImage: `url(${logoUrl})` } : undefined} aria-hidden="true">
      {!logoUrl && initials}
    </div>
  );
}
