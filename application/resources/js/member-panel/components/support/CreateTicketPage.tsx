import { Send } from 'lucide-react';
import { useState } from 'react';
import { Card } from '../ui/Card';
import { GradientButton } from '../ui/GradientButton';
import { Input } from '../ui/Input';
import { PageContainer } from '../ui/PageContainer';
import { PageHeader } from '../ui/PageHeader';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import type { SupportTicketBoot } from '../../types';

type CreateTicketPageProps = {
  data: SupportTicketBoot;
};

const ticketTypes = [
  { label: 'Select Ticket Type', value: '' },
  { label: 'General Help', value: 'General Help' },
  { label: 'Profile Update', value: 'Profile Update' },
  { label: 'Topup ID', value: 'Topup ID' },
  { label: 'Reward Achievement', value: 'Reward Achievement' },
  { label: 'Withdrawal', value: 'Withdrawal' },
  { label: 'Others', value: 'Others' },
];

export function CreateTicketPage({ data }: CreateTicketPageProps) {
  const [ticketType, setTicketType] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    // UI only — no API/backend calls.
    setSubmitted(true);
    window.setTimeout(() => setSubmitted(false), 2200);
  };

  return (
    <PageContainer maxWidth="narrow">
      <PageHeader
        title="Create Ticket"
        crumbs={[
          { label: 'Dashboard', href: data.links.dashboard },
          { label: '24/7 Support' },
          { label: 'Create Ticket' },
        ]}
      />

      <Card
        hover={false}
        className="mx-auto w-full max-w-[720px] border-q-cyan/25 p-6 shadow-[0_0_0_1px_rgba(0,217,255,0.10),0_0_40px_rgba(124,58,237,0.08)] sm:p-8"
      >
        <div className="mb-7 flex items-start gap-3">
          <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-q-muted">
            <span className="text-lg leading-none">◎</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white sm:text-2xl">Create Ticket</h2>
            <p className="mt-1 text-sm text-q-muted">
              Our team replies within 24 hours on the BNB network.
            </p>
          </div>
        </div>

        {submitted ? (
          <div className="mb-5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300 animate-fade-in">
            Ticket captured locally. Backend wiring is unchanged.
          </div>
        ) : null}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <Select
            id="ticket-type"
            label="Ticket Type"
            value={ticketType}
            onChange={setTicketType}
            options={ticketTypes}
          />

          <Input
            label="Title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short summary"
          />

          <Textarea
            label="Message"
            name="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your issue in detail..."
          />

          <GradientButton
            type="submit"
            fullWidth
            className="!mt-6 !rounded-full !py-3.5 !text-base !font-bold !text-[#041018]"
          >
            <Send className="h-4 w-4" />
            Submit Ticket
          </GradientButton>
        </form>
      </Card>
    </PageContainer>
  );
}
