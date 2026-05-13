import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';

/**
 * Shared page wrapper that provides:
 *   - SiteHeader (with optional onLogoClick for ChatPage)
 *   - flex-1 main area so content fills viewport
 *   - SiteFooter pinned to bottom on short pages, flows naturally on long ones
 */
export default function PageLayout({ children, onLogoClick }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa]">
      <SiteHeader onLogoClick={onLogoClick} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
