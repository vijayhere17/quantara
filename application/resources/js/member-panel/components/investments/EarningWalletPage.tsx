import { ArrowDownRight, ArrowUpRight, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { DataTableToolbar } from '../ui/DataTableToolbar';
import { EmptyState } from '../ui/EmptyState';
import { PageContainer } from '../ui/PageContainer';
import { PageHeader } from '../ui/PageHeader';
import { Pagination } from '../ui/Pagination';
import { SectionTitle } from '../ui/SectionTitle';
import { Select } from '../ui/Select';
import { Table, type TableColumn } from '../ui/Table';
import type { EarningWalletBoot, WalletTxnRow } from '../../types';

type EarningWalletPageProps = {
  data: EarningWalletBoot;
};

export function EarningWalletPage({ data }: EarningWalletPageProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.transactions.filter((row) => {
      if (typeFilter !== 'all' && row.txnType.toLowerCase() !== typeFilter) return false;
      if (!query) return true;
      return [row.description, row.amount, row.txnType, row.txnDate, row.hash, row.status]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [data.transactions, search, typeFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize) || 0);
  const safePage = Math.min(page, Math.max(pageCount, 1));
  const start = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, filtered.length);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const columns: TableColumn<WalletTxnRow>[] = [
    {
      key: '#',
      header: '#',
      render: (_row, index) => (safePage - 1) * pageSize + index + 1,
    },
    { key: 'description', header: 'Description', render: (row) => row.description },
    { key: 'amount', header: 'Amount', render: (row) => row.amount },
    { key: 'txnType', header: 'Txn. Type', render: (row) => row.txnType },
    { key: 'txnDate', header: 'Txn. Date', render: (row) => row.txnDate },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Earning Wallet"
        crumbs={[
          { label: 'Dashboard', href: data.links.dashboard },
          { label: 'Stake & Earning' },
          { label: 'Earning Wallet' },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card hover className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-q-muted">
                Total Credit
              </p>
              <p className="mt-3 text-2xl font-bold text-white">${data.summary.totalCredit}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card hover className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-q-muted">
                Total Debit
              </p>
              <p className="mt-3 text-2xl font-bold text-white">${data.summary.totalDebit}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-400/10 text-rose-300">
              <ArrowDownRight className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card hover className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-q-muted">
                Available Balance
              </p>
              <p className="mt-3 text-2xl font-bold text-white">${data.summary.availableBalance}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-q-cyan/10 text-q-cyan">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card hover className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-q-muted">ROI Wallet</p>
          <p className="mt-2 text-xl font-bold text-white">${data.summary.roiWallet}</p>
        </Card>
        <Card hover className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-q-muted">
            Working Wallet
          </p>
          <p className="mt-2 text-xl font-bold text-white">${data.summary.workingWallet}</p>
        </Card>
        <Card hover className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-q-muted">
            Community Wallet
          </p>
          <p className="mt-2 text-xl font-bold text-white">${data.summary.communityWallet}</p>
        </Card>
        <Card hover className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-q-muted">
            Total Earnings
          </p>
          <p className="mt-2 text-xl font-bold text-white">${data.summary.totalEarnings}</p>
        </Card>
      </div>

      <Card hover={false} className="border-q-cyan/20 p-5 shadow-[0_0_0_1px_rgba(0,217,255,0.08)] sm:p-6">
        <div className="mb-5">
          <SectionTitle
            title="Stake Earning"
            action={<Badge tone="cyan">{filtered.length} Transactions</Badge>}
          />
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[200px_1fr]">
          <Select
            value={typeFilter}
            onChange={(value) => {
              setTypeFilter(value);
              setPage(1);
            }}
            options={[
              { label: 'All Types', value: 'all' },
              { label: 'Deposit', value: 'deposit' },
              { label: 'ROI', value: 'roi' },
              { label: 'Contribution', value: 'contribution' },
              { label: 'Rank', value: 'rank' },
              { label: 'Booster', value: 'booster' },
              { label: 'Community', value: 'community' },
              { label: 'Withdrawal', value: 'withdrawal' },
              { label: 'Investment', value: 'investment' },
            ]}
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
          emptyState={<EmptyState title="No transactions yet." />}
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
