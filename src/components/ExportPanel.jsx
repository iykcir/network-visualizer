import useStore from '../store/useStore';
import { exportChangesCSV, exportFullCSV, downloadCSV } from '../utils/exporter';
import { ROLE_STYLES } from '../utils/colors';

export default function ExportPanel() {
  const people = useStore(s => s.people);
  const mapping = useStore(s => s.mapping);
  const getChanges = useStore(s => s.getChanges);
  const setShowExport = useStore(s => s.setShowExport);

  const changes = getChanges();

  function handleExportChanges() {
    const csv = exportChangesCSV(people, mapping);
    if (csv) downloadCSV(csv, 'network-plan-changes.csv');
  }

  function handleExportFull() {
    const csv = exportFullCSV(people, mapping);
    downloadCSV(csv, 'network-plan-full.csv');
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) setShowExport(false); }}
    >
      <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">Export Plan</h2>
          <button
            onClick={() => setShowExport(false)}
            className="text-slate-400 hover:text-white text-xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Changes list */}
        <div className="px-6 py-4 max-h-72 overflow-y-auto">
          <p className="text-slate-400 text-sm mb-3">
            {changes.length} {changes.length === 1 ? 'person has' : 'people have'} been moved:
          </p>
          {changes.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">No changes yet. Drag people between ministries to create a plan.</p>
          ) : (
            <div className="space-y-2">
              {changes.map(p => (
                <div key={p.id} className="flex items-start gap-3 bg-slate-700/50 rounded-lg px-3 py-2 text-sm">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0 mt-0.5 ${ROLE_STYLES[p.role].chip}`}>
                    {p.name}
                  </span>
                  <div className="text-slate-400 text-xs leading-relaxed">
                    {p._originalCity !== p.city && (
                      <div>City: <span className="text-slate-300">{p._originalCity}</span> → <span className="text-white font-medium">{p.city}</span></div>
                    )}
                    {p._originalMinistry !== p.ministryName && (
                      <div>Ministry: <span className="text-slate-300">{p._originalMinistry}</span> → <span className="text-white font-medium">{p.ministryName}</span></div>
                    )}
                    {p._originalRole !== p.role && (
                      <div>Role: <span className="text-slate-300">{p._originalRole}</span> → <span className="text-white font-medium">{p.role}</span></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Export buttons */}
        <div className="px-6 py-4 border-t border-slate-700 flex flex-col gap-2">
          <button
            onClick={handleExportChanges}
            disabled={changes.length === 0}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors"
          >
            Download changes only ({changes.length} rows)
          </button>
          <button
            onClick={handleExportFull}
            className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-xl py-2.5 text-sm transition-colors"
          >
            Download full dataset with updates ({people.length} rows)
          </button>
        </div>
      </div>
    </div>
  );
}
