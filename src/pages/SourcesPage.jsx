import { useState, useEffect } from 'react';
import { getReferenceData, getPowerSourceWaterPerKwh } from '../data/referenceDataClient';
import PageLayout from '../components/PageLayout';
import { trackEvent } from '../lib/stats';

const CATEGORY_LABELS = {
  power_sources: 'Power Sources',
  cooling_methods: 'Cooling Methods',
  regional_wue: 'Regional WUE',
  activity_energy: 'Activity Energy',
  other: 'Other',
};

const VISIBILITY_BADGE = {
  cited: { label: 'Cited', color: 'bg-green-100 text-green-700 border-green-200' },
  attributed: { label: 'Attributed', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
};

function SourceCard({ dataset }) {
  const [open, setOpen] = useState(false);
  const vis = VISIBILITY_BADGE[dataset.visibility] || VISIBILITY_BADGE.cited;
  const waterPerKwh = getPowerSourceWaterPerKwh(dataset);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 cursor-pointer"
      >
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${vis.color}`}>
          {vis.label}
        </span>
        <span className="text-sm text-gray-700 flex-1 truncate">{dataset.name}</span>
        {waterPerKwh != null && (
          <span className="text-[11px] text-gray-400 tabular-nums flex-shrink-0">{waterPerKwh} L/kWh</span>
        )}
        <span className={`text-lg flex-shrink-0 transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      {open && (
        <div className="px-4 pb-3 bg-gray-50 text-xs space-y-1.5">
          {dataset.source_citation && (
            <p className="text-gray-700 italic">{dataset.source_citation}</p>
          )}
          {dataset.source_url && (
            <p className="truncate">
              <a href={dataset.source_url} target="_blank" rel="noopener noreferrer" className="text-mw-water hover:underline break-all">
                {dataset.source_url}
              </a>
            </p>
          )}
          {dataset.year && <p className="text-gray-400">Year: {dataset.year}</p>}
          {dataset.source_type && (
            <p className="text-gray-400">Source type: {dataset.source_type.replace(/_/g, ' ')}</p>
          )}
          {Array.isArray(dataset.data) && dataset.data.length > 0 && (
            <details className="mt-1">
              <summary className="cursor-pointer text-gray-400 hover:text-gray-600">View data</summary>
              <pre className="mt-1 p-2 bg-white rounded-lg border border-gray-200 text-[10px] text-gray-600 overflow-x-auto max-h-32 overflow-y-auto font-mono">
{JSON.stringify(dataset.data, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

export default function SourcesPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { trackEvent('page_view', 'sources'); }, []);

  useEffect(() => {
    getReferenceData()
      .then(d => setData(d))
      .finally(() => setLoading(false));
  }, []);

  const categories = data
    ? Object.entries(CATEGORY_LABELS)
        .map(([key, label]) => ({
          key,
          label,
          datasets: data[key] || [],
        }))
        .filter(c => c.datasets.length > 0)
    : [];

  const totalDatasets = categories.reduce((sum, c) => sum + c.datasets.length, 0);

  // Canonical URLs for the Additional Sources section
  const SOURCE_URLS = {
    ren_2023: 'https://arxiv.org/abs/2304.03271',
    iea_2020: 'https://www.iea.org/commentaries/the-carbon-footprint-of-streaming-video-fact-checking-the-headlines',
    lbnl_2024: 'https://eta-publications.lbl.gov/sites/default/files/2024-12/lbnl-2024-united-states-data-center-energy-usage-report_1.pdf',
    greenspector_2023: 'https://greenspector.com/en/what-is-the-environmental-footprint-of-social-networking-applications-2023/',
    macknick_2012: 'https://docs.nrel.gov/docs/fy11osti/50900.pdf',
    ut_compass_2025: 'https://compass.beg.utexas.edu/assets/publications/Water_Requirements_for_DC_White_Paper.pdf',
    eia_crypto_2024: 'https://www.eia.gov/todayinenergy/detail.php?id=61364',
    amazon_2024: 'https://sustainability.aboutamazon.com/2024-amazon-sustainability-report.pdf',
    uptime_tiers: 'https://www.coresite.com/blog/breaking-down-data-center-tiers-classifications',
    google_env_2025: 'https://sustainability.google/reports/google-2025-environmental-report/',
    eesi_2023: 'https://www.eesi.org/papers/view/fact-sheet-energy-and-water',
  };

  function SourceLink({ id, children }) {
    const url = SOURCE_URLS[id];
    if (!url) return <>{children}</>;
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-mw-water hover:underline inline-flex items-center gap-1">
        {children}
        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    );
  }

  return (
    <PageLayout>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-mw-base tracking-tight mb-2">Our Data Sources</h1>
          <p className="text-sm text-gray-500 leading-relaxed max-w-xl">
            Every number in the calculator traces back to a published source. Below are the {totalDatasets > 0 ? totalDatasets : ''} reference
            datasets currently feeding the calculator, organized by category. Each entry links to
            its original source so you can verify the numbers yourself.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Only <strong>cited</strong> (public link) and <strong>attributed</strong> (named private source) datasets are shown.
            Draft entries with incomplete citations are excluded from both this page and all public calculations.
          </p>
        </div>

        {loading && <p className="text-sm text-gray-400">Loading reference data...</p>}

        {!loading && categories.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-sm text-gray-500 mb-2">No reference datasets available yet.</p>
            <p className="text-xs text-gray-400">The calculator is using hardcoded baseline values. Reference data will appear here as it is added through the admin ingestion pipeline.</p>
          </div>
        )}

        {categories.map(cat => (
          <div key={cat.key}>
            <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wider mb-3">
              {cat.label}
              <span className="ml-2 text-gray-400 font-normal normal-case">({cat.datasets.length})</span>
            </h2>
            <div className="space-y-1.5">
              {cat.datasets.map(ds => (
                <SourceCard key={ds.id} dataset={ds} />
              ))}
            </div>
          </div>
        ))}

        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wider mb-3">Additional Sources</h2>
          <p className="text-xs text-gray-500 leading-relaxed mb-3">
            Beyond the reference datasets above, the calculator draws on these published studies and reports for activity-level energy data:
          </p>
          <ul className="text-xs text-gray-600 space-y-2 list-none">
            <li className="bg-white border border-gray-200 rounded-lg p-3">
              <strong>Ren, S. et al.</strong>{' '}
              <SourceLink id="ren_2023">"Making AI Less Thirsty: Uncovering and Addressing the Secret Water Footprint of AI Models."</SourceLink>{' '}
              University of California Riverside, 2023.
            </li>
            <li className="bg-white border border-gray-200 rounded-lg p-3">
              <strong>International Energy Agency (IEA).</strong>{' '}
              <SourceLink id="iea_2020">"The Carbon Footprint of Streaming Video: Fact-Checking the Headlines."</SourceLink>{' '}
              2020.
            </li>
            <li className="bg-white border border-gray-200 rounded-lg p-3">
              <strong>Shehabi, A. et al.</strong>{' '}
              <SourceLink id="lbnl_2024">"United States Data Center Energy Usage Report."</SourceLink>{' '}
              Lawrence Berkeley National Laboratory, 2024.
            </li>
            <li className="bg-white border border-gray-200 rounded-lg p-3">
              <strong>Greenspector.</strong>{' '}
              <SourceLink id="greenspector_2023">"Environmental Impact of Social Media Apps."</SourceLink>{' '}
              2023.
            </li>
            <li className="bg-white border border-gray-200 rounded-lg p-3">
              <strong>Macknick, J. et al.</strong>{' '}
              <SourceLink id="macknick_2012">"Operational Water Consumption and Withdrawal Factors for Electricity Generating Technologies."</SourceLink>{' '}
              NREL/TP-6A20-50900, 2012.
            </li>
            <li className="bg-white border border-gray-200 rounded-lg p-3">
              <strong>University of Texas at Austin.</strong>{' '}
              <SourceLink id="ut_compass_2025">"COMPASS: A Model for COst and Metrics of Power And Storage Systems."</SourceLink>{' '}
              UT Energy Institute, 2025.
            </li>
            <li className="bg-white border border-gray-200 rounded-lg p-3">
              <strong>U.S. Energy Information Administration (EIA).</strong>{' '}
              <SourceLink id="eia_crypto_2024">"Cryptocurrency Mining and the U.S. Electric Grid."</SourceLink>{' '}
              2024.
            </li>
            <li className="bg-white border border-gray-200 rounded-lg p-3">
              <strong>Amazon.</strong>{' '}
              <SourceLink id="amazon_2024">"Amazon Sustainability Report 2024 — Water Stewardship."</SourceLink>{' '}
              Covering 2023 performance: 53% progress toward 2030 water-positive pledge (4.3 billion liters replenished).
            </li>
            <li className="bg-white border border-gray-200 rounded-lg p-3">
              <strong>Uptime Institute.</strong>{' '}
              <SourceLink id="uptime_tiers">"Tier Standard: Topology — Tier I through IV."</SourceLink>{' '}
              Industry standard for data center redundancy and availability classification.
            </li>
            <li className="bg-white border border-gray-200 rounded-lg p-3">
              <strong>Google.</strong>{' '}
              <SourceLink id="google_env_2025">"Google 2025 Environmental Report."</SourceLink>{' '}
              Gemini energy-per-query data and sustainability reporting, 2025.
            </li>
            <li className="bg-white border border-gray-200 rounded-lg p-3">
              <strong>Environmental and Energy Study Institute (EESI).</strong>{' '}
              <SourceLink id="eesi_2023">"Energy and Water Use in the U.S. Electric Grid."</SourceLink>{' '}
              Analysis of LBNL and EIA data. National average: 4.54 L/kWh grid water consumption, 2023.
            </li>
          </ul>
        </div>
      </div>
    </PageLayout>
  );
}
