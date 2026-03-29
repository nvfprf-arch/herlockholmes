import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  if (isToday) return `Today, ${time}`;

  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${dateStr}, ${time}`;
}

const RISK_BADGE = {
  High:   { bg: '#3b0a0a', color: '#f87171', label: 'High' },
  Medium: { bg: '#2d1f00', color: '#fbbf24', label: 'Medium' },
  Low:    { bg: '#0a2d1f', color: '#34d399', label: 'Low' },
};

export default function HistoryPage() {
  const navigate = useNavigate();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    axios
      .get('http://localhost:8000/history')
      .then(res => setScans(res.data))
      .catch(() => setError('Could not load scan history. Make sure the backend is running.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen px-4 py-10 flex flex-col items-center" style={{ backgroundColor: '#1a1a1a' }}>
      <div className="w-full max-w-2xl flex flex-col gap-6">

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between">
          <h1 className="text-white text-3xl font-bold">Your scan history</h1>
          {!loading && !error && (
            <span
              className="px-3 py-1 rounded-full text-sm font-semibold"
              style={{ backgroundColor: '#2e1065', color: '#a78bfa' }}
            >
              {scans.length} {scans.length === 1 ? 'scan' : 'scans'}
            </span>
          )}
        </div>

        {/* ── STATES ── */}
        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 rounded-full border-4 border-purple-600 border-t-transparent animate-spin" />
          </div>
        )}

        {error && (
          <p className="text-red-400 text-sm text-center py-10">{error}</p>
        )}

        {!loading && !error && scans.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-20">
            <p className="text-gray-400 text-base">No scans yet — upload your first image to get started</p>
            <Link
              to="/"
              className="px-5 py-2 rounded-lg text-white font-semibold"
              style={{ backgroundColor: '#7c3aed' }}
            >
              Upload image
            </Link>
          </div>
        )}

        {/* ── SCAN LIST ── */}
        {!loading && !error && scans.length > 0 && (
          <div className="flex flex-col gap-3">
            {scans.map(scan => {
              const badge = RISK_BADGE[scan.risk_level] ?? RISK_BADGE.Low;
              return (
                <div
                  key={scan.id}
                  className="flex items-center gap-4 rounded-xl px-4 py-4"
                  style={{ backgroundColor: '#222222' }}
                >
                  {/* Thumbnail placeholder */}
                  <div
                    className="flex-shrink-0 rounded-lg flex items-center justify-center text-gray-600 text-xs"
                    style={{ width: 60, height: 60, backgroundColor: '#333333' }}
                  >
                    IMG
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{scan.filename}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{formatDate(scan.scan_date)}</p>
                  </div>

                  {/* Right: badge + button */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span
                      className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                      style={{ backgroundColor: badge.bg, color: badge.color }}
                    >
                      {badge.label}
                    </span>
                    <button
                      onClick={() => navigate('/')}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors hover:bg-gray-700"
                      style={{ borderColor: '#4b5563', color: '#9ca3af', backgroundColor: 'transparent' }}
                    >
                      Re-scan
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
