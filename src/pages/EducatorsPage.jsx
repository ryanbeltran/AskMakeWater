import { Link } from 'react-router-dom';
import EmailSignup from '../components/EmailSignup';

export default function EducatorsPage() {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <span className="font-bold text-mw-base tracking-tight text-lg">
              ask <span className="text-mw-water">makewater</span>
            </span>
          </Link>
          <Link
            to="/"
            className="text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg font-medium hover:border-mw-water hover:text-mw-water transition-colors no-underline"
          >
            Try the calculator
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-mw-water bg-mw-water-light px-3 py-1 rounded-full mb-4">
            Coming Soon
          </span>
          <h1 className="text-3xl font-bold text-mw-base tracking-tight mb-3">
            For Educators
          </h1>
          <p className="text-gray-500 text-base leading-relaxed max-w-xl mx-auto">
            We're building lesson plans, classroom activities, and data exploration tools
            that help students understand the hidden water cost of technology.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
            <div className="text-3xl mb-2">📊</div>
            <h3 className="text-sm font-semibold text-gray-800 mb-1">Lesson Plans</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Standards-aligned activities for middle and high school science, environmental studies, and computer science.
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
            <div className="text-3xl mb-2">🔬</div>
            <h3 className="text-sm font-semibold text-gray-800 mb-1">Data Exploration</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Export our reference datasets for classroom analysis. Compare power sources, regions, and activities.
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
            <div className="text-3xl mb-2">💧</div>
            <h3 className="text-sm font-semibold text-gray-800 mb-1">Water Audit Challenge</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              A week-long student challenge to track and reduce their digital water footprint.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center mb-10">
          <h2 className="text-base font-semibold text-gray-800 mb-2">Get notified when educator resources launch</h2>
          <p className="text-xs text-gray-500 mb-4">
            We'll send you a single email when lesson plans and classroom tools are ready.
          </p>
          <EmailSignup />
        </div>

        <div className="bg-mw-water-light/30 rounded-2xl border border-mw-water/20 p-6">
          <h2 className="text-sm font-semibold text-mw-water-dark mb-2">In the meantime</h2>
          <ul className="text-xs text-gray-600 leading-relaxed space-y-2">
            <li>
              <strong>Use the calculator in class right now</strong> — it works on any device with a browser. Ask students to compare the water cost of their daily digital habits.
            </li>
            <li>
              <strong>Explore our sources</strong> —{' '}
              <Link to="/sources" className="text-mw-water hover:underline">
                every data point is cited
              </Link>{' '}
              with links to the original research.
            </li>
            <li>
              <strong>The whole project is open source</strong> — students can inspect the system prompt, the calculation engine, and the reference data. Everything is transparent.
            </li>
            <li>
              <strong>Have ideas?</strong>{' '}
              <a href="https://www.makewater.org/contact" target="_blank" rel="noopener noreferrer" className="text-mw-water hover:underline">
                Tell us what you'd want in an educator toolkit
              </a>
              .
            </li>
          </ul>
        </div>
      </main>

      <footer className="border-t border-gray-100 bg-white/80 mt-8">
        <div className="max-w-3xl mx-auto px-4 py-3 text-center">
          <p className="text-[11px] text-gray-400">
            A project of{' '}
            <a href="https://www.makewater.org" target="_blank" rel="noopener noreferrer" className="text-mw-water hover:underline">
              MakeWater
            </a>
            {' '}501(c)(3)
          </p>
        </div>
      </footer>
    </div>
  );
}
