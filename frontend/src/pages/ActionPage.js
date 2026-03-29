import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

/* ── helpers ── */
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).catch(() => {});
}

function formatUrls(matches) {
  return matches.map((m, i) => `  ${i + 1}. ${m.url} (Similarity: ${Math.round((m.similarity_score ?? 0) * 100)}%)`).join('\n');
}

function buildTakedownEmail(scan, matches) {
  const urls = formatUrls(matches);
  const date = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  return `Subject: Urgent: Unauthorized Use of My Image - Immediate Removal Required

To Whom It May Concern,

I am writing to formally request the immediate removal of my personal image that has been used without my consent on your platform/website.

Scan Details:
- File: ${scan.filename ?? 'unknown'}
- Date of Detection: ${date}
- Overall Risk Level: ${scan.risk_level ?? 'High'}

Infringing URL(s) Found:
${urls}

These images were identified via an automated AI-powered reverse image scan with the following findings:
- Deepfake Probability: ${Math.round((scan.deepfake_check?.score ?? 0) * 100)}%
- ELA Manipulation: ${scan.ela_check?.flagged ? 'Edited regions detected' : 'Clean'}

Under applicable laws including but not limited to the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023, I hereby demand:

1. Immediate removal of the identified image(s)
2. Written confirmation of removal within 48 hours
3. Details of how the image was obtained

Failure to comply may result in formal legal proceedings.

Yours sincerely,
[Your Full Name]
[Your Email Address]
[Your Phone Number]
[Date: ${date}]`;
}

function buildCyberComplaint(scan, matches) {
  const urls = formatUrls(matches);
  const date = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  return `COMPLAINT UNDER SECTION 66E OF THE INFORMATION TECHNOLOGY ACT, 2000
(Violation of Privacy — Capturing/Publishing Private Images Without Consent)

To,
The Cyber Crime Cell / Superintendent of Police (Cyber),
[Jurisdiction Police Station]

Subject: Complaint regarding unauthorized publication of personal image on the internet

COMPLAINANT DETAILS:
Name: [Your Full Name]
Address: [Your Address]
Phone: [Your Phone Number]
Email: [Your Email Address]
Aadhaar / ID: [Your ID Number]

COMPLAINT:
I, the above-named complainant, wish to bring to your attention that my personal photograph/image has been published, distributed, or shared online without my knowledge or consent, which constitutes a violation of my privacy under Section 66E of the IT Act, 2000.

DATE OF DETECTION: ${date}
SCANNED FILE: ${scan.filename ?? 'unknown'}
RISK ASSESSMENT: ${scan.risk_level ?? 'High'}

EVIDENCE FROM AI-POWERED FORENSIC SCAN:
- Deepfake Detection Score: ${Math.round((scan.deepfake_check?.score ?? 0) * 100)}% probability of AI manipulation
- Error Level Analysis (ELA): ${scan.ela_check?.flagged ? 'Suspicious edited regions detected in image' : 'No manipulation detected'}
- Total Infringing Matches Found: ${matches.length}

INFRINGING URL(S):
${urls}

RELIEF SOUGHT:
1. Registration of FIR under Section 66E IT Act, 2000
2. Immediate takedown of the infringing content
3. Identification and prosecution of the person(s) responsible
4. Compensation for mental harassment and reputational damage

DECLARATION:
I declare that the information furnished above is true and correct to the best of my knowledge and belief.

Date: ${date}
Place: [Your City]

Signature: ___________________
[Your Full Name]`;
}

function buildReportScript(scan, matches) {
  const urls = matches.map(m => m.url).join(', ');
  const date = new Date().toLocaleDateString();
  return `=== INSTAGRAM / FACEBOOK REPORT SCRIPT ===

Use this text when reporting each post:

"This post contains my personal photo used without my permission. This image was detected by AI forensic software on ${date} with a ${Math.round((scan.deepfake_check?.score ?? 0) * 100)}% deepfake probability score. The original image belongs to me and I have not authorized its use here. Please remove it immediately under your community guidelines on impersonation and unauthorized use of personal information."

---

URLs to report:
${matches.map((m, i) => `${i + 1}. ${m.url}`).join('\n')}

---

Steps on Instagram:
1. Go to the post → tap ⋮ (three dots)
2. Select "Report" → "It's inappropriate"
3. Select "Involves me or someone I know" → "It's sharing my personal information"
4. Paste the above message if prompted for details

Steps on Facebook:
1. Go to the post → click ⋮ → "Find support or report post"
2. Select "Privacy" → "I want to remove this photo of me"
3. Follow the on-screen steps

Scan reference: ${scan.filename ?? 'unknown'} | Risk: ${scan.risk_level ?? 'High'} | Date: ${date}`;
}

/* ── sub-components ── */
function ActionModal({ title, content, onClose }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    copyToClipboard(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-2xl rounded-2xl flex flex-col" style={{ backgroundColor: '#1e1e1e', maxHeight: '80vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <p className="text-white font-semibold">{title}</p>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <pre className="text-gray-300 text-xs whitespace-pre-wrap font-mono leading-relaxed">{content}</pre>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 flex justify-end">
          <button
            onClick={handleCopy}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{ backgroundColor: copied ? '#166534' : '#3a3a3a', color: copied ? '#86efac' : '#d1d5db' }}
          >
            {copied ? 'Copied!' : 'Copy to clipboard'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionCard({ icon, iconBg, title, subtitle, buttonLabel, buttonColor, buttonHover, onClick }) {
  return (
    <div className="rounded-xl p-5 flex flex-col gap-4" style={{ backgroundColor: '#222222' }}>
      {/* Icon + text */}
      <div className="flex items-start gap-3">
        <div
          className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg"
          style={{ backgroundColor: iconBg }}
        >
          {icon}
        </div>
        <div>
          <p className="text-white font-semibold text-sm">{title}</p>
          <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>
        </div>
      </div>

      {/* Button */}
      <button
        onClick={onClick}
        className="w-full py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-85"
        style={{ backgroundColor: buttonColor }}
      >
        {buttonLabel}
      </button>
    </div>
  );
}

/* ── main page ── */
export default function ActionPage() {
  const navigate = useNavigate();
  const [scan, setScan] = useState(null);
  const [matches, setMatches] = useState([]);
  const [modal, setModal] = useState(null); // { title, content }
  const [markedUrls, setMarkedUrls] = useState([]);

  useEffect(() => {
    const raw = localStorage.getItem('lastScanResult');
    if (raw) { try { setScan(JSON.parse(raw)); } catch { /* ignore */ } }

    const cm = localStorage.getItem('confirmedMatches');
    if (cm) { try { setMatches(JSON.parse(cm)); } catch { /* ignore */ } }
  }, []);

  if (!matches || matches.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: '#1a1a1a' }}>
        <p className="text-gray-400 text-lg">No confirmed matches.</p>
        <Link to="/confirm" className="px-5 py-2 rounded-lg text-white font-semibold" style={{ backgroundColor: '#7c3aed' }}>
          Go back
        </Link>
      </div>
    );
  }

  const safeScan = scan ?? { filename: 'unknown', risk_level: 'High', deepfake_check: { score: 0 }, ela_check: { flagged: false } };

  function openModal(title, content) {
    setModal({ title, content });
  }

  function handleMarkSuspicious() {
    const urls = matches.map(m => m.url);
    setMarkedUrls(urls);
  }

  function downloadEvidence() {
    const date = new Date().toISOString();
    const allMatches = safeScan.misuse_check?.matches ?? matches;
    const content = [
      '=== HERLOCKHOLMES EVIDENCE REPORT ===',
      '',
      `Generated: ${date}`,
      `File: ${safeScan.filename ?? 'unknown'}`,
      `Risk Level: ${safeScan.risk_level ?? 'N/A'}`,
      '',
      '--- SCAN RESULTS ---',
      `Deepfake Score: ${Math.round((safeScan.deepfake_check?.score ?? 0) * 100)}%`,
      `Deepfake Flagged: ${safeScan.deepfake_check?.flagged ? 'Yes' : 'No'}`,
      `ELA Manipulation: ${safeScan.ela_check?.flagged ? 'Yes — edited regions detected' : 'No'}`,
      `Total Matches Found: ${safeScan.misuse_check?.total_matches ?? matches.length}`,
      '',
      '--- ALL MATCH URLs ---',
      ...allMatches.map((m, i) => `  ${i + 1}. ${m.url} (Similarity: ${Math.round((m.similarity_score ?? 0) * 100)}%)`),
      '',
      '--- CONFIRMED MATCHES ---',
      ...matches.map((m, i) => `  ${i + 1}. ${m.title}\n     URL: ${m.url}\n     Similarity: ${Math.round((m.similarity_score ?? 0) * 100)}%`),
      '',
      '=== END OF REPORT ===',
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'evidence_report.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen px-4 py-10 flex flex-col items-center" style={{ backgroundColor: '#1a1a1a' }}>
      {modal && (
        <ActionModal title={modal.title} content={modal.content} onClose={() => setModal(null)} />
      )}

      <div className="w-full max-w-2xl flex flex-col gap-6">

        {/* ── HEADER ── */}
        <div className="flex flex-col gap-1">
          <h1 className="text-white text-3xl font-bold">Take action</h1>
          <p className="text-gray-400 text-sm">Your image was found misused. Here's what you can do.</p>
        </div>

        {/* ── 2x2 ACTION CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Card 1 — Takedown Email */}
          <ActionCard
            icon="✉️"
            iconBg="#2e1065"
            title="Takedown email"
            subtitle="Auto-generated removal request"
            buttonLabel="Generate"
            buttonColor="#7c3aed"
            onClick={() => openModal('Takedown Email', buildTakedownEmail(safeScan, matches))}
          />

          {/* Card 2 — Cyber Complaint */}
          <ActionCard
            icon="⚖️"
            iconBg="#3b0a0a"
            title="Cyber complaint"
            subtitle="IT Act Section 66E — ready to file"
            buttonLabel="Generate"
            buttonColor="#dc2626"
            onClick={() => openModal('Cyber Complaint — IT Act Section 66E', buildCyberComplaint(safeScan, matches))}
          />

          {/* Card 3 — Report Script */}
          <ActionCard
            icon="📋"
            iconBg="#052e16"
            title="Report script"
            subtitle="Copy-paste for Instagram, Facebook"
            buttonLabel="Generate"
            buttonColor="#16a34a"
            onClick={() => openModal('Social Media Report Script', buildReportScript(safeScan, matches))}
          />

          {/* Card 4 — Mark Suspicious */}
          <div className="rounded-xl p-5 flex flex-col gap-4" style={{ backgroundColor: '#222222' }}>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: '#431407' }}>
                🚩
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Mark suspicious</p>
                <p className="text-gray-500 text-xs mt-0.5">Flag source for monitoring</p>
              </div>
            </div>

            {markedUrls.length > 0 ? (
              <div className="rounded-lg px-4 py-3 flex flex-col gap-1" style={{ backgroundColor: '#1c1a00' }}>
                <p className="text-amber-400 text-xs font-semibold">Marked for monitoring</p>
                {markedUrls.map((u, i) => (
                  <p key={i} className="text-gray-400 text-xs truncate">{u}</p>
                ))}
              </div>
            ) : (
              <button
                onClick={handleMarkSuspicious}
                className="w-full py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-85"
                style={{ backgroundColor: '#d97706' }}
              >
                Mark
              </button>
            )}
          </div>

        </div>

        {/* ── EVIDENCE PACK ── */}
        <div className="rounded-xl p-5 flex items-center justify-between gap-4" style={{ backgroundColor: '#222222' }}>
          <div>
            <p className="text-white font-semibold text-sm">Evidence pack</p>
            <p className="text-gray-500 text-xs mt-0.5">Image + timestamp + risk report</p>
          </div>
          <button
            onClick={downloadEvidence}
            className="flex-shrink-0 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-85"
            style={{ backgroundColor: '#374151' }}
          >
            Download PDF
          </button>
        </div>

      </div>
    </div>
  );
}
