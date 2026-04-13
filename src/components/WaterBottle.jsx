export default function WaterBottle({ currentMl = 0, maxMl = 500 }) {
  const pct = Math.min(Math.max(currentMl / maxMl, 0), 1);
  const displayMl = Math.round(currentMl * 10) / 10;
  const isFull = pct >= 1;

  const BLUE = '#2c6bdb';
  const LIGHT_BLUE = '#dbeafe';
  const WAVE_BLUE = '#4a8af0';

  // Bottle dimensions
  const bodyH = 120;
  const neckH = 20;
  const w = 48;
  const neckW = 24;
  const svgW = w + 8;
  const svgH = bodyH + neckH + 8;

  // Always show at least a sliver of light blue (5% min)
  const minPct = 0.05;
  const effectivePct = Math.max(pct, minPct);
  const fillH = bodyH * effectivePct;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={svgW}
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="drop-shadow-sm"
      >
        {/* Neck */}
        <rect
          x={(svgW - neckW) / 2}
          y={2}
          width={neckW}
          height={neckH}
          rx={3}
          fill="white"
          stroke="#d1d5db"
          strokeWidth={1.5}
        />

        {/* Body outline */}
        <rect
          x={4}
          y={neckH + 2}
          width={w}
          height={bodyH}
          rx={6}
          fill="white"
          stroke="#d1d5db"
          strokeWidth={1.5}
        />

        {/* Water fill — clipped to body */}
        <defs>
          <clipPath id="bottle-body">
            <rect
              x={5}
              y={neckH + 3}
              width={w - 2}
              height={bodyH - 2}
              rx={5}
            />
          </clipPath>
        </defs>

        <g clipPath="url(#bottle-body)">
          {/* Main fill */}
          <rect
            x={5}
            y={neckH + 3 + (bodyH - 2 - fillH)}
            width={w - 2}
            height={fillH}
            fill={pct <= minPct ? LIGHT_BLUE : BLUE}
            className="transition-all duration-1000 ease-out"
          />

          {/* Wave at top of water */}
          {effectivePct > 0.06 && effectivePct < 1 && (
            <ellipse
              cx={svgW / 2}
              cy={neckH + 3 + (bodyH - 2 - fillH)}
              rx={(w - 2) / 2}
              ry={3}
              fill={pct <= minPct ? '#bfdbfe' : WAVE_BLUE}
              opacity={0.5}
              className="animate-pulse"
            />
          )}

          {/* Measurement notches */}
          {[0.25, 0.5, 0.75].map(mark => (
            <line
              key={mark}
              x1={w - 4}
              y1={neckH + 3 + (bodyH - 2) * (1 - mark)}
              x2={w + 2}
              y2={neckH + 3 + (bodyH - 2) * (1 - mark)}
              stroke="#d1d5db"
              strokeWidth={1}
            />
          ))}
        </g>

        {/* Fill into neck when nearly full */}
        {pct > 0.95 && (
          <rect
            x={(svgW - neckW) / 2 + 1}
            y={neckH + 2 - Math.min((pct - 0.95) * 20 * neckH, neckH - 2)}
            width={neckW - 2}
            height={Math.min((pct - 0.95) * 20 * neckH, neckH - 2)}
            rx={2}
            fill={BLUE}
            opacity={0.8}
          />
        )}
      </svg>

      {/* Numeric display */}
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-700 tabular-nums">
          {displayMl < 1 ? '<1' : Math.round(displayMl)} mL
          <span className="text-gray-400 font-normal"> / {maxMl} mL</span>
        </p>
        {isFull ? (
          <p className="text-[10px] text-mw-water font-medium mt-0.5">
            Usage is done for today
          </p>
        ) : (
          <p className="text-[10px] text-gray-400 mt-0.5">
            Water used by today's queries
          </p>
        )}
      </div>
    </div>
  );
}
