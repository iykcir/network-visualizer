import { useState, useEffect, useRef } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core';
import CityDAG from './CityDAG';
import PersonDetailModal from './PersonDetailModal';
import { ChipPreview } from './PersonChip';
import useStore from '../store/useStore';
import { getCityColor } from '../utils/colors';

export default function Board() {
  const getAllRegions = useStore(s => s.getAllRegions);
  const getAllCities = useStore(s => s.getAllCities);
  const getVisibleCitiesInRegion = useStore(s => s.getVisibleCitiesInRegion);
  const getRegionStats = useStore(s => s.getRegionStats);
  const getCityStats = useStore(s => s.getCityStats);
  const movePerson = useStore(s => s.movePerson);
  const setCityRegionOverride = useStore(s => s.setCityRegionOverride);
  const cityRegionOverrides = useStore(s => s.cityRegionOverrides);
  const people = useStore(s => s.people);
  const selectedCities = useStore(s => s.selectedCities);
  useStore(s => s.searchQuery);

  const regions = getAllRegions();
  const allCities = getAllCities();
  const namedRegions = regions.filter(r => r !== '');

  const [activeRegionPref, setActiveRegionPref] = useState(null);
  const [activeCity, setActiveCity] = useState(null);
  const [activePerson, setActivePerson] = useState(null);

  // Dropdown state: which city's picker is open and where to render it
  const [dropdownCity, setDropdownCity] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef(null);

  // If the preferred region has no matching cities under the current filter, jump to the first that does.
  const regionWithCities = regions.find(r => getRegionStats(r).cities > 0) ?? regions[0] ?? null;
  const activeRegion = regions.includes(activeRegionPref)
    ? (getRegionStats(activeRegionPref).cities > 0 || selectedCities.length === 0 ? activeRegionPref : regionWithCities)
    : regionWithCities;

  function selectRegion(region) {
    setActiveRegionPref(region);
    setActiveCity(null);
    setDropdownCity(null);
  }

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownCity) return;
    function onDoc(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownCity(null);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [dropdownCity]);

  function openDropdown(city, e) {
    e.stopPropagation();
    if (dropdownCity === city) { setDropdownCity(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    // Position below the trigger; clamp to viewport right edge
    const left = Math.min(rect.left, window.innerWidth - 176);
    setDropdownPos({ top: rect.bottom + 4, left });
    setDropdownCity(city);
  }

  // Toggle a region on/off for a city, using activeRegion as natural baseline
  function setCityRegionActive(city, region, active) {
    const raw = cityRegionOverrides[city];
    // Normalize: old localStorage may have stored a plain string instead of string[]
    const overrides = Array.isArray(raw) ? raw : (raw ? [raw] : null);
    const current = overrides && overrides.length > 0
      ? overrides
      : (activeRegion ? [activeRegion] : []);
    const next = active
      ? [...new Set([...current, region])]
      : current.filter(r => r !== region);
    setCityRegionOverride(city, next);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  function handleDragStart({ active }) {
    setActivePerson(people.find(p => p.id === active.id) ?? null);
  }

  function handleDragEnd({ active, over }) {
    setActivePerson(null);
    if (!over) return;
    const parts = over.id.split('::');
    if (parts.length !== 4) return;
    const [toRegion, toCity, toMinistry, toRole] = parts;
    const person = people.find(p => p.id === active.id);
    if (!person) return;
    if (
      (person.region ?? '') === toRegion &&
      person.city === toCity &&
      person.ministryName === toMinistry &&
      person.role === toRole
    ) return;
    movePerson(active.id, toRegion, toCity, toMinistry, toRole);
  }

  if (regions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
        No data loaded.
      </div>
    );
  }

  const visibleCities = activeRegion ? getVisibleCitiesInRegion(activeRegion) : [];

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* ── Region tabs ───────────────────────────────────────── */}
          <div className="flex items-end gap-0.5 px-4 pt-3 overflow-x-auto border-b border-slate-700">
            {regions.map(region => {
              const stats = getRegionStats(region);
              const isActive = activeRegion === region;
              const isEmpty = selectedCities.length > 0 && stats.cities === 0;
              return (
                <button
                  key={region}
                  onClick={() => selectRegion(region)}
                  disabled={isEmpty}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors
                    ${isEmpty
                      ? 'text-slate-600 border-transparent cursor-default'
                      : isActive
                        ? 'text-white border-indigo-400 bg-slate-800'
                        : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                >
                  <span>{region || 'Unassigned'}</span>
                  <span className={`text-xs rounded-full px-1.5 py-0 leading-5 font-semibold
                    ${isEmpty
                      ? 'bg-slate-800 text-slate-600'
                      : isActive
                        ? 'bg-indigo-500/30 text-indigo-300'
                        : 'bg-slate-700 text-slate-400'
                    }`}>
                    {stats.cities}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── City cards row ─────────────────────────────────────── */}
          <div className="flex gap-2.5 px-4 py-3 overflow-x-auto border-b border-slate-700/60 bg-slate-800/20 flex-shrink-0">
            {visibleCities.length === 0 ? (
              <p className="text-slate-500 text-sm self-center">No cities match your filter.</p>
            ) : (
              visibleCities.map(city => {
                const stats = getCityStats(city, activeRegion);
                const color = getCityColor(city, allCities);
                const isSelected = activeCity === city;
                const overrides = cityRegionOverrides[city] ?? [];
                const displayRegions = overrides.length > 0 ? overrides : (activeRegion ? [activeRegion] : []);
                const label = displayRegions.filter(r => r !== '').join(', ') || 'unassigned';

                return (
                  <div
                    key={city}
                    className={`flex-shrink-0 rounded-xl overflow-hidden transition-all duration-150
                      ${isSelected
                        ? 'ring-2 ring-white/50 ring-offset-2 ring-offset-slate-800 scale-[1.04] shadow-lg'
                        : 'opacity-70 hover:opacity-100 hover:scale-[1.02]'
                      }`}
                    style={{ background: color, minWidth: 148 }}
                  >
                    {/* Clickable main area */}
                    <div
                      className="px-3.5 pt-2.5 pb-2 cursor-pointer"
                      onClick={() => setActiveCity(isSelected ? null : city)}
                    >
                      <div className="text-white font-semibold text-sm leading-tight">{city}</div>
                      <div className="text-white/65 text-xs mt-0.5">
                        {stats.total} people · {stats.ministries} {stats.ministries === 1 ? 'ministry' : 'ministries'}
                      </div>
                      <div className="flex gap-1 mt-2">
                        <CityBadge label="D" count={stats.drivers} />
                        <CityBadge label="T" count={stats.team} />
                        <CityBadge label="M" count={stats.members} />
                      </div>
                    </div>

                    {/* Region selector trigger */}
                    <button
                      onClick={e => openDropdown(city, e)}
                      className="w-full bg-black/20 hover:bg-black/30 px-3 py-1 flex items-center justify-between gap-1 transition-colors"
                    >
                      <span className="text-xs text-white/65 truncate">{label}</span>
                      <span className="text-white/40 text-xs flex-shrink-0">▾</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* ── Ministry DAG ───────────────────────────────────────── */}
          <div className="flex-1 overflow-auto px-4 py-4">
            {activeCity ? (
              <CityDAG
                key={`${activeRegion ?? ''}::${activeCity}`}
                region={activeRegion}
                city={activeCity}
                cityColor={getCityColor(activeCity, allCities)}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                {visibleCities.length > 0
                  ? 'Select a city above to view its ministries'
                  : null}
              </div>
            )}
          </div>

        </div>

        <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
          {activePerson && <ChipPreview person={activePerson} />}
        </DragOverlay>
      </DndContext>

      {/* ── Region picker dropdown (fixed, outside overflow container) ── */}
      {dropdownCity && (
        <div
          ref={dropdownRef}
          className="fixed z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl py-1 min-w-[168px]"
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
        >
          <div className="px-3 py-1.5 text-xs text-slate-400 font-medium border-b border-slate-700 mb-1">
            Assign to regions
          </div>
          {namedRegions.map(r => {
            const overrides = cityRegionOverrides[dropdownCity] ?? [];
            const checked = overrides.length > 0
              ? overrides.includes(r)
              : r === activeRegion;
            return (
              <label
                key={r}
                className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-700 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={e => setCityRegionActive(dropdownCity, r, e.target.checked)}
                  className="accent-indigo-400 w-3.5 h-3.5"
                />
                <span className="text-sm text-slate-200">{r}</span>
              </label>
            );
          })}
        </div>
      )}

      <PersonDetailModal />
    </>
  );
}

function CityBadge({ label, count }) {
  return (
    <span className="text-xs bg-black/25 text-white/85 rounded px-1.5 py-0.5 font-medium">
      {label}{count}
    </span>
  );
}
