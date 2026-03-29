import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const RISK_COLORS = {
  High:   { bg: '#3b0a0a', text: '#f87171', bar: '#ef4444', label: 'red' },
  Medium: { bg: '#2d1f00', text: '#fbbf24', bar: '#f59e0b', label: 'yellow' },
  Low:    { bg: '#0a2d1f', text: '#34d399', bar: '#10b981', label: 'green' },
};

const RISK_PERCENT = { High: 85, Medium: 55, Low: 20 };

function riskColor(risk) {
  return RISK_COLORS[risk] ?? RISK_COLORS.Low;
}

function MatchCard({ match, index }) {
  const sim = match.similarity_score ?? 0;
  const isHigh = sim >= 0.8;
  return (
    <div
      className="flex items-start gap-4 rounded-xl p-4"
      style={{ backgroundColor: '#2a2a2a' }}
    >
      {/* Thumbnail */}
      <div
        className="flex-shrink-0 rounded-lg overflow-hidden"
        style={{ width: 60, height: 60, backgroundColor: '#3a3a3a' }}
      >
        {match.thumbnail_url ? (
          <img
            src={match.thumbnail_url}
            alt="thumb"
            className="w-full h-full object-cover"
            onError={e => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
            IMG
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{match.title}</p>
        <p className="text-gray-500 text-xs truncate mt-0.5">{match.url}</p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-gray-400 text-xs">
            Similarity: <span className="text-white font-semibold">{Math.round(sim * 100)}%</span>
          </span>
          <span className="text-gray-500 text-xs">Found {index + 1} hrs ago</span>
        </div>
      </div>

      {/* Badge */}
      <span
        className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full"
        style={
          isHigh
            ? { backgroundColor: '#3b0a0a', color: '#f87171' }
            : { backgroundColor: '#2d1f00', color: '#fbbf24' }
        }
      >
        {isHigh ? 'High risk' : 'Medium risk'}
      </span>
    </div>
  );
}

export default function ResultsPage() {
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [scanImage, setScanImage] = useState(null);
  const [elaImageUrl, setElaImageUrl] = useState(null);

  useEffect(() => {
    const raw = localStorage.getItem('lastScanResult');
    if (raw) {
      try { setResult(JSON.parse(raw)); } catch { /* ignore */ }
    }
    setScanImage(localStorage.getItem('lastScanImage'));
  }, []);

  useEffect(() => {
    if (!result?.scan_id) return;
    axios
      .get(`http://localhost:8000/ela-image/${result.scan_id}`, { responseType: 'blob' })
      .then(res => setElaImageUrl(URL.createObjectURL(res.data)))
      .catch(() => {});
  }, [result]);

  if (!result) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ backgroundColor: '#1a1a1a' }}
      >
        <p className="text-gray-400 text-lg">No scan data found.</p>
        <Link
          to="/"
          className="px-5 py-2 rounded-lg text-white font-semibold"
          style={{ backgroundColor: '#7c3aed' }}
        >
          Go back
        </Link>
      </div>
    );
  }

  const risk = result.risk_level ?? 'Low';
  const rc = riskColor(risk);
  const pct = RISK_PERCENT[risk] ?? 20;
  const deepfake = result.deepfake_check ?? {};
  const misuse = result.misuse_check ?? {};
  const ela = result.ela_check ?? {};
  const matches = misuse.matches ?? [];
  const dfScore = Math.round((deepfake.score ?? 0) * 100);

  const subtitle =
    risk === 'High'
      ? `Manipulated copy detected • ${dfScore}% match`
      : risk === 'Medium'
      ? `Suspicious activity detected • ${dfScore}% match`
      : `No significant threats detected • ${dfScore}% match`;

  return (
    <div
      className="min-h-screen px-4 py-10 flex flex-col items-center"
      style={{ backgroundColor: '#1a1a1a' }}
    >
      <div className="w-full max-w-3xl flex flex-col gap-6">

        {/* ── RISK PANEL ── */}
        <div
          className="rounded-2xl p-6 flex flex-col sm:flex-row gap-6"
          style={{ backgroundColor: rc.bg }}
        >
          {/* Image preview */}
          <div
            className="flex-shrink-0 rounded-xl overflow-hidden"
            style={{ width: 120, height: 120, backgroundColor: '#1a1a1a' }}
          >
            {scanImage ? (
              <img src={scanImage} alt="Scanned" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
                No preview
              </div>
            )}
          </div>

          {/* Risk info */}
          <div className="flex flex-col justify-between flex-1 gap-3">
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Risk level</p>
              <p className="text-5xl font-extrabold" style={{ color: rc.text }}>{risk}</p>
              <p className="mt-1 text-sm" style={{ color: rc.text, opacity: 0.75 }}>{subtitle}</p>
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Risk score</span>
                <span>{pct}%</span>
              </div>
              <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#ffffff18' }}>
                <div
                  className="h-2 rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: rc.bar }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── 3-LAYER BREAKDOWN ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Serper */}
          <div className="rounded-xl p-5 flex flex-col gap-1" style={{ backgroundColor: '#222222' }}>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Serper web scan</p>
            <p
              className="text-2xl font-bold mt-1"
              style={{ color: (misuse.total_matches ?? 0) >= 3 ? '#f87171' : (misuse.total_matches ?? 0) >= 1 ? '#fbbf24' : '#34d399' }}
            >
              {misuse.total_matches ?? 0} {misuse.total_matches === 1 ? 'match' : 'matches'}
            </p>
            <p className="text-gray-500 text-xs">Suspicious sources</p>
          </div>

          {/* Deepfake */}
          <div className="rounded-xl p-5 flex flex-col gap-1" style={{ backgroundColor: '#222222' }}>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">DeepFake check</p>
            <p
              className="text-2xl font-bold mt-1"
              style={{ color: dfScore >= 70 ? '#f87171' : dfScore >= 40 ? '#fbbf24' : '#34d399' }}
            >
              {dfScore}% probability
            </p>
            <p className="text-gray-500 text-xs">
              {deepfake.flagged ? 'Likely synthetic' : 'Likely authentic'}
            </p>
          </div>

          {/* ELA */}
          <div className="rounded-xl p-5 flex flex-col gap-1" style={{ backgroundColor: '#222222' }}>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">ELA manipulation</p>
            <p
              className="text-2xl font-bold mt-1"
              style={{ color: ela.flagged ? '#f87171' : '#34d399' }}
            >
              {ela.flagged ? 'Edited regions' : 'Clean image'}
            </p>
            <p className="text-gray-500 text-xs">
              {ela.flagged ? 'Face area altered' : 'No edits detected'}
            </p>
          </div>
        </div>

        {/* ── SUSPICIOUS MATCHES ── */}
        {matches.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-white font-semibold text-base">
              Suspicious matches found
              <span className="ml-2 text-xs text-gray-500 font-normal">({matches.length})</span>
            </h2>
            {matches.map((match, i) => (
              <MatchCard key={i} match={match} index={i} />
            ))}
          </div>
        )}

        {/* ── ELA HEATMAP ── */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#222222' }}>
          <div className="px-5 py-4 border-b border-gray-700">
            <p className="text-white font-semibold text-sm">ELA manipulation heatmap</p>
          </div>
          <div
            className="flex items-center justify-center min-h-48 relative"
            style={{
              background: elaImageUrl
                ? undefined
                : 'linear-gradient(135deg, #1e1040 0%, #0f172a 60%, #1e3a5f 100%)',
            }}
          >
            {elaImageUrl ? (
              <img
                src={elaImageUrl}
                alt="ELA heatmap"
                className="max-w-full max-h-72 object-contain rounded"
              />
            ) : (
              <p className="text-gray-400 text-sm px-6 text-center">
                Highlighted regions show potential edits
              </p>
            )}
          </div>
        </div>

        {/* ── CONFIRM BUTTON ── */}
        <div className="flex justify-center pb-4">
          <button
            onClick={() => navigate('/confirm')}
            className="px-8 py-3 rounded-xl text-white font-semibold text-base transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#7c3aed' }}
          >
            Confirm detections →
          </button>
        </div>

      </div>
    </div>
  );
}
