type AuroraBackgroundProps = {
  className?: string;
};

export function AuroraBackground({ className = '' }: AuroraBackgroundProps) {
  return (
    <div
      className={`pointer-events-none fixed inset-0 z-0 overflow-hidden ${className}`}
      aria-hidden
    >
      <div className="absolute inset-0 bg-[#0b1020]" />

      <div className="q-aurora-blob q-aurora-blob-a absolute -left-[12%] -top-[18%] h-[52vmax] w-[52vmax] rounded-full bg-[#00d9ff]/[0.16] blur-[110px]" />
      <div className="q-aurora-blob q-aurora-blob-b absolute -right-[10%] top-[-8%] h-[46vmax] w-[46vmax] rounded-full bg-[#7c3aed]/[0.18] blur-[120px]" />
      <div className="q-aurora-blob q-aurora-blob-c absolute bottom-[-18%] left-[18%] h-[50vmax] w-[50vmax] rounded-full bg-[#3b82f6]/[0.14] blur-[130px]" />
      <div className="q-aurora-blob q-aurora-blob-d absolute bottom-[8%] right-[12%] h-[36vmax] w-[36vmax] rounded-full bg-[#6366f1]/[0.12] blur-[100px]" />

      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          background:
            'radial-gradient(circle at 20% 20%, rgba(0,217,255,0.10), transparent 34%), radial-gradient(circle at 80% 15%, rgba(124,58,237,0.12), transparent 32%), radial-gradient(circle at 55% 80%, rgba(59,130,246,0.10), transparent 40%)',
        }}
      />

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,16,32,0.25)_0%,rgba(11,16,32,0.55)_55%,rgba(11,16,32,0.85)_100%)]" />
    </div>
  );
}
