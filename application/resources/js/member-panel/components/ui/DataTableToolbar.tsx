import { SearchBar } from './SearchBar';

type DataTableToolbarProps = {
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  search: string;
  onSearchChange: (value: string) => void;
  pageSizeOptions?: number[];
  className?: string;
};

export function DataTableToolbar({
  pageSize,
  onPageSizeChange,
  search,
  onSearchChange,
  pageSizeOptions = [10, 25, 50, 100],
  className = '',
}: DataTableToolbarProps) {
  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <label className="flex items-center gap-2 text-sm text-q-muted">
        <span>Show</span>
        <select
          value={String(pageSize)}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="rounded-[10px] border border-white/[0.1] bg-[#101722] px-2.5 py-1.5 text-sm text-white outline-none transition focus:border-q-cyan/50"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span>entries</span>
      </label>

      <SearchBar value={search} onChange={onSearchChange} />
    </div>
  );
}
