import useStore from '../store/useStore';
import CityColumn from './CityColumn';
import { getCityColor } from '../utils/colors';

export default function RegionSection({ region, allCities }) {
  const getVisibleCitiesInRegion = useStore(s => s.getVisibleCitiesInRegion);
  const getRegionStats = useStore(s => s.getRegionStats);

  const cities = getVisibleCitiesInRegion(region);
  const stats = getRegionStats(region);

  if (cities.length === 0) return null;

  return (
    <div className="mb-8">
      {/* Region header */}
      <div className="flex items-center gap-3 mb-3 px-1">
        <h2 className="text-base font-bold text-white tracking-wide uppercase">
          {region || 'Unassigned'}
        </h2>
        <span className="text-slate-500 text-xs">·</span>
        <span className="text-slate-400 text-sm">{stats.cities} {stats.cities === 1 ? 'city' : 'cities'}</span>
        <span className="text-slate-500 text-xs">·</span>
        <span className="text-slate-400 text-sm">{stats.total} people</span>
        {stats.children > 0 && (
          <>
            <span className="text-slate-500 text-xs">·</span>
            <span className="text-slate-400 text-sm">{stats.children} children</span>
          </>
        )}
        <div className="flex gap-1.5 ml-2">
          <RegionBadge label="D" count={stats.drivers} color="amber" />
          <RegionBadge label="T" count={stats.team} color="sky" />
          <RegionBadge label="M" count={stats.members} color="slate" />
        </div>
      </div>

      {/* Horizontally scrollable city row */}
      <div className="flex gap-4 overflow-x-auto pb-2" style={{ minWidth: 0 }}>
        {cities.map(city => (
          <CityColumn
            key={city}
            city={city}
            region={region}
            cityColor={getCityColor(city, allCities)}
          />
        ))}
      </div>
    </div>
  );
}

function RegionBadge({ label, count, color }) {
  const colors = {
    amber: 'text-amber-400 bg-amber-400/10',
    sky: 'text-sky-400 bg-sky-400/10',
    slate: 'text-slate-400 bg-slate-400/10',
  };
  return (
    <span className={`text-xs rounded px-1.5 py-0.5 font-medium ${colors[color]}`}>
      {label}{count}
    </span>
  );
}
