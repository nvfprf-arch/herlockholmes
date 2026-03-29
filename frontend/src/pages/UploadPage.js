import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const STEPS = [
  { number: '1', label: 'Upload your photo' },
  { number: '2', label: 'Web + AI + ELA scan' },
  { number: '3', label: 'Risk report + action' },
];

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();

  function handleFile(f) {
    if (f && f.type.startsWith('image/')) {
      setFile(f);
      setError('');
    } else {
      setError('Please select a valid image file.');
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  function onDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }

  function onDragLeave() {
    setDragging(false);
  }

  function onInputChange(e) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  async function onStartScan() {
    if (!file) return;
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post('http://localhost:8000/scan', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      localStorage.setItem('lastScanResult', JSON.stringify(response.data));
      navigate('/results');
    } catch (err) {
      setError(
        err.response?.data?.detail || 'Scan failed. Make sure the backend is running.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12" style={{ backgroundColor: '#1a1a1a' }}>
      {/* Badge */}
      <span
        className="mb-6 px-4 py-1 rounded-full text-sm font-semibold"
        style={{ backgroundColor: '#3b1f6e', color: '#a78bfa' }}
      >
        HerlockHolmes
      </span>

      {/* Heading */}
      <h1 className="text-white text-4xl font-bold text-center mb-3">
        Protect your image online
      </h1>

      {/* Subheading */}
      <p className="text-gray-400 text-center max-w-lg mb-10 text-base">
        Upload a photo to detect deepfakes, unauthorized edits, and misuse in seconds.
      </p>

      {/* Drop Zone */}
      <div
        className={`w-full max-w-xl rounded-xl flex flex-col items-center justify-center px-8 py-12 cursor-pointer transition-colors`}
        style={{
          backgroundColor: '#222222',
          border: `2px dashed ${dragging ? '#7c3aed' : '#4b5563'}`,
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !loading && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onInputChange}
        />

        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-10 h-10 rounded-full border-4 border-purple-600 border-t-transparent animate-spin"
            />
            <p className="text-gray-300 font-medium">Running 3-layer scan...</p>
          </div>
        ) : file ? (
          <div className="flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
            <svg className="w-10 h-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-white font-medium">{file.name}</p>
            <button
              onClick={onStartScan}
              className="mt-2 px-6 py-2 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#7c3aed' }}
            >
              Start Scan
            </button>
          </div>
        ) : (
          <>
            <svg className="w-12 h-12 text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <p className="text-gray-300 mb-2">Drag and drop your image here</p>
            <p className="text-gray-500 mb-4 text-sm">or</p>
            <button
              className="px-5 py-2 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#7c3aed' }}
              onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
            >
              Choose file
            </button>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="mt-4 text-red-400 text-sm">{error}</p>
      )}

      {/* Step Cards */}
      <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-2xl">
        {STEPS.map(({ number, label }) => (
          <div
            key={number}
            className="flex flex-col items-center rounded-xl px-6 py-8 text-center"
            style={{ backgroundColor: '#222222' }}
          >
            <span className="text-4xl font-bold mb-3" style={{ color: '#7c3aed' }}>
              {number}
            </span>
            <p className="text-gray-300 text-sm font-medium">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
