type TabItem = {
  id: string;
  label: string;
};

type TabsProps = {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
};

export function Tabs({ items, value, onChange, className = '' }: TabsProps) {
  return (
    <div className={`grid gap-3 sm:grid-cols-3 ${className}`}>
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={`rounded-xl border px-4 py-3.5 text-left text-sm font-semibold transition-all duration-300 ${
              active
                ? 'border-q-cyan/50 bg-q-cyan/10 text-white shadow-[0_0_0_1px_rgba(0,212,255,0.25),0_10px_28px_rgba(0,212,255,0.16)]'
                : 'border-white/[0.08] bg-white/[0.03] text-q-soft hover:border-q-cyan/30 hover:bg-q-cyan/5 hover:text-white'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
