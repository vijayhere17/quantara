import { LineChart } from 'lucide-react';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { PageContainer } from '../ui/PageContainer';
import { PageHeader } from '../ui/PageHeader';
import { Table, type TableColumn } from '../ui/Table';
import type { IncentiveReportBoot, WalletTxnRow } from '../../types';

type IncentiveReportPageProps = {
  data: IncentiveReportBoot;
};

export function IncentiveReportPage({ data }: IncentiveReportPageProps) {
  const rows = data.records;

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
        title={data.reportTitle}
        crumbs={[
          { label: 'Dashboard', href: data.links.dashboard },
          { label: 'Incentive Report' },
          { label: data.reportTitle },
        ]}
      />

      <Card hover={false} className="border-q-cyan/20 p-5 shadow-[0_0_0_1px_rgba(0,217,255,0.08)] sm:p-6">
        <div className="mb-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-q-cyan/35 bg-q-cyan/10 px-3.5 py-2 text-sm font-semibold text-q-cyan">
            <LineChart className="h-4 w-4" />
            Incentive Report
          </span>
        </div>

        <Table
          columns={columns}
          rows={rows}
          emptyState={<EmptyState title="No records yet." />}
        />
      </Card>
    </PageContainer>
  );
}
