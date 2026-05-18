/**
 * JourneyMap — SVG map showing user location → data center with
 * energy and water source satellites on each side.
 *
 * Phase 2A-3: renders at the top of WaterTrace, between the section
 * header and "THE DATA PATH" heading.
 */

const VIEWBOX_W = 680;
const VIEWBOX_H = 460;

// Pin positions (left cluster = user, right cluster = DC)
const USER_CX = 155;
const DC_CX = 525;
const MAIN_CY = 220;
const MAIN_R = 52;
const SAT_R = 28;
const SAT_OFFSET_X = 90;
const SAT_ENERGY_CY = 110;
const SAT_WATER_CY = 350;

// Arc path from user to DC (curves upward)
const ARC_PATH = `M ${USER_CX + MAIN_R} ${MAIN_CY} Q ${(USER_CX + DC_CX) / 2} 10 ${DC_CX - MAIN_R} ${MAIN_CY}`;
const PILL_X = (USER_CX + DC_CX) / 2;
const PILL_Y = 46;

function SatellitePin({ cx, cy, emoji, bgColor, borderColor }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={SAT_R} fill={bgColor} stroke={borderColor} strokeWidth={1.5} />
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="central" fontSize="20">{emoji}</text>
    </g>
  );
}

function ConnectorLine({ x1, y1, x2, y2 }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#D1D5DB" strokeWidth={0.5} />;
}

/**
 * Props:
 *   activityEmoji    — emoji for user's activity (from activityEmojiMap)
 *   activityName     — human-readable activity name
 *   userCity         — e.g. "San Antonio, TX"
 *   userUtility      — e.g. "CPS Energy"
 *   userWatershed    — e.g. "Edwards Aquifer"
 *   userDroughtLabel — e.g. "severe drought"
 *   dcLabel          — e.g. "Data center · AWS us-east-1"
 *   dcCity           — e.g. "Ashburn, VA"
 *   dcUtility        — e.g. "Dominion Energy"
 *   dcWaterUtility   — e.g. "Loudoun Water"
 *   dcWatershed      — e.g. "Potomac River"
 *   dcDroughtLabel   — e.g. "abnormally dry"
 *   distanceMi       — number, e.g. 1510
 */
export default function JourneyMap({
  activityEmoji = '⚡',
  activityName = 'activity',
  userCity = '',
  userUtility = '',
  userWatershed = '',
  userDroughtLabel = '',
  dcLabel = 'Data center',
  dcTypeLabel = 'Data center',
  dcCity = '',
  dcUtility = '',
  dcWaterUtility = '',
  dcWatershed = '',
  dcDroughtLabel = '',
  distanceMi = 0,
}) {
  const distanceStr = distanceMi.toLocaleString();

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] text-gray-600 leading-snug">
          Your <strong className="text-gray-800">{activityName}</strong> travels{' '}
          <strong className="text-gray-800">{distanceStr} mi</strong> from home to data center
        </p>
        <span className="text-[9px] text-gray-400 flex-shrink-0 whitespace-nowrap">
          Stylized · not to scale
        </span>
      </div>

      {/* SVG Map */}
      <svg
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
        className="w-full"
        style={{ maxHeight: 460 }}
        role="img"
        aria-label={`Map showing data traveling ${distanceStr} miles from ${userCity} to ${dcCity}`}
      >
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
            <path d="M0,0 L10,3.5 L0,7" fill="#378ADD" />
          </marker>
        </defs>

        {/* Dashed arc connecting user → DC */}
        <path
          d={ARC_PATH}
          fill="none"
          stroke="#378ADD"
          strokeWidth={1.5}
          strokeDasharray="6 4"
          markerEnd="url(#arrowhead)"
        />

        {/* Distance pill at arc apex */}
        <rect x={PILL_X - 42} y={PILL_Y - 15} width={84} height={30} rx={15} fill="#378ADD" />
        <text x={PILL_X} y={PILL_Y + 1} textAnchor="middle" dominantBaseline="central" fill="white" fontSize="14" fontWeight="600">
          {distanceStr} mi
        </text>

        {/* ─── USER CLUSTER (left) ─── */}
        {/* Connectors from main pin edge to satellite edge */}
        <ConnectorLine x1={USER_CX - 20} y1={MAIN_CY - 48} x2={USER_CX - SAT_OFFSET_X} y2={SAT_ENERGY_CY + SAT_R} />
        <ConnectorLine x1={USER_CX - 20} y1={MAIN_CY + 48} x2={USER_CX - SAT_OFFSET_X} y2={SAT_WATER_CY - SAT_R} />

        {/* Energy satellite */}
        <SatellitePin cx={USER_CX - SAT_OFFSET_X} cy={SAT_ENERGY_CY} emoji="⚡" bgColor="#FAEEDA" borderColor="#BA7517" />
        <text x={USER_CX - SAT_OFFSET_X} y={SAT_ENERGY_CY - 36} textAnchor="middle" fill="#BA7517" fontSize="13" fontWeight="500">
          {userUtility}
        </text>

        {/* Water satellite */}
        <SatellitePin cx={USER_CX - SAT_OFFSET_X} cy={SAT_WATER_CY} emoji="💧" bgColor="#E6F1FB" borderColor="#185FA5" />
        <text x={USER_CX - SAT_OFFSET_X} y={SAT_WATER_CY + 40} textAnchor="middle" fill="#185FA5" fontSize="13" fontWeight="500">
          {userWatershed}
        </text>
        {userDroughtLabel && (
          <text x={USER_CX - SAT_OFFSET_X} y={SAT_WATER_CY + 56} textAnchor="middle" fill="#92400E" fontSize="11">
            {userDroughtLabel}
          </text>
        )}

        {/* Main user pin */}
        <circle cx={USER_CX} cy={MAIN_CY} r={MAIN_R} fill="white" stroke="#378ADD" strokeWidth={2.5} />
        <text x={USER_CX} y={MAIN_CY + 2} textAnchor="middle" dominantBaseline="central" fontSize="32">{activityEmoji}</text>

        {/* User labels */}
        <text x={USER_CX} y={MAIN_CY + 66} textAnchor="middle" fill="#9CA3AF" fontSize="11" fontWeight="600" letterSpacing="0.3">
          YOUR LOCATION
        </text>
        <text x={USER_CX} y={MAIN_CY + 82} textAnchor="middle" fill="#1F2937" fontSize="16" fontWeight="600">
          {userCity.split(',')[0]}
        </text>
        <text x={USER_CX} y={MAIN_CY + 98} textAnchor="middle" fill="#6B7280" fontSize="14">
          {userCity.includes(',') ? userCity.split(',').slice(1).join(',').trim() : ''}
        </text>

        {/* ─── DC CLUSTER (right) ─── */}
        {/* Connectors from main pin edge to satellite edge */}
        <ConnectorLine x1={DC_CX + 20} y1={MAIN_CY - 48} x2={DC_CX + SAT_OFFSET_X} y2={SAT_ENERGY_CY + SAT_R} />
        <ConnectorLine x1={DC_CX + 20} y1={MAIN_CY + 48} x2={DC_CX + SAT_OFFSET_X} y2={SAT_WATER_CY - SAT_R} />

        {/* Energy satellite */}
        <SatellitePin cx={DC_CX + SAT_OFFSET_X} cy={SAT_ENERGY_CY} emoji="⚡" bgColor="#FAEEDA" borderColor="#BA7517" />
        <text x={DC_CX + SAT_OFFSET_X} y={SAT_ENERGY_CY - 36} textAnchor="middle" fill="#BA7517" fontSize="13" fontWeight="500">
          {dcUtility}
        </text>

        {/* Water satellite */}
        <SatellitePin cx={DC_CX + SAT_OFFSET_X} cy={SAT_WATER_CY} emoji="💧" bgColor="#E6F1FB" borderColor="#185FA5" />
        <text x={DC_CX + SAT_OFFSET_X} y={SAT_WATER_CY + 40} textAnchor="middle" fill="#185FA5" fontSize="13" fontWeight="500">
          {dcWatershed}
        </text>
        {dcDroughtLabel && (
          <text x={DC_CX + SAT_OFFSET_X} y={SAT_WATER_CY + 56} textAnchor="middle" fill="#92400E" fontSize="11">
            {dcDroughtLabel}
          </text>
        )}

        {/* Main DC pin */}
        <circle cx={DC_CX} cy={MAIN_CY} r={MAIN_R} fill="white" stroke="#378ADD" strokeWidth={2.5} />
        <text x={DC_CX} y={MAIN_CY + 2} textAnchor="middle" dominantBaseline="central" fontSize="32">🏢</text>

        {/* DC labels */}
        <text x={DC_CX} y={MAIN_CY + 66} textAnchor="middle" fill="#9CA3AF" fontSize="11" fontWeight="600" letterSpacing="0.3">
          {dcTypeLabel.toUpperCase()}
        </text>
        <text x={DC_CX} y={MAIN_CY + 82} textAnchor="middle" fill="#1F2937" fontSize="16" fontWeight="600">
          {dcCity.split(',')[0]}
        </text>
        <text x={DC_CX} y={MAIN_CY + 98} textAnchor="middle" fill="#6B7280" fontSize="14">
          {dcCity.includes(',') ? dcCity.split(',').slice(1).join(',').trim() : ''}
        </text>
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 justify-center">
        <span className="flex items-center gap-1 text-[10px] text-gray-400">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-200 border border-amber-500" />
          Energy source
        </span>
        <span className="flex items-center gap-1 text-[10px] text-gray-400">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-100 border border-blue-600" />
          Water source
        </span>
        <span className="flex items-center gap-1 text-[10px] text-gray-400">
          <svg className="w-4 h-1.5" viewBox="0 0 16 6">
            <line x1="0" y1="3" x2="16" y2="3" stroke="#378ADD" strokeWidth="1.5" strokeDasharray="3 2" />
          </svg>
          Data flow
        </span>
      </div>
    </div>
  );
}
