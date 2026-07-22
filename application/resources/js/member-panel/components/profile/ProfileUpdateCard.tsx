import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import { GradientButton } from '../ui/GradientButton';
import { Input } from '../ui/Input';
import type { ProfileBoot } from '../../types';

type ProfileUpdateCardProps = {
  data: ProfileBoot;
};

export function ProfileUpdateCard({ data }: ProfileUpdateCardProps) {
  const [editing, setEditing] = useState(true);
  const [form, setForm] = useState({
    username: data.profile.username,
    firstName: data.profile.firstName,
    lastName: data.profile.lastName,
    email: data.profile.email,
  });
  const [savedFlash, setSavedFlash] = useState(false);

  const updateField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    // UI-only: no backend/API calls per requirements.
    setSavedFlash(true);
    setEditing(false);
    window.setTimeout(() => setSavedFlash(false), 2200);
  };

  return (
    <section className="q-card relative overflow-hidden !rounded-card-lg border-q-cyan/25 p-6 shadow-[0_0_0_1px_rgba(0,212,255,0.12),0_0_40px_rgba(0,212,255,0.08)] sm:p-8 lg:p-10">
      <div
        className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-q-cyan/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-8 bottom-0 h-36 w-36 rounded-full bg-purple-500/15 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-q-cyan/15 text-q-cyan">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white sm:text-2xl">Update Your Profile Details.</h2>
            <p className="mt-1 text-sm text-q-muted">Keep your account info current.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-q-cyan/25 bg-q-cyan/10 px-4 text-sm font-semibold text-q-cyan transition-all duration-300 hover:bg-q-cyan/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q-cyan/50"
        >
          {editing ? 'Lock Fields' : 'Edit'}
        </button>
      </div>

      {savedFlash ? (
        <div className="relative z-10 mb-5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300 animate-fade-in">
          Profile details saved locally. Backend wiring is unchanged.
        </div>
      ) : null}

      <form className="relative z-10 space-y-5" onSubmit={handleSubmit}>
        <Input
          label="Username"
          name="username"
          value={form.username}
          readOnly
          disabled
          placeholder="Wallet address"
        />
        <Input
          label="Firstname"
          name="firstname"
          value={form.firstName}
          onChange={(e) => updateField('firstName', e.target.value)}
          placeholder="Enter first name"
          readOnly={!editing}
          disabled={!editing}
        />
        <Input
          label="Lastname"
          name="lastname"
          value={form.lastName}
          onChange={(e) => updateField('lastName', e.target.value)}
          placeholder="Enter last name"
          readOnly={!editing}
          disabled={!editing}
        />
        <Input
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={(e) => updateField('email', e.target.value)}
          placeholder="you@wallet.io"
          readOnly={!editing}
          disabled={!editing}
        />

        <GradientButton type="submit" fullWidth className="!mt-7 !rounded-xl !py-3.5 !text-base !font-bold !text-[#041018]">
          Submit
        </GradientButton>
      </form>
    </section>
  );
}
