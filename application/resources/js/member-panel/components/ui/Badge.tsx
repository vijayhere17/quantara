type BadgeProps = {
  children: React.ReactNode;
  tone?: 'cyan' | 'teal' | 'purple' | 'muted';
  className?: string;
};

const toneMap: Record<NonNullable<BadgeProps['tone']>, string> = {
  cyan: 'bg-cyan-400/10 text-q-cyan border border-cyan-400/20',
  teal: 'bg-teal-400/10 text-q-teal border border-teal-400/20',
  purple: 'bg-purple-400/10 text-purple-300 border border-purple-400/20',
  muted: 'bg-white/5 text-q-soft border border-white/10',
};

export function Badge({ children, tone = 'cyan', className = '' }: BadgeProps) {
  return <span className={`q-badge ${toneMap[tone]} ${className}`}>{children}</span>;
}
