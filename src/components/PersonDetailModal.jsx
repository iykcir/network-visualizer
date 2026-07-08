import useStore from '../store/useStore';
import { ROLE_STYLES } from '../utils/colors';

export default function PersonDetailModal() {
  const selectedPersonId = useStore(s => s.selectedPersonId);
  const setSelectedPerson = useStore(s => s.setSelectedPerson);
  const people = useStore(s => s.people);
  const mapping = useStore(s => s.mapping);

  const person = people.find(p => p.id === selectedPersonId);
  if (!person) return null;

  // Fields already shown prominently — skip them in the data grid
  const primaryKeys = new Set([
    mapping.name, mapping.city, mapping.ministry, mapping.role,
    mapping.region, mapping.peerClass, mapping.children,
  ].filter(Boolean));

  const rawEntries = Object.entries(person._raw ?? {}).filter(
    ([k]) => !primaryKeys.has(k) && k !== ''
  );

  const { chip } = ROLE_STYLES[person.role];
  const displayName = person.peerClass
    ? `${person.name} | ${person.peerClass}`
    : person.name;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={() => setSelectedPerson(null)}
    >
      <div
        className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-700">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">{displayName}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className={`text-xs rounded-full px-2 py-0.5 font-medium border ${chip}`}>
                  {person.role}
                </span>
                {person.region && (
                  <span className="text-xs text-slate-400 bg-slate-700 rounded px-2 py-0.5">
                    {person.region}
                  </span>
                )}
                <span className="text-xs text-slate-400 bg-slate-700 rounded px-2 py-0.5">
                  {person.city}
                </span>
                <span className="text-xs text-slate-400 bg-slate-700 rounded px-2 py-0.5">
                  {person.ministryName}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedPerson(null)}
              className="text-slate-400 hover:text-white transition-colors text-xl leading-none mt-0.5 flex-shrink-0"
            >
              ×
            </button>
          </div>
        </div>

        {/* Data grid */}
        {rawEntries.length > 0 ? (
          <div className="px-5 py-4 grid grid-cols-2 gap-x-6 gap-y-3 max-h-80 overflow-y-auto">
            {rawEntries.map(([key, val]) => (
              <div key={key}>
                <dt className="text-xs text-slate-500 font-medium mb-0.5 truncate">{key}</dt>
                <dd className="text-sm text-slate-200 font-medium truncate">{String(val ?? '—')}</dd>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-5 py-4 text-slate-500 text-sm">No additional data.</p>
        )}

        <div className="px-5 pb-4">
          <button
            onClick={() => setSelectedPerson(null)}
            className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl py-2 text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
