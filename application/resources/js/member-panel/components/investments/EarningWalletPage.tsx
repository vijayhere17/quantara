import { ArrowDownRight, ArrowUpRight, Wallet } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { PageContainer } from '../ui/PageContainer';
import { PageHeader } from '../ui/PageHeader';
import { SectionTitle } from '../ui/SectionTitle';
import { Table, type TableColumn } from '../ui/Table';
import type { EarningWalletBoot, WalletTxnRow } from '../../types';

type EarningWalletPageProps = {
  data: EarningWalletBoot;
};

export function EarningWalletPage({ data }: EarningWalletPageProps) {
  const rows = data.transactions;

  const columns: TableColumn<WalletTxnRow>[] = [
    { key: '#', header: '#', render: (_row, index) => index + 1 },
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

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <Card hover className="border-q-cyan/20 p-5 shadow-[0_0_0_1px_rgba(0,217,255,0.08)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-q-muted">
                Total Credit
              </p>
              <p className="mt-3 text-2xl font-bold text-white">${data.summary.totalCredit}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-q-cyan/10 text-q-cyan">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card hover className="border-q-cyan/20 p-5 shadow-[0_0_0_1px_rgba(0,217,255,0.08)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-q-muted">
                Total Debit
              </p>
              <p className="mt-3 text-2xl font-bold text-white">${data.summary.totalDebit}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-q-cyan/10 text-q-cyan">
              <ArrowDownRight className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card hover className="border-q-cyan/20 p-5 shadow-[0_0_0_1px_rgba(0,217,255,0.08)]">
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

      <Card hover={false} className="border-q-cyan/20 p-5 shadow-[0_0_0_1px_rgba(0,217,255,0.08)] sm:p-6">
        <div className="mb-5">
          <SectionTitle
            title="Stake Earning"
            action={<Badge tone="cyan">{rows.length} Transactions</Badge>}
          />
        </div>

        <Table
          columns={columns}
          rows={rows}
          emptyState={<EmptyState title="No transactions yet." />}
        />
      </Card>
    </PageContainer>
  );
}
