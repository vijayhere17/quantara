import { useMemo, useState } from 'react';
import { Users } from 'lucide-react';
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
import { Tabs } from '../ui/Tabs';
import type { MyReferralsBoot, ReferralRow } from '../../types';

type MyReferralsPageProps = {
  data: MyReferralsBoot;
};

const filterTabs = [
  { id: 'all', label: 'All User' },
  { id: 'active', label: 'Active User' },
  { id: 'inactive', label: 'Inactive User' },
];

export function MyReferralsPage({ data }: MyReferralsPageProps) {
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.referrals.filter((row) => {
      if (filter === 'active' && row.status !== 'active') return false;
      if (filter === 'inactive' && row.status !== 'inactive') return false;
      if (!query) return true;
      return (
        row.username.toLowerCase().includes(query) ||
        row.status.toLowerCase().includes(query) ||
        String(row.totalTopup).toLowerCase().includes(query)
      );
    });
  }, [data.referrals, filter, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize) || 0);
  const safePage = Math.min(page, Math.max(pageCount, 1));
  const start = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, filtered.length);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const columns: TableColumn<ReferralRow>[] = [
    {
      key: '#',
      header: '#',
      render: (_row, index) => (safePage - 1) * pageSize + index + 1,
    },
    {
      key: 'username',
      header: 'User Name',
      render: (row) => row.username,
    },
    {
      key: 'activationOn',
      header: 'Activation On',
      render: (row) => row.activationOn || '—',
    },
    {
      key: 'totalTopup',
      header: 'Total Topup',
      render: (row) => row.totalTopup,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'registeredDate',
      header: 'Registered Date',
      render: (row) => row.registeredDate || '—',
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="My Referral"
        crumbs={[
          { label: 'Dashboard', href: data.links.dashboard },
          { label: 'Referrals & Downline' },
          { label: 'My Referral' },
        ]}
      />

      <Card hover={false} className="border-q-cyan/20 p-5 shadow-[0_0_0_1px_rgba(0,212,255,0.08)] sm:p-6">
        <div className="mb-5">
          <SectionTitle
            title="My Referrals List"
            icon={<Users className="h-5 w-5" />}
            action={<Badge tone="teal">{filtered.length} Referrals</Badge>}
          />
        </div>

        <Tabs
          items={filterTabs}
          value={filter}
          onChange={(id) => {
            setFilter(id as 'all' | 'active' | 'inactive');
            setPage(1);
          }}
          className="mb-5"
        />

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
              title="No referrals yet"
              description="Share your referral link to start building your Quantara network."
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
