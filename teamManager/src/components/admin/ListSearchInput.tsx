"use client";

interface ListSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ListSearchInput({ value, onChange, placeholder = "Rechercher..." }: ListSearchInputProps) {
  return (
    <div className="input-group" style={{ maxWidth: 320 }}>
      <span className="input-group-text bg-white">
        <i className="fas fa-search text-muted" aria-hidden="true" />
      </span>
      <input
        type="search"
        className="form-control"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Rechercher"
      />
    </div>
  );
}
