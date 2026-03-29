import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function ConfirmPage() {
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [decisions, setDecisions] = useState({});

  useEffect(() => {
    const raw = localStorage.getItem('lastScanResult');
    if (raw) {
      try { setResult(JSON.parse(raw)); } catch { /* ignore */ }
    }
  }, []);

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

  const matches = result.misuse_check?.matches ?? [];
  const deepfakeScore = Math.round((result.deepfake_check?.score ?? 0) * 100);
  const elaFlagged = result.ela_check?.flagged ?? false;

  function decide(index, choice) {
    setDecisions(prev => ({
      ...prev,
      [index]: prev[index] === choice ? null : choice,
    }));
  }

  const confirmedCount = Object.values(decisions).filter(d => d === 'confirmed').length;
  const ignoredCount   = Object.values(decisions).filter(d => d === 'ignored').length;
  const actionNeeded   = confirmedCount;
  const canProceed     = confirmedCount > 0;

  function handleProceed() {
    if (!canProceed) return;
    const confirmed = matches.filter((_, i) => decisions[i] === 'confirmed');
    localStorage.setItem('confirmedMatches', JSON.stringify(confirmed));
    navigate('/actions');
  }

  function simBadge(sim) {
    const pct = Math.round((sim ?? 0) * 100);
    const isHigh = pct >= 80;
    return (
      <span
        className="text-xs font-semibold px-2 py-0.5 rounded-full"
        style={
          isHigh
            ? { backgroundColor: '#3b0a0a', color: '#f87171' }
            : { backgroundColor: '#2d1f00', color: '#fbbf24' }
        }
      >
        {isHigh ? 'High risk' : 'Medium risk'}
      </span>
    );
  }

  return (
    <div
      className="min-h-screen px-4 py-10 flex flex-col items-center"
      style={{ backgroundColor: '#1a1a1a' }}
    >
      <div className="w-full max-w-2xl flex flex-col gap-6">

        {/* ── HEADER ── */}
        <div className="flex flex-col gap-2">
          <h1 className="text-white text-3xl font-bold">Confirm detections</h1>
          <p className="text-gray-400 text-sm leading-relaxed max-w-xl">
            We found these images online matching yours. Tell us which ones are actually
            you so we can take the right action.
          </p>
          <p className="text-gray-500 text-xs mt-1">
            {matches.length} {matches.length === 1 ? 'match' : 'matches'} found — please review each one
          </p>
        </div>

        {/* ── MATCH CARDS ── */}
        {matches.length === 0 ? (
          <div
            className="rounded-xl p-6 text-center text-gray-500 text-sm"
            style={{ backgroundColor: '#222222' }}
          >
            No matches to review.
          </div>
        ) : (
          matches.map((match, i) => {
            const sim = Math.round((match.similarity_score ?? 0) * 100);
            const decision = decisions[i] ?? null;

            return (
              <div
                key={i}
                className="rounded-xl p-5 flex flex-col gap-4"
                style={{ backgroundColor: '#222222' }}
              >
                {/* Top row */}
                <div className="flex gap-4 items-start">
                  {/* Thumbnail */}
                  <div
                    className="flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center text-gray-600 text-xs"
                    style={{ width: 80, height: 80, backgroundColor: '#3a3a3a' }}
                  >
                    {match.thumbnail_url ? (
                      <img
                        src={match.thumbnail_url}
                        alt="thumb"
                        className="w-full h-full object-cover"
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                    ) : 'IMG'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-white text-sm font-semibold leading-snug">{match.title}</p>
                      {simBadge(match.similarity_score)}
                    </div>
                    <p className="text-gray-500 text-xs truncate">{match.url}</p>
                    <p className="text-gray-400 text-xs">
                      Similarity: <span className="text-white font-medium">{sim}%</span>
                      {' • '}
                      AI generated: <span className="text-white font-medium">{deepfakeScore}%</span>
                      {' • '}
                      ELA:{' '}
                      <span className={elaFlagged ? 'text-red-400' : 'text-green-400'}>
                        {elaFlagged ? 'edited regions detected' : 'clean'}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Decision row */}
                <div className="flex flex-col gap-2">
                  <p className="text-gray-500 text-xs">Is this image of you?</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => decide(i, 'confirmed')}
                      className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all border-2"
                      style={{
                        backgroundColor: decision === 'confirmed' ? '#16a34a' : 'rgba(20,83,45,0.3)',
                        color: decision === 'confirmed' ? '#ffffff' : '#4ade80',
                        borderColor: '#16a34a',
                        opacity: decision === 'ignored' ? 0.4 : 1,
                      }}
                    >
                      Yes, this is me — take action
                    </button>
                    <button
                      onClick={() => decide(i, 'ignored')}
                      className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all border-2"
                      style={{
                        backgroundColor: decision === 'ignored' ? '#dc2626' : 'rgba(127,29,29,0.3)',
                        color: decision === 'ignored' ? '#ffffff' : '#f87171',
                        borderColor: '#dc2626',
                        opacity: decision === 'confirmed' ? 0.4 : 1,
                      }}
                    >
                      No, different person — ignore
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* ── SUMMARY ── */}
        <div
          className="rounded-xl p-5 flex flex-col gap-4"
          style={{ backgroundColor: '#1a2a1a' }}
        >
          <p className="text-gray-400 text-sm font-medium">Summary after your review</p>
          <div className="grid grid-cols-3 gap-3">
            <div
              className="rounded-lg p-4 flex flex-col items-center gap-1"
              style={{ backgroundColor: '#222222' }}
            >
              <span className="text-2xl font-bold text-red-400">{confirmedCount}</span>
              <span className="text-gray-500 text-xs text-center">Confirmed misuse</span>
            </div>
            <div
              className="rounded-lg p-4 flex flex-col items-center gap-1"
              style={{ backgroundColor: '#222222' }}
            >
              <span className="text-2xl font-bold text-green-400">{ignoredCount}</span>
              <span className="text-gray-500 text-xs text-center">Ignored</span>
            </div>
            <div
              className="rounded-lg p-4 flex flex-col items-center gap-1"
              style={{ backgroundColor: '#222222' }}
            >
              <span className="text-2xl font-bold" style={{ color: '#a78bfa' }}>{actionNeeded}</span>
              <span className="text-gray-500 text-xs text-center">Action needed</span>
            </div>
          </div>
        </div>

        {/* ── PROCEED BUTTON ── */}
        <div className="flex justify-center pb-4">
          <button
            onClick={handleProceed}
            disabled={!canProceed}
            className="px-8 py-3 rounded-xl text-white font-semibold text-base transition-opacity"
            style={{
              backgroundColor: canProceed ? '#7c3aed' : '#3a3a3a',
              color: canProceed ? '#ffffff' : '#6b7280',
              cursor: canProceed ? 'pointer' : 'not-allowed',
              opacity: canProceed ? 1 : 0.6,
            }}
          >
            Proceed to action center →
          </button>
        </div>

      </div>
    </div>
  );
}
