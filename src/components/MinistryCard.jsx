import { useState } from 'react';
import RoleSection from './RoleSection';
import useStore, { ROLE_ORDER } from '../store/useStore';

export default function MinistryCard({ city, ministryName, cityColor }) {
  const getPeopleInMinistry = useStore(s => s.getPeopleInMinistry);
  const getMinistryStats = useStore(s => s.getMinistryStats);
  const [collapsed, setCollapsed] = useState(false);

  const people = getPeopleInMinistry(city, ministryName);
  const stats = getMinistryStats(city, ministryName);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-shrink-0">
      {/* Card header */}
      <div
        className="px-3 py-2.5 flex items-center gap-2 cursor-pointer select-none hover:bg-slate-50 transition-colors"
        style={{ borderLeft: `3px solid ${cityColor}` }}
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-800 truncate">{ministryName}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <StatBadge color="amber" count={stats.driver} label="D" />
            <StatBadge color="sky" count={stats.team} label="T" />
            <StatBadge color="emerald" count={stats.member} label="M" />
            <span className="text-slate-400 text-xs ml-1">· {stats.total} total</span>
          </div>
        </div>
        <span className="text-slate-300 text-xs">{collapsed ? '▶' : '▼'}</span>
      </div>

      {/* Role sections */}
      {!collapsed && (
        <div className="p-2 space-y-1.5 bg-slate-50/50">
          {ROLE_ORDER.map(role => (
            <RoleSection
              key={role}
              city={city}
              ministryName={ministryName}
              role={role}
              people={people.filter(p => p.role === role)}
            />
          ))}

          {/* Additional aggregate stats */}
          {stats.aggregates?.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {stats.aggregates.map(a => (
                <div key={a.label} className="text-xs bg-white rounded border border-slate-200 px-2 py-1">
                  <span className="text-slate-400">{a.label}: </span>
                  <span className="text-slate-700 font-semibold">{a.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatBadge({ color, count, label }) {
  if (count === 0) return null;
  const colors = {
    amber: 'text-amber-700 bg-amber-50',
    sky: 'text-sky-700 bg-sky-50',
    emerald: 'text-emerald-700 bg-emerald-50',
  };
  return (
    <span className={`text-xs rounded px-1 font-medium ${colors[color]}`}>
      {label}{count}
    </span>
  );
}
