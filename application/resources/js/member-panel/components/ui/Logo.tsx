type LogoProps = {
  href?: string;
  className?: string;
  imgClassName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  alt?: string;
};

const sizeClass: Record<NonNullable<LogoProps['size']>, string> = {
  sm: 'h-8 w-auto',
  md: 'h-10 w-auto',
  lg: 'h-12 w-auto',
  xl: 'h-16 w-auto sm:h-20',
};

function resolveLogoSrc(): string {
  try {
    const boot = window.__QUANTARA_BOOT__;
    if (boot?.assetsUrl) {
      return `${String(boot.assetsUrl).replace(/\/$/, '')}/logo/quantara-logo.png`;
    }
    const base = document.getElementById('basePath') as HTMLInputElement | null;
    if (base?.value) {
      return `${base.value.replace(/\/$/, '')}/assets/logo/quantara-logo.png`;
    }
  } catch {
    // ignore
  }
  return '/assets/logo/quantara-logo.png';
}

/** Canonical Quantara brand mark — /assets/logo/quantara-logo.png */
export function Logo({
  href,
  className = '',
  imgClassName = '',
  size = 'md',
  alt = 'Quantara',
}: LogoProps) {
  const image = (
    <img
      src={resolveLogoSrc()}
      alt={alt}
      className={`object-contain ${sizeClass[size]} ${imgClassName}`}
      loading="eager"
      decoding="async"
    />
  );

  if (href) {
    return (
      <a
        href={href}
        className={`inline-flex items-center transition-opacity duration-300 hover:opacity-90 ${className}`}
        aria-label={alt}
      >
        {image}
      </a>
    );
  }

  return <span className={`inline-flex items-center ${className}`}>{image}</span>;
}

/** @deprecated Use resolve via Logo; kept for any legacy imports */
export const QUANTARA_LOGO_SRC = '/assets/logo/quantara-logo.png';
