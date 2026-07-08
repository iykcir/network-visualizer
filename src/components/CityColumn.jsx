import CityDAG from './CityDAG';
import useStore from '../store/useStore';

export default function CityColumn({ region, city, cityColor }) {
  const getMinistriesInCity = useStore(s => s.getMinistriesInCity);
  const getCityStats = useStore(s => s.getCityStats);

  const ministries = getMinistriesInCity(city, region);
  const stats = getCityStats(city, region);

  return (
    <div className="flex flex-col flex-shrink-0 w-72">
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
          {stats.children > 0 && (
            <>
              <span>·</span>
              <span>{stats.children} children</span>
            </>
          )}
        </div>

        {/* Mini breakdown */}
        <div className="flex gap-2 mt-2">
          <MiniStat label="Drivers" count={stats.drivers} />
          <MiniStat label="Team" count={stats.team} />
          <MiniStat label="Members" count={stats.members} />
        </div>
      </div>

      {/* Ministry DAG */}
      <CityDAG region={region} city={city} cityColor={cityColor} />
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
