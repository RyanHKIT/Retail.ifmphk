import type { CSSProperties, ReactNode } from 'react';

type ChartPanelProps = {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** 0-based; delay = n × --duration-enter-stagger (40ms). */
  staggerIndex?: number;
};

export function ChartPanel({
  title,
  children,
  className,
  style,
  staggerIndex,
}: ChartPanelProps) {
  return (
    <div
      className={['card', 'chart-enter', className].filter(Boolean).join(' ')}
      style={{
        ...(staggerIndex != null
          ? { animationDelay: `calc(${staggerIndex} * var(--duration-enter-stagger))` }
          : undefined),
        ...style,
      }}
    >
      {title != null && title !== '' ? <div className="card-title">{title}</div> : null}
      {children}
    </div>
  );
}
