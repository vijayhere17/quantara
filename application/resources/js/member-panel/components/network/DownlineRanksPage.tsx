import { useMemo, useState } from 'react';
import { Medal, Users } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { DataTableToolbar } from '../ui/DataTableToolbar';
import { EmptyState } from '../ui/EmptyState';
import { PageContainer } from '../ui/PageContainer';
import { PageHeader } from '../ui/PageHeader';
import { Pagination } from '../ui/Pagination';
import { RankBadge } from '../ui/RankBadge';
import { StatusBadge } from '../ui/StatusBadge';
import { Table, type TableColumn } from '../ui/Table';
import type { DownlineRankRow, DownlineRanksBoot } from '../../types';

type DownlineRanksPageProps = {
  data: DownlineRanksBoot;
};

export function DownlineRanksPage({ data }: DownlineRanksPageProps) {
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.downlineRanks;
    return data.downlineRanks.filter(
      (row) =>
        row.address.toLowerCase().includes(q) ||
        row.rank.toLowerCase().includes(q) ||
        row.package.toLowerCase().includes(q),
    );
  }, [data.downlineRanks, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize) || 0);
  const safePage = Math.min(page, Math.max(pageCount, 1));
  const start = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, filtered.length);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const columns: TableColumn<DownlineRankRow>[] = [
    {
      key: '#',
      header: '#',
      render: (_row, index) => (safePage - 1) * pageSize + index + 1,
    },
    {
      key: 'address',
      header: 'Wallet',
      render: (row) => (
        <span className="font-mono text-sm text-white">{row.address}</span>
      ),
    },
    {
      key: 'rank',
      header: 'Rank',
      render: (row) => <RankBadge rank={row.rank} />,
    },
    {
      key: 'package',
      header: 'Package',
      render: (row) => row.package,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'registeredDate',
      header: 'Joined',
      render: (row) => row.registeredDate || '—',
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Downline Ranks"
        crumbs={[
          { label: 'Dashboard', href: data.links.dashboard },
          { label: 'Network' },
          { label: 'Downline Ranks' },
        ]}
      />

      <div className="q-glass-card p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Medal className="h-5 w-5 text-q-cyan" />
            <h2 className="text-base font-semibold text-white">My direct downlines</h2>
          </div>
          <Badge tone="teal">{filtered.length} members</Badge>
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
          emptyState={
            <EmptyState
              icon={<Users className="h-7 w-7" />}
              title="No downlines yet"
              description="Your direct referrals and their ranks will appear here."
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
      </div>
    </PageContainer>
  );
}
