import type { ExecutiveMetric } from '@/types/admin';

/**
 * A headline metric with a glow pool and an eight-point sparkline.
 *
 * Server component — nothing here reacts to input, so none of it ships as
 * JavaScript.
 *
 * Colour comes from `data-tone` and is resolved in admin.css rather than passed
 * as an inline style. See the note on `.adm-unit[data-status]` for why: inline
 * values that reference a custom property did not reliably re-resolve when
 * React changed them.
 *
 * The delta is never colour-only — it carries an arrow glyph and a signed
 * number, so "down 3.1%" survives a monochrome display and a red/green colour
 * deficiency alike.
 */

/** Builds an SVG polyline from normalised 0–1 samples. */
function sparkPoints(trend: number[], width = 100, height = 28): string {
  if (trend.length < 2) return '';
  const step = width / (trend.length - 1);
  return trend
    .map((value, index) => {
      const clamped = Math.min(1, Math.max(0, value));
      // SVG y grows downward, so a high sample has to sit near the top.
      return `${(index * step).toFixed(2)},${((1 - clamped) * height).toFixed(2)}`;
    })
    .join(' ');
}

export function StatCard({ metric }: { metric: ExecutiveMetric }) {
  const { deltaPct, riseIsGood } = metric;
  const rising = deltaPct !== null && deltaPct > 0;
  const good = deltaPct === null ? true : rising === riseIsGood;

  return (
    <article className="adm-glass adm-stat adm-enter" data-tone={metric.tone}>
      <h3 className="adm-label">{metric.label}</h3>

      <div className="mt-3 flex items-end justify-between gap-4">
        <p className="adm-figure">{metric.value}</p>

        <svg
          viewBox="0 0 100 28"
          width="100"
          height="28"
          aria-hidden="true"
          focusable="false"
          className="adm-spark shrink-0 opacity-70"
          preserveAspectRatio="none"
        >
          <polyline
            points={sparkPoints(metric.trend)}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-xs text-[var(--adm-dim)]">{metric.caption}</p>

        {deltaPct !== null ? (
          <p className="adm-delta text-xs" data-good={good}>
            {/* Glyph, sign and number: three signals, only one of them colour. */}
            <span aria-hidden="true">{rising ? '▲' : '▼'}</span> {deltaPct > 0 ? '+' : ''}
            {deltaPct.toFixed(1)}%
            <span className="sr-only">
              {' '}
              {rising ? 'up' : 'down'} on the previous period, which is {good ? 'good' : 'bad'}
            </span>
          </p>
        ) : null}
      </div>
    </article>
  );
}

export function StatGrid({ metrics }: { metrics: ExecutiveMetric[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <StatCard key={metric.id} metric={metric} />
      ))}
    </div>
  );
}
