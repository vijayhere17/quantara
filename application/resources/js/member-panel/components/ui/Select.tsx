type SelectOption = {
  label: string;
  value: string;
};

type SelectProps = {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  id?: string;
};

export function Select({ options, value, onChange, label, className = '', id }: SelectProps) {
  return (
    <label className={`block w-full ${className}`} htmlFor={id}>
      {label ? (
        <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-q-cyan">
          {label}
        </span>
      ) : null}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-auto rounded-xl border border-white/[0.1] bg-[#0d131c] px-4 py-3 text-sm text-white outline-none transition-all duration-300 hover:border-q-cyan/25 focus:border-q-cyan/50 focus:shadow-[0_0_0_3px_rgba(0,212,255,0.14)]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-[#101722] text-white">
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
