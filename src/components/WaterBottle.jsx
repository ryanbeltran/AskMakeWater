import { useMemo } from 'react';

export default function WaterBottle({ currentMl = 0, maxMl = 500 }) {
  const pct = Math.min(Math.max(currentMl / maxMl, 0), 1);
  const displayMl = Math.round(currentMl * 10) / 10;
  const isFull = pct >= 1;

  // Color shifts as bottle fills: blue → amber → red
  const fillColor = useMemo(() => {
    if (pct < 0.5) return '#2c6bdb';   // mw-water
    if (pct < 0.8) return '#f9bb4e';   // mw-solar
    return '#e54535';                    // mw-human
  }, [pct]);

  const waveColor = useMemo(() => {
    if (pct < 0.5) return '#4a8af0';
    if (pct < 0.8) return '#fcd06a';
    return '#f06050';
  }, [pct]);

  // Bottle dimensions
  const bodyH = 120;
  const neckH = 20;
  const capH = 8;
  const w = 48;
  const neckW = 24;
  const fillH = bodyH * pct;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={w + 8}
        height={bodyH + neckH + capH + 8}
        viewBox={`0 0 ${w + 8} ${bodyH + neckH + capH + 8}`}
        className="drop-shadow-sm"
      >
        {/* Cap */}
        <rect
          x={(w + 8 - neckW + 4) / 2}
          y={2}
          width={neckW + 4}
          height={capH}
          rx={3}
          fill="#94a3b8"
        />

        {/* Neck */}
        <rect
          x={(w + 8 - neckW) / 2}
          y={capH + 2}
          width={neckW}
          height={neckH}
          rx={2}
          fill="white"
          stroke="#d1d5db"
          strokeWidth={1.5}
        />

        {/* Body outline */}
        <rect
          x={4}
          y={capH + neckH + 2}
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
              y={capH + neckH + 3}
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
            y={capH + neckH + 3 + (bodyH - 2 - fillH)}
            width={w - 2}
            height={fillH}
            fill={fillColor}
            className="transition-all duration-1000 ease-out"
          />

          {/* Wave at top of water */}
          {pct > 0.02 && pct < 1 && (
            <ellipse
              cx={(w + 8) / 2}
              cy={capH + neckH + 3 + (bodyH - 2 - fillH)}
              rx={(w - 2) / 2}
              ry={3}
              fill={waveColor}
              opacity={0.6}
              className="animate-pulse"
            />
          )}

          {/* Measurement lines */}
          {[0.25, 0.5, 0.75].map(mark => (
            <line
              key={mark}
              x1={w - 4}
              y1={capH + neckH + 3 + (bodyH - 2) * (1 - mark)}
              x2={w + 2}
              y2={capH + neckH + 3 + (bodyH - 2) * (1 - mark)}
              stroke="#d1d5db"
              strokeWidth={1}
            />
          ))}
        </g>

        {/* Fill into neck when nearly full */}
        {pct > 0.95 && (
          <rect
            x={(w + 8 - neckW) / 2 + 1}
            y={capH + neckH + 2 - Math.min((pct - 0.95) * 20 * neckH, neckH - 2)}
            width={neckW - 2}
            height={Math.min((pct - 0.95) * 20 * neckH, neckH - 2)}
            rx={1}
            fill={fillColor}
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
        <p className="text-[10px] text-gray-400 mt-0.5">
          Water used by today's queries
        </p>
      </div>

      {/* Full bottle message */}
      {isFull && (
        <div className="text-center bg-mw-water-light/50 rounded-lg px-3 py-2 max-w-[200px]">
          <p className="text-[11px] text-gray-600 leading-relaxed">
            We've used our daily water bottle.
            Cached answers are still available for free.
            Fresh queries support{' '}
            <span className="font-medium text-mw-water">MakeWater's</span> mission.
          </p>
        </div>
      )}
    </div>
  );
}
