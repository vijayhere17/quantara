type AvatarProps = {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeMap = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
};

export function Avatar({
  src,
  alt = '',
  fallback = '🟡',
  size = 'md',
  className = '',
}: AvatarProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-q-cyan/45 bg-[#1a1d2e] shadow-[0_0_12px_rgba(0,212,255,0.2)] ${sizeMap[size]} ${className}`}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.parentElement!.textContent = fallback;
          }}
        />
      ) : (
        fallback
      )}
    </span>
  );
}
