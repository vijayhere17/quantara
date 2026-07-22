type PaginationProps = {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export function Pagination({ page, pageCount, onPageChange, className = '' }: PaginationProps) {
  const disabledPrev = page <= 1;
  const disabledNext = pageCount === 0 || page >= pageCount;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        disabled={disabledPrev}
        onClick={() => onPageChange(page - 1)}
        className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-sm text-q-muted transition enabled:hover:border-q-cyan/30 enabled:hover:bg-q-cyan/10 enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        Previous
      </button>
      <button
        type="button"
        disabled={disabledNext}
        onClick={() => onPageChange(page + 1)}
        className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-sm text-q-muted transition enabled:hover:border-q-cyan/30 enabled:hover:bg-q-cyan/10 enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}
