import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const ROLE_ORDER = ['driver', 'team', 'member'];

function normalizeRole(val) {
  const s = String(val ?? '').toLowerCase().trim();
  if (s.includes('driver')) return 'driver';
  if (s.includes('team') || s.includes('staff') || s.includes('lead')) return 'team';
  return 'member';
}

function uid() {
  return crypto.randomUUID();
}

const useStore = create(
  persist(
    (set, get) => ({
      // ── Import state ───────────────────────────────────────────────────────
      rawHeaders: [],
      rawRows: [],

      // ── Field mapping (persisted across sessions) ──────────────────────────
      mapping: {
        name: '',
        city: '',
        ministry: '',
        role: '',
        additionalFields: [], // [{ column, label, aggregate: 'sum'|'avg'|'count' }]
      },

      // ── Working people array ───────────────────────────────────────────────
      people: [],

      // ── UI state ───────────────────────────────────────────────────────────
      selectedCities: [],   // [] = all cities visible
      searchQuery: '',
      showExport: false,

      // ── Actions ───────────────────────────────────────────────────────────
      setRawData: (rawRows, rawHeaders) => set({ rawRows, rawHeaders }),

      setMapping: (mapping) => set({ mapping }),

      importData: (rawRows, rawHeaders, mapping) => {
        const people = rawRows
          .flatMap(row => {
            const name = String(row[mapping.name] ?? '').trim();
            const city = String(row[mapping.city] ?? '').trim();
            const role = normalizeRole(row[mapping.role]);
            if (!name || !city) return [];

            // Support semicolon, pipe, or comma-separated ministries in one cell
            const ministryRaw = String(row[mapping.ministry] ?? '').trim();
            const ministries = ministryRaw
              .split(/\s*[;|,]\s*/)
              .map(m => m.trim())
              .filter(Boolean);

            // Fall back to the raw value if splitting produced nothing
            const ministryList = ministries.length > 0 ? ministries : [ministryRaw];
            if (!ministryList[0]) return [];

            const extra = {};
            (mapping.additionalFields ?? []).forEach(f => {
              extra[f.label] = row[f.column];
            });

            return ministryList.map(ministryName => ({
              id: uid(),
              name,
              city,
              ministryName,
              role,
              extra,
              _raw: row,
              _originalCity: city,
              _originalMinistry: ministryName,
              _originalRole: role,
            }));
          });

        set({ rawRows, rawHeaders, mapping, people });
      },

      movePerson: (personId, toCity, toMinistry, toRole) => {
        set(state => ({
          people: state.people.map(p =>
            p.id === personId
              ? { ...p, city: toCity, ministryName: toMinistry, role: toRole }
              : p
          ),
        }));
      },

      setSearchQuery: (q) => set({ searchQuery: q }),

      toggleCityFilter: (city) => {
        const { selectedCities } = get();
        set({
          selectedCities: selectedCities.includes(city)
            ? selectedCities.filter(c => c !== city)
            : [...selectedCities, city],
        });
      },

      clearCityFilter: () => set({ selectedCities: [] }),

      setShowExport: (v) => set({ showExport: v }),

      reset: () => set({
        rawHeaders: [], rawRows: [], people: [],
        selectedCities: [], searchQuery: '', showExport: false,
      }),

      // ── Derived helpers ───────────────────────────────────────────────────
      getAllCities: () => {
        return [...new Set(get().people.map(p => p.city))].sort();
      },

      getVisibleCities: () => {
        const { people, selectedCities, searchQuery } = get();
        const allCities = [...new Set(people.map(p => p.city))].sort();
        const filtered = selectedCities.length > 0
          ? allCities.filter(c => selectedCities.includes(c))
          : allCities;

        if (!searchQuery.trim()) return filtered;
        const q = searchQuery.toLowerCase();
        return filtered.filter(city =>
          people.some(p =>
            p.city === city && (
              p.name.toLowerCase().includes(q) ||
              p.ministryName.toLowerCase().includes(q) ||
              p.city.toLowerCase().includes(q)
            )
          )
        );
      },

      getMinistriesInCity: (city) => {
        return [...new Set(
          get().people.filter(p => p.city === city).map(p => p.ministryName)
        )].sort();
      },

      getPeopleInMinistry: (city, ministryName) => {
        const { people, searchQuery } = get();
        const inMinistry = people.filter(p => p.city === city && p.ministryName === ministryName);
        if (!searchQuery.trim()) return inMinistry;
        const q = searchQuery.toLowerCase();
        return inMinistry.filter(p =>
          p.name.toLowerCase().includes(q) ||
          p.ministryName.toLowerCase().includes(q)
        );
      },

      getMinistryStats: (city, ministryName) => {
        const people = get().people.filter(
          p => p.city === city && p.ministryName === ministryName
        );
        const counts = { driver: 0, team: 0, member: 0, total: people.length };
        people.forEach(p => { counts[p.role] = (counts[p.role] || 0) + 1; });

        const { mapping } = get();
        const aggregates = (mapping.additionalFields ?? []).map(f => {
          const vals = people.map(p => Number(p.extra[f.label])).filter(v => !isNaN(v));
          let value = 0;
          if (f.aggregate === 'sum') value = vals.reduce((a, b) => a + b, 0);
          else if (f.aggregate === 'avg') value = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
          else if (f.aggregate === 'count') value = vals.filter(v => v > 0).length;
          return { label: f.label, value: f.aggregate === 'avg' ? value.toFixed(1) : value };
        });

        return { ...counts, aggregates };
      },

      getCityStats: (city) => {
        const people = get().people.filter(p => p.city === city);
        const ministries = [...new Set(people.map(p => p.ministryName))];
        return {
          total: people.length,
          ministries: ministries.length,
          drivers: people.filter(p => p.role === 'driver').length,
          team: people.filter(p => p.role === 'team').length,
          members: people.filter(p => p.role === 'member').length,
        };
      },

      getChanges: () => {
        return get().people.filter(p =>
          p.city !== p._originalCity ||
          p.ministryName !== p._originalMinistry ||
          p.role !== p._originalRole
        );
      },
    }),
    {
      name: 'network-visualizer-v1',
      partialize: state => ({ mapping: state.mapping }),
    }
  )
);

export { ROLE_ORDER };
export default useStore;
