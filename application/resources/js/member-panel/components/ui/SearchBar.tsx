import { Search } from 'lucide-react';

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
};

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search…',
  label = 'Search:',
  className = '',
}: SearchBarProps) {
  return (
    <label className={`flex items-center gap-2 text-sm text-q-muted ${className}`}>
      <span className="shrink-0">{label}</span>
      <span className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-q-muted" />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full min-w-[140px] rounded-[10px] border border-white/[0.1] bg-[#101722] py-2 pl-9 pr-3 text-sm text-white outline-none transition-all duration-300 placeholder:text-q-muted/70 hover:border-q-cyan/25 focus:border-q-cyan/50 focus:shadow-[0_0_0_3px_rgba(0,212,255,0.14)] sm:min-w-[180px]"
        />
      </span>
    </label>
  );
}
