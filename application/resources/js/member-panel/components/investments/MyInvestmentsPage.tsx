import { Layers } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { DataTableToolbar } from '../ui/DataTableToolbar';
import { EmptyState } from '../ui/EmptyState';
import { PageContainer } from '../ui/PageContainer';
import { PageHeader } from '../ui/PageHeader';
import { Pagination } from '../ui/Pagination';
import { SectionTitle } from '../ui/SectionTitle';
import { StatusBadge } from '../ui/StatusBadge';
import { Table, type TableColumn } from '../ui/Table';
import type { InvestmentRow, MyInvestmentsBoot } from '../../types';

type MyInvestmentsPageProps = {
  data: MyInvestmentsBoot;
};

export function MyInvestmentsPage({ data }: MyInvestmentsPageProps) {
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return data.investments;
    return data.investments.filter((row) =>
      [row.request, row.amount, row.btcPlan, row.txnHash, row.maturity, row.status]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [data.investments, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize) || 0);
  const safePage = Math.min(page, Math.max(pageCount, 1));
  const start = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, filtered.length);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const columns: TableColumn<InvestmentRow>[] = [
    {
      key: '#',
      header: '#',
      render: (_row, index) => (safePage - 1) * pageSize + index + 1,
    },
    { key: 'request', header: 'Request', render: (row) => row.request },
    { key: 'amount', header: 'Amount ($)', render: (row) => row.amount },
    { key: 'btcPlan', header: 'BTC Plan', render: (row) => row.btcPlan },
    {
      key: 'txnHash',
      header: 'Txn. Hash',
      render: (row) => row.txnHash || '—',
    },
    { key: 'maturity', header: 'Maturity', render: (row) => row.maturity || '—' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="My Investments"
        crumbs={[
          { label: 'Dashboard', href: data.links.dashboard },
          { label: 'Stake BTC' },
          { label: 'My Investments' },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card hover className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-q-muted">
            Total Invested
          </p>
          <p className="mt-3 text-2xl font-bold text-white">${data.summary.totalInvested}</p>
        </Card>
        <Card hover className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-q-muted">
            Active Investment
          </p>
          <p className="mt-3 text-2xl font-bold text-white">${data.summary.activeInvestment}</p>
        </Card>
        <Card hover className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-q-muted">
            Completed Packages
          </p>
          <p className="mt-3 text-2xl font-bold text-white">{data.summary.completedPackages}</p>
        </Card>
        <Card hover className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-q-muted">
            ROI Earned
          </p>
          <p className="mt-3 text-2xl font-bold text-white">${data.summary.roiEarned}</p>
        </Card>
      </div>

      <Card hover={false} className="border-q-cyan/20 p-5 shadow-[0_0_0_1px_rgba(0,217,255,0.08)] sm:p-6">
        <div className="mb-5">
          <SectionTitle
            title="Topup Report"
            icon={<Layers className="h-5 w-5" />}
            action={<Badge tone="cyan">{filtered.length} Records</Badge>}
          />
        </div>

        <DataTableToolbar
          pageSize={pageSize}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          className="mb-4"
        />

        <Table
          columns={columns}
          rows={pageRows}
          minWidth="780px"
          emptyState={
            <EmptyState
              icon={<Layers className="h-7 w-7" />}
              title="No investments yet"
              description="Activate a package to start earning rewards on the Quantara chain."
            />
          }
        />

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-q-muted">
            Showing {start} to {end} of {filtered.length} entries
          </p>
          <Pagination
            page={filtered.length === 0 ? 1 : safePage}
            pageCount={filtered.length === 0 ? 0 : pageCount}
            onPageChange={setPage}
          />
        </div>
      </Card>
    </PageContainer>
  );
}
