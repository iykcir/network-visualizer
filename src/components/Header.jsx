import useStore from '../store/useStore';
import { getCityColor } from '../utils/colors';

export default function Header() {
  const people = useStore(s => s.people);
  const getAllCities = useStore(s => s.getAllCities);
  const getVisibleCities = useStore(s => s.getVisibleCities);
  const selectedCities = useStore(s => s.selectedCities);
  const searchQuery = useStore(s => s.searchQuery);
  const toggleCityFilter = useStore(s => s.toggleCityFilter);
  const clearCityFilter = useStore(s => s.clearCityFilter);
  const setSearchQuery = useStore(s => s.setSearchQuery);
  const setShowExport = useStore(s => s.setShowExport);
  const reset = useStore(s => s.reset);
  const setShowImport = useStore(s => s.setShowImport);
  const getChanges = useStore(s => s.getChanges);
  const apiConfig = useStore(s => s.apiConfig);
  const loadFromAPI = useStore(s => s.loadFromAPI);
  const apiLoading = useStore(s => s.apiLoading);

  const hasApiKey = !!apiConfig?.apiKey;

  const allCities = getAllCities();
  const changes = getChanges();

  return (
    <header className="bg-slate-900 border-b border-slate-700/50 flex-shrink-0">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-4 py-3">
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-lg">🌐</span>
          <span className="text-white font-bold text-base">Network Visualizer</span>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-xs">
          <input
            type="text"
            placeholder="Search people or ministries…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Changes badge */}
          {changes.length > 0 && (
            <div className="flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/30 rounded-lg px-3 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-amber-300 text-xs font-medium">{changes.length} change{changes.length !== 1 ? 's' : ''}</span>
            </div>
          )}

          {/* Export */}
          <button
            onClick={() => setShowExport(true)}
            disabled={changes.length === 0}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors"
          >
            Export plan
          </button>

          {/* Stats */}
          <div className="text-slate-500 text-xs hidden md:block">
            {people.length.toLocaleString()} people · {allCities.length} cities
          </div>

          {/* Refresh from API */}
          {hasApiKey && (
            <button
              onClick={() => loadFromAPI(true)}
              disabled={apiLoading}
              className="text-slate-400 hover:text-white text-xs transition-colors disabled:opacity-50"
              title="Reload data from membership API"
            >
              {apiLoading ? 'Refreshing…' : 'Refresh from API'}
            </button>
          )}

          {/* Remap / New import */}
          <button
            onClick={() => setShowImport(true)}
            className="text-slate-400 hover:text-white text-xs transition-colors"
          >
            Remap columns
          </button>
          <button
            onClick={reset}
            className="text-slate-400 hover:text-white text-xs transition-colors"
          >
            New import
          </button>
        </div>
      </div>

      {/* City filter pills */}
      {allCities.length > 1 && (
        <div className="flex items-center gap-2 px-4 pb-2 overflow-x-auto">
          <button
            onClick={clearCityFilter}
            className={`flex-shrink-0 text-xs rounded-full px-3 py-1 font-medium transition-all
              ${selectedCities.length === 0
                ? 'bg-white text-slate-800'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
          >
            All cities
          </button>
          {allCities.map(city => {
            const active = selectedCities.includes(city);
            const color = getCityColor(city, allCities);
            return (
              <button
                key={city}
                onClick={() => toggleCityFilter(city)}
                className={`flex-shrink-0 text-xs rounded-full px-3 py-1 font-medium border transition-all
                  ${active
                    ? 'text-white border-transparent'
                    : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                  }`}
                style={active ? { background: color, borderColor: color } : {}}
              >
                {city}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
