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

/** Canonical Quantara brand mark — place file at /assets/logo/quantara-logo.png */
export const QUANTARA_LOGO_SRC = 'http://localhost/btc/assets/logo/quantara-logo.png';

export function Logo({
  href,
  className = '',
  imgClassName = '',
  size = 'md',
  alt = 'Quantara',
}: LogoProps) {
  const image = (
    <img
      src={QUANTARA_LOGO_SRC}
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
