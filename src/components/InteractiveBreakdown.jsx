import { useState } from 'react';
import { DEVICES, REGIONS } from '../data/recalculate';
import { lookupZipRegion, isValidUSZip, REGION_CONTEXT } from '../data/zipRegions';
import { getServiceRouting, getLocationRelevanceLabel } from '../data/serviceRouting';

function NumberInput({ label, value, onChange, unit, min = 0, step = 0.1 }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-gray-500 min-w-[100px]">{label}</label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        min={min}
        step={step}
        className="w-24 px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-mw-water focus:ring-1 focus:ring-mw-water/30 tabular-nums"
      />
      {unit && <span className="text-xs text-gray-400">{unit}</span>}
    </div>
  );
}

// Group regions by continent for cleaner dropdown
const REGION_GROUPS = [
  { label: 'Global', keys: ['industry_average'] },
  { label: 'North America', keys: ['us_northeast', 'us_virginia', 'us_southeast', 'us_chicago', 'us_iowa', 'us_texas_san_antonio', 'us_southwest_arizona', 'us_oregon', 'us_california', 'canada', 'mexico'] },
  { label: 'South America', keys: ['brazil', 'chile'] },
  { label: 'Europe', keys: ['nordics', 'ireland', 'netherlands', 'germany', 'uk', 'southern_europe'] },
  { label: 'Middle East & Africa', keys: ['middle_east_uae', 'israel', 'north_africa', 'west_africa', 'south_africa'] },
  { label: 'Asia', keys: ['india_mumbai', 'singapore', 'southeast_asia', 'china_east', 'china_west', 'japan', 'south_korea'] },
  { label: 'Oceania', keys: ['australia', 'new_zealand'] },
];

export default function InteractiveBreakdown({
  params,
  onParamChange,
  calculatedResult,
  originalData,
  confidenceData,
  activityId,
  highlightedField = null,
}) {
  const [zipCode, setZipCode] = useState('');
  const [zipResult, setZipResult] = useState(null);

  const deviceOptions = Object.entries(DEVICES)
    .filter(([key]) => key !== 'custom')
    .map(([key, d]) => ({ value: key, label: d.label }));
  deviceOptions.push({ value: 'custom', label: 'Other (enter watts)' });

  // Handle zip code input
  function handleZipChange(value) {
    setZipCode(value);

    if (isValidUSZip(value)) {
      const result = lookupZipRegion(value);
      if (result) {
        setZipResult(result);
        onParamChange({ region_key: result.region_key });
      } else {
        setZipResult(null);
      }
    } else {
      setZipResult(null);
    }
  }

  // Get routing context for this activity
  const routing = activityId ? getServiceRouting(activityId) : null;
  const locationRelevance = activityId ? getLocationRelevanceLabel(activityId) : null;

  return (
    <div className="space-y-4">
      {/* Interactive note */}
      <p className="text-xs text-mw-water bg-mw-water-light/50 rounded-lg px-3 py-2">
        Adjust the values below to match your setup. The estimate updates instantly — no additional water used.
      </p>

      {/* Editable parameters */}
      <div className="space-y-2.5">
        <NumberInput
          label="Duration"
          value={params.duration}
          onChange={v => onParamChange({ duration: v, duration_hours: v })}
          unit={params.duration_unit || 'hours'}
          min={0}
          step={0.5}
        />
        <NumberInput
          label="Activity energy"
          value={params.activity_kwh}
          onChange={v => onParamChange({ activity_kwh: v })}
          unit="kWh/unit"
          min={0}
          step={0.001}
        />

        {/* Device selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 min-w-[100px]">Device</label>
          <select
            data-focus-target="device"
            value={params.device_key}
            onChange={e => onParamChange({ device_key: e.target.value })}
            className={`flex-1 px-2 py-1 text-sm border rounded-lg focus:outline-none focus:border-mw-water focus:ring-1 focus:ring-mw-water/30 bg-white transition-all ${
              highlightedField === 'device'
                ? 'border-mw-water ring-2 ring-mw-water/40'
                : 'border-gray-200'
            }`}
          >
            {deviceOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Custom device wattage input */}
        {params.device_key === 'custom' && (
          <NumberInput
            label="Device watts"
            value={params.custom_device_watts || 0}
            onChange={v => onParamChange({ custom_device_watts: v })}
            unit="W"
            min={0}
            step={5}
          />
        )}

        {/* Zip code input */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 min-w-[100px]">US zip code</label>
          <input
            type="text"
            value={zipCode}
            onChange={e => handleZipChange(e.target.value)}
            placeholder="Optional — e.g. 90210"
            maxLength={10}
            className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-mw-water focus:ring-1 focus:ring-mw-water/30 bg-white placeholder:text-gray-300"
          />
        </div>

        {/* Zip code result note */}
        {zipResult && (
          <div className="ml-[108px] text-[11px] text-gray-500 bg-mw-water-light/30 rounded-lg px-2.5 py-2 space-y-1">
            <p className="font-medium text-gray-600">
              Matched to: {REGIONS[zipResult.region_key]?.label || zipResult.region_key}
            </p>
            {zipResult.context?.reason && (
              <p>{zipResult.context.reason}</p>
            )}
            <p className="text-gray-400 italic">
              This is an approximation. The actual data center depends on the service — see routing info below.
            </p>
          </div>
        )}

        {/* Region selector grouped by continent */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 min-w-[100px]">Region</label>
          <select
            data-focus-target="region"
            value={params.region_key}
            onChange={e => {
              onParamChange({ region_key: e.target.value });
              // Clear zip if user manually selects a region
              if (zipCode) {
                setZipCode('');
                setZipResult(null);
              }
            }}
            className={`flex-1 px-2 py-1 text-sm border rounded-lg focus:outline-none focus:border-mw-water focus:ring-1 focus:ring-mw-water/30 bg-white transition-all ${
              highlightedField === 'region'
                ? 'border-mw-water ring-2 ring-mw-water/40'
                : 'border-gray-200'
            }`}
          >
            {REGION_GROUPS.map(group => (
              <optgroup key={group.label} label={group.label}>
                {group.keys.filter(k => REGIONS[k]).map(key => (
                  <option key={key} value={key}>
                    {REGIONS[key].label}{REGIONS[key].estimated ? ' *' : ''}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Estimated region note */}
        {calculatedResult.region_estimated && (
          <p className="text-[10px] text-gray-400 ml-[108px]">
            * Estimated WUE based on climate and infrastructure data. Confidence is lower for estimated regions.
          </p>
        )}
      </div>

      {/* Service routing context */}
      {routing && (
        <div className="bg-gray-50 rounded-lg px-3 py-2.5 space-y-1.5">
          <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            Service routing
          </h4>
          <p className="text-xs text-gray-600 leading-relaxed">{routing.note}</p>
          {locationRelevance && (
            <p className="text-[10px] font-medium" style={{
              color: routing.location_relevance === 'high' ? '#266d46'
                : routing.location_relevance === 'medium' ? '#b8860b'
                : '#999',
            }}>
              {locationRelevance}
            </p>
          )}
        </div>
      )}

      {/* Live calculation chain */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Calculation chain (live)
        </h4>
        <div className="space-y-1 text-sm text-gray-600 font-mono bg-gray-50 rounded-lg p-3">
          <p>Activity energy: {calculatedResult.base_kwh.toFixed(4)} kWh</p>
          <p>Device energy: {calculatedResult.device_kwh.toFixed(4)} kWh</p>
          <p>Total energy: {calculatedResult.total_kwh.toFixed(4)} kWh</p>
          <p>WUE: {calculatedResult.wue} L/kWh ({calculatedResult.region_label})</p>
          <p className="font-semibold text-mw-base">
            Water: {calculatedResult.total_kwh.toFixed(4)} kWh × {calculatedResult.wue} L/kWh × 1000 = {calculatedResult.water_ml.toFixed(1)} mL
          </p>
        </div>
      </div>

      {/* Confidence breakdown */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Confidence breakdown
        </h4>
        <div className="space-y-1">
          {Object.entries(confidenceData.confidence_factors).map(([key, factor]) => (
            <div key={key} className="flex items-center gap-2 text-sm">
              <span className={factor.met ? 'text-mw-forest' : 'text-gray-300'}>
                {factor.met ? '✓' : '○'}
              </span>
              <span className={factor.met ? 'text-gray-700' : 'text-gray-400'}>
                {factor.detail}
              </span>
              <span className="ml-auto text-xs font-mono text-gray-400">
                +{factor.points}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Sources */}
      {originalData.sources && originalData.sources.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Sources
          </h4>
          <div className="space-y-1">
            {originalData.sources.map((source, i) => (
              <p key={i} className="text-xs text-gray-500">
                {source.title} ({source.year})
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
