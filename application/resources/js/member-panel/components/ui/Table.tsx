import type { ReactNode } from 'react';

export type TableColumn<T> = {
  key: string;
  header: string;
  className?: string;
  render: (row: T, index: number) => ReactNode;
};

type TableProps<T> = {
  columns: TableColumn<T>[];
  rows: T[];
  emptyState?: ReactNode;
  minWidth?: string;
  className?: string;
};

export function Table<T>({
  columns,
  rows,
  emptyState,
  minWidth = '650px',
  className = '',
}: TableProps<T>) {
  return (
    <div className={`overflow-x-auto rounded-[14px] border border-white/[0.07] ${className}`}>
      <table className="w-full border-collapse text-left" style={{ minWidth }}>
        <thead>
          <tr className="bg-q-cyan/[0.08]">
            {columns.map((column) => (
              <th
                key={column.key}
                className={`whitespace-nowrap px-4 py-3.5 text-[12px] font-bold uppercase tracking-[0.08em] text-q-muted ${column.className ?? ''}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-0">
                {emptyState}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr
                key={index}
                className="border-t border-white/[0.05] transition-colors duration-200 hover:bg-q-cyan/[0.05]"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`whitespace-nowrap px-4 py-3.5 text-sm text-[#dbe4ef] ${column.className ?? ''}`}
                  >
                    {column.render(row, index)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
