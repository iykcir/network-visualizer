import MinistryCard from './MinistryCard';
import useStore from '../store/useStore';

export default function CityColumn({ city, cityColor }) {
  const getMinistriesInCity = useStore(s => s.getMinistriesInCity);
  const getCityStats = useStore(s => s.getCityStats);

  const ministries = getMinistriesInCity(city);
  const stats = getCityStats(city);

  return (
    <div className="flex flex-col flex-shrink-0 w-72 min-h-0">
      {/* City header */}
      <div
        className="rounded-t-xl px-4 py-3 mb-2"
        style={{ background: cityColor }}
      >
        <h2 className="text-white font-bold text-base leading-tight">{city}</h2>
        <div className="flex items-center gap-3 mt-1 text-white/75 text-xs">
          <span>{ministries.length} {ministries.length === 1 ? 'ministry' : 'ministries'}</span>
          <span>·</span>
          <span>{stats.total} people</span>
        </div>

        {/* Mini breakdown */}
        <div className="flex gap-2 mt-2">
          <MiniStat label="Drivers" count={stats.drivers} />
          <MiniStat label="Team" count={stats.team} />
          <MiniStat label="Members" count={stats.members} />
        </div>
      </div>

      {/* Ministry cards */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 pb-4">
        {ministries.length === 0 ? (
          <div className="text-center text-slate-500 text-sm py-8">No ministries</div>
        ) : (
          ministries.map(m => (
            <MinistryCard
              key={m}
              city={city}
              ministryName={m}
              cityColor={cityColor}
            />
          ))
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, count }) {
  return (
    <div className="bg-black/20 rounded px-2 py-0.5 text-xs text-white/90">
      <span className="text-white/60 mr-1">{label[0]}</span>{count}
    </div>
  );
}
