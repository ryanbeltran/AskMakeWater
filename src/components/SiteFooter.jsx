import changelog from '../data/changelog.json';

const latestVersion = changelog?.[0]?.version || 'v0.0.0';

/**
 * Shared site footer used on every public page.
 *
 * Version is auto-read from the first entry in changelog.json so the
 * footer and What's New on /about always agree.
 */
export default function SiteFooter() {
  return (
    <footer className="flex-shrink-0 border-t border-gray-100 bg-white/80 relative z-10">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        <p className="text-[11px] text-gray-400">
          A project of{' '}
          <a
            href="https://www.makewater.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-mw-water hover:underline"
          >
            MakeWater
          </a>
          {' '}501(c)(3)
          <span className="ml-2 text-gray-300">
            ·{' '}
            <a
              href="/about?tab=new"
              className="text-gray-300 hover:text-mw-water transition-colors no-underline"
            >
              {latestVersion}
            </a>
            {typeof __APP_COMMIT__ !== 'undefined' && ` (${__APP_COMMIT__})`}
          </span>
        </p>
        <a
          href="https://www.makewater.org/contact"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-gray-500 hover:text-mw-water transition-colors no-underline"
        >
          Feedback
        </a>
      </div>
    </footer>
  );
}
