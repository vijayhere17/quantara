import { useMemo, useState } from 'react';
import { GitBranch } from 'lucide-react';
import { Card } from '../ui/Card';
import { DataTableToolbar } from '../ui/DataTableToolbar';
import { EmptyState } from '../ui/EmptyState';
import { PageContainer } from '../ui/PageContainer';
import { PageHeader } from '../ui/PageHeader';
import { Pagination } from '../ui/Pagination';
import { SectionTitle } from '../ui/SectionTitle';
import { Select } from '../ui/Select';
import { StatusBadge } from '../ui/StatusBadge';
import { Table, type TableColumn } from '../ui/Table';
import type { DownlineReportBoot, DownlineRow } from '../../types';

type DownlineReportPageProps = {
  data: DownlineReportBoot;
};

export function DownlineReportPage({ data }: DownlineReportPageProps) {
  const [level, setLevel] = useState('0');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.downlines.filter((row) => {
      if (level !== '0' && String(row.level) !== level) return false;
      if (status === '1' && row.status !== 'active') return false;
      if (status === '0' && row.status !== 'inactive') return false;
      if (!query) return true;
      return (
        row.userDetails.toLowerCase().includes(query) ||
        row.referralDetails.toLowerCase().includes(query) ||
        row.status.toLowerCase().includes(query)
      );
    });
  }, [data.downlines, level, status, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize) || 0);
  const safePage = Math.min(page, Math.max(pageCount, 1));
  const start = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, filtered.length);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const levelOptions = [
    { label: 'All Levels', value: '0' },
    ...Array.from({ length: 25 }, (_, i) => ({
      label: `Level ${i + 1}`,
      value: String(i + 1),
    })),
  ];

  const statusOptions = [
    { label: 'All', value: '' },
    { label: 'Active User', value: '1' },
    { label: 'Inactive User', value: '0' },
  ];

  const columns: TableColumn<DownlineRow>[] = [
    {
      key: '#',
      header: '#',
      render: (_row, index) => (safePage - 1) * pageSize + index + 1,
    },
    {
      key: 'userDetails',
      header: 'User Details',
      render: (row) => row.userDetails,
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
    {
      key: 'referralDetails',
      header: 'Referral Details',
      render: (row) => row.referralDetails || '—',
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Downline Report"
        crumbs={[
          { label: 'Dashboard', href: data.links.dashboard },
          { label: 'Referral & Downline' },
          { label: 'Downline Report' },
        ]}
      />

      <Card hover={false} className="border-q-cyan/20 p-5 shadow-[0_0_0_1px_rgba(0,212,255,0.08)] sm:p-6">
        <div className="mb-5">
          <SectionTitle title="Downline Report" icon={<GitBranch className="h-5 w-5" />} />
        </div>

        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-3xl">
          <Select
            id="level"
            value={level}
            onChange={(value) => {
              setLevel(value);
              setPage(1);
            }}
            options={levelOptions}
          />
          <Select
            id="paidsearch"
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            options={statusOptions}
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
          minWidth="750px"
          emptyState={
            <EmptyState title="No data available in table" />
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
