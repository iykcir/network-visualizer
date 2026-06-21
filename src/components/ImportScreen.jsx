import { useState, useRef } from 'react';
import useStore from '../store/useStore';
import { parseFile } from '../utils/fileParser';

const AGGREGATES = ['sum', 'avg', 'count'];

export default function ImportScreen() {
  const { rawHeaders, rawRows, mapping, setRawData, setMapping, importData } = useStore();
  const [step, setStep] = useState('upload'); // 'upload' | 'map'
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [additionalFields, setAdditionalFields] = useState(mapping.additionalFields ?? []);
  const fileRef = useRef();

  const requiredFields = [
    { key: 'name', label: 'Person Name', hint: 'Full name column' },
    { key: 'city', label: 'City', hint: 'City or location column' },
    { key: 'ministry', label: 'Ministry', hint: 'Ministry or team name column' },
    { key: 'role', label: 'Role', hint: 'Role (driver / team / member)' },
  ];

  async function handleFile(file) {
    setError('');
    try {
      const { rows, headers } = await parseFile(file);
      if (rows.length === 0) { setError('File is empty.'); return; }
      setRawData(rows, headers);
      // Pre-fill mapping if saved from previous session
      setStep('map');
    } catch (e) {
      setError(e.message);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onFileChange(e) {
    const file = e.target.files[0];
    if (file) handleFile(file);
  }

  function addAdditionalField() {
    setAdditionalFields([...additionalFields, { column: '', label: '', aggregate: 'sum' }]);
  }

  function updateAdditionalField(i, key, val) {
    const updated = additionalFields.map((f, idx) =>
      idx === i ? { ...f, [key]: val } : f
    );
    setAdditionalFields(updated);
  }

  function removeAdditionalField(i) {
    setAdditionalFields(additionalFields.filter((_, idx) => idx !== i));
  }

  function handleImport() {
    const m = { ...mapping, additionalFields: additionalFields.filter(f => f.column && f.label) };
    const missing = requiredFields.filter(f => !m[f.key]);
    if (missing.length > 0) {
      setError(`Please map: ${missing.map(f => f.label).join(', ')}`);
      return;
    }
    importData(rawRows, rawHeaders, m);
  }

  const preview = rawRows.slice(0, 3);

  if (step === 'upload') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">🌐</div>
          <h1 className="text-3xl font-bold text-white mb-2">Network Visualizer</h1>
          <p className="text-slate-400 text-lg">Plan and visualize your ministry org structure</p>
        </div>

        <div
          className={`w-full max-w-lg border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer
            ${dragging ? 'border-indigo-400 bg-indigo-500/10' : 'border-slate-600 hover:border-slate-500 bg-slate-800/50'}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current.click()}
        >
          <div className="text-4xl mb-4">📂</div>
          <p className="text-white font-semibold text-lg mb-1">Drop your file here</p>
          <p className="text-slate-400 text-sm">CSV, Excel (.xlsx), or .ods</p>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.ods" className="hidden" onChange={onFileChange} />
        </div>

        {error && (
          <div className="mt-4 text-red-400 text-sm bg-red-900/30 rounded-lg px-4 py-2 max-w-lg w-full">
            {error}
          </div>
        )}

        <div className="mt-8 text-slate-500 text-sm text-center max-w-md">
          <p className="font-medium text-slate-400 mb-2">Expected columns (exact names don't matter):</p>
          <p>Person name · City · Ministry or team · Role (driver / team / member)</p>
        </div>
      </div>
    );
  }

  // Mapping step
  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => setStep('upload')}
          className="text-slate-400 hover:text-white text-sm mb-6 flex items-center gap-1 transition-colors"
        >
          ← Back
        </button>

        <h2 className="text-2xl font-bold text-white mb-1">Map your columns</h2>
        <p className="text-slate-400 mb-6 text-sm">
          {rawRows.length.toLocaleString()} rows · {rawHeaders.length} columns detected
        </p>

        {/* Preview */}
        <div className="bg-slate-800 rounded-xl mb-6 overflow-x-auto">
          <table className="text-xs w-full">
            <thead>
              <tr>
                {rawHeaders.slice(0, 6).map(h => (
                  <th key={h} className="text-left text-slate-400 font-medium px-3 py-2 border-b border-slate-700">
                    {h}
                  </th>
                ))}
                {rawHeaders.length > 6 && (
                  <th className="text-slate-500 px-3 py-2 border-b border-slate-700">+{rawHeaders.length - 6} more</th>
                )}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => (
                <tr key={i} className="border-b border-slate-700/50">
                  {rawHeaders.slice(0, 6).map(h => (
                    <td key={h} className="text-slate-300 px-3 py-1.5 truncate max-w-[140px]">
                      {String(row[h] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Required mappings */}
        <div className="bg-slate-800 rounded-xl p-5 mb-4">
          <h3 className="text-white font-semibold mb-4">Required fields</h3>
          <div className="grid grid-cols-2 gap-3">
            {requiredFields.map(f => (
              <div key={f.key}>
                <label className="block text-xs text-slate-400 mb-1">{f.label}</label>
                <select
                  className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:border-indigo-400 focus:outline-none"
                  value={mapping[f.key] || ''}
                  onChange={e => setMapping({ ...mapping, [f.key]: e.target.value })}
                >
                  <option value="">— select column —</option>
                  {rawHeaders.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <p className="text-slate-500 text-xs mt-0.5">{f.hint}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Additional fields */}
        <div className="bg-slate-800 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-semibold">Additional stats</h3>
              <p className="text-slate-400 text-xs mt-0.5">Aggregate numeric columns shown on ministry cards</p>
            </div>
            <button
              onClick={addAdditionalField}
              className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors"
            >
              + Add field
            </button>
          </div>
          {additionalFields.length === 0 && (
            <p className="text-slate-500 text-sm">No additional fields. Click "Add field" to aggregate numeric data.</p>
          )}
          {additionalFields.map((f, i) => (
            <div key={i} className="flex gap-2 mb-2 items-start">
              <select
                className="flex-1 bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:border-indigo-400 focus:outline-none"
                value={f.column}
                onChange={e => updateAdditionalField(i, 'column', e.target.value)}
              >
                <option value="">— column —</option>
                {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
              <input
                className="w-28 bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:border-indigo-400 focus:outline-none"
                placeholder="Label"
                value={f.label}
                onChange={e => updateAdditionalField(i, 'label', e.target.value)}
              />
              <select
                className="w-24 bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:border-indigo-400 focus:outline-none"
                value={f.aggregate}
                onChange={e => updateAdditionalField(i, 'aggregate', e.target.value)}
              >
                {AGGREGATES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <button
                onClick={() => removeAdditionalField(i)}
                className="text-slate-500 hover:text-red-400 px-2 py-2 transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {error && (
          <div className="text-red-400 text-sm bg-red-900/30 rounded-lg px-4 py-2 mb-4">
            {error}
          </div>
        )}

        <button
          onClick={handleImport}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
        >
          Import {rawRows.length.toLocaleString()} people →
        </button>
      </div>
    </div>
  );
}
