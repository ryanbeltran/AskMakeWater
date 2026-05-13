import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/about', label: 'About' },
  { to: '/sources', label: 'Sources' },
  { to: '/educators', label: 'For Educators' },
];

/**
 * Shared site header used on every public page.
 *
 * Props:
 *   onLogoClick — optional callback for the logo (ChatPage uses this to
 *                 reset the conversation instead of navigating).
 */
export default function SiteHeader({ onLogoClick }) {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const logoEl = onLogoClick ? (
    <button
      onClick={onLogoClick}
      className="flex items-center gap-2 cursor-pointer bg-transparent border-none p-0"
    >
      <span className="font-bold text-mw-base tracking-tight text-lg">
        ask <span className="text-mw-water">makewater</span>
      </span>
    </button>
  ) : (
    <Link to="/" className="flex items-center gap-2 no-underline">
      <span className="font-bold text-mw-base tracking-tight text-lg">
        ask <span className="text-mw-water">makewater</span>
      </span>
    </Link>
  );

  return (
    <header className="flex-shrink-0 border-b border-gray-200 bg-white relative z-20">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        {logoEl}

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1">
          {NAV_ITEMS.map(item => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors no-underline ${
                  active
                    ? 'bg-mw-water-light text-mw-water font-semibold'
                    : 'text-gray-600 hover:text-mw-water hover:bg-gray-50'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="sm:hidden flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 cursor-pointer bg-transparent border-none"
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <nav className="sm:hidden border-t border-gray-100 bg-white px-4 py-2 space-y-1">
          {NAV_ITEMS.map(item => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className={`block text-sm px-3 py-2 rounded-lg no-underline transition-colors ${
                  active
                    ? 'bg-mw-water-light text-mw-water font-semibold'
                    : 'text-gray-600 hover:text-mw-water hover:bg-gray-50'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
