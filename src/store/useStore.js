import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const ROLE_ORDER = ['driver', 'team', 'member'];

export function defaultNormalizeRole(val) {
  const s = String(val ?? '').toLowerCase().trim();
  if (s.split(/[;,|]/).map(v => v.trim()).includes('ft_lead')) return 'driver';
  if (s.includes('team') || s.includes('staff') || s.includes('lead')) return 'team';
  return 'member';
}

function normalizeRole(val, overrides = {}) {
  const raw = String(val ?? '').trim();
  if (overrides[raw] !== undefined) return overrides[raw];
  return defaultNormalizeRole(raw);
}

function uid() {
  return crypto.randomUUID();
}

// Returns true if a city with the given override list should appear in region.
// Overrides replace the natural region — if set, the city only appears in the override regions.
function cityInRegion(city, naturalRegion, region, cityRegionOverrides) {
  const overrides = cityRegionOverrides[city];
  if (overrides && overrides.length > 0) return overrides.includes(region);
  return naturalRegion === region;
}

// When a city has region overrides, person-level region filtering should be skipped
// because people's stored region reflects the original data, not the override.
function effectiveRegionFilter(city, region, cityRegionOverrides) {
  const overrides = cityRegionOverrides[city];
  if (overrides && overrides.length > 0 && overrides.includes(region)) return undefined;
  return region;
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
        region: '',
        children: '',
        peerClass: '',
        roleOverrides: {}, // { rawValue: 'driver'|'team'|'member' }
        additionalFields: [], // [{ column, label, aggregate: 'sum'|'avg'|'count' }]
      },

      // ── Working people array ───────────────────────────────────────────────
      people: [],

      // ── Ministry DAG edges (persisted) ────────────────────────────────────
      // Keyed by "region::city". Each value is an array of { id, source, target }
      // where source/target are ministry names.
      ministryEdges: {},

      // ── City→region overrides (persisted) ─────────────────────────────────
      // Manually pin a city to a specific region when membership data is missing
      // or incorrect. Keyed by city name (as it appears in the church attribute).
      cityRegionOverrides: {},

      // ── API connection config (persisted) ─────────────────────────────────
      apiConfig: {
        proxyBase: '/membership-api', // rewritten by Vite proxy to the membership server
        apiKey: '',
      },

      // ── UI state ───────────────────────────────────────────────────────────
      selectedCities: [],   // [] = all cities visible
      searchQuery: '',
      showExport: false,
      showImport: false,
      selectedPersonId: null,
      apiLoading: false,
      apiError: '',

      // ── Actions ───────────────────────────────────────────────────────────
      setApiConfig: (apiConfig) => set({ apiConfig }),

      // regions is string[] — empty array or omitted clears the override
      setCityRegionOverride: (city, regions) => {
        const overrides = { ...get().cityRegionOverrides };
        if (!regions || regions.length === 0) delete overrides[city];
        else overrides[city] = regions;
        set({ cityRegionOverrides: overrides });
      },

      // autoImport: when true (Header refresh), skip the mapping screen and
      // re-import immediately using the existing mapping. When false (ImportScreen),
      // just load raw data and let the user confirm the mapping step first.
      loadFromAPI: async (autoImport = false) => {
        const { apiConfig, mapping } = get();
        set({ apiLoading: true, apiError: '' });
        try {
          const { fetchMembershipPeople, MEMBERSHIP_FIELD_HINTS } = await import('../utils/membershipApi.js');
          const { rows, headers } = await fetchMembershipPeople(apiConfig.proxyBase, apiConfig.apiKey);
          if (rows.length === 0) throw new Error('No people returned from the API.');
          const prefilledMapping = { ...mapping };
          for (const [vizKey, membershipAttr] of Object.entries(MEMBERSHIP_FIELD_HINTS)) {
            if (headers.includes(membershipAttr)) prefilledMapping[vizKey] = membershipAttr;
          }
          set({ rawRows: rows, rawHeaders: headers, mapping: prefilledMapping, apiLoading: false });
          if (autoImport && prefilledMapping.name && prefilledMapping.city && prefilledMapping.ministry && prefilledMapping.role) {
            get().importData(rows, headers, prefilledMapping);
          }
        } catch (e) {
          set({ apiLoading: false, apiError: e.message });
        }
      },

      setRawData: (rawRows, rawHeaders) => set({ rawRows, rawHeaders }),

      setMapping: (mapping) => set({ mapping }),

      importData: (rawRows, rawHeaders, mapping) => {
        // Pass 1 — create one entry per person × city × ministry × region combination
        const allEntries = rawRows.flatMap(row => {
          const name = String(row[mapping.name] ?? '').trim();
          const role = normalizeRole(row[mapping.role], mapping.roleOverrides ?? {});
          if (!name) return [];

          const regionRaw = mapping.region ? String(row[mapping.region] ?? '').trim() : '';
          const regionList = regionRaw
            ? regionRaw.split(/\s*[;|]\s*/).map(r => r.trim()).filter(Boolean)
            : [''];

          const cityRaw = String(row[mapping.city] ?? '').trim();
          const cityList = cityRaw.split(/\s*[;|]\s*/).map(c => c.trim()).filter(Boolean);
          if (!cityList[0]) return [];

          const ministryRaw = String(row[mapping.ministry] ?? '').trim();
          const ministryList = ministryRaw.split(/\s*[;|,]\s*/).map(m => m.trim()).filter(Boolean);
          if (!ministryList[0]) return [];

          const childrenCount = mapping.children ? Number(row[mapping.children] ?? 0) || 0 : 0;
          const peerClass = mapping.peerClass ? String(row[mapping.peerClass] ?? '').trim() : '';

          const extra = {};
          (mapping.additionalFields ?? []).forEach(f => {
            extra[f.label] = row[f.column];
          });

          const rowId = uid();

          return regionList.flatMap(region =>
            cityList.flatMap(city =>
              ministryList.map(ministryName => ({
                id: uid(),
                _rowId: rowId,
                name,
                region,
                city,
                ministryName,
                role,
                peerClass,
                childrenCount,
                extra,
                _raw: row,
                _originalRegion: region,
                _originalCity: city,
                _originalMinistry: ministryName,
                _originalRole: role,
              }))
            )
          );
        });

        // Pass 2a — compute a canonical region per city across ALL entries.
        // Using the whole-city plurality prevents the same city from appearing
        // under multiple region tabs just because different ministries happen to
        // have a mix of region tags in their member data.
        const cityRegionCounts = {};
        allEntries.forEach(e => {
          const c = e._originalCity;
          const r = e._originalRegion ?? '';
          if (!cityRegionCounts[c]) cityRegionCounts[c] = {};
          cityRegionCounts[c][r] = (cityRegionCounts[c][r] || 0) + 1;
        });
        const cityCanonicalRegion = {};
        Object.entries(cityRegionCounts).forEach(([city, counts]) => {
          const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
          cityCanonicalRegion[city] = top ? top[0] : '';
        });

        // Pass 2b — determine each ministry's home city by plurality of its
        // team + member church values. Drivers (ft_lead / director) are excluded
        // because they are often regional overseers whose home church differs from
        // the city the ministry actually lives in. The region is then taken from
        // the city's canonical region computed above, not per-ministry.
        const allMinistryNames = [...new Set(allEntries.map(e => e.ministryName))];
        const ministryHome = {};

        allMinistryNames.forEach(m => {
          const all = allEntries.filter(e => e.ministryName === m);
          const voters = all.filter(e => e.role !== 'driver');
          const pool = voters.length > 0 ? voters : all;
          const cityCounts = {};
          pool.forEach(e => {
            cityCounts[e._originalCity] = (cityCounts[e._originalCity] || 0) + 1;
          });
          const top = Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0];
          if (!top) return;
          const city = top[0];
          ministryHome[m] = { city, region: cityCanonicalRegion[city] ?? '' };
        });

        // Pass 3 — move non-drivers whose city doesn't match their ministry's
        // home city onto the home city so they appear in the right card.
        const people = allEntries.map(e => {
          const home = ministryHome[e.ministryName];
          if (!home || (e._originalCity === home.city && e._originalRegion === home.region)) return e;
          return {
            ...e,
            city: home.city,
            region: home.region,
            _originalCity: home.city,
            _originalRegion: home.region,
          };
        });

        set({ rawRows, rawHeaders, mapping, people });
      },

      movePerson: (personId, toRegion, toCity, toMinistry, toRole) => {
        set(state => ({
          people: state.people.map(p =>
            p.id === personId
              ? { ...p, region: toRegion, city: toCity, ministryName: toMinistry, role: toRole }
              : p
          ),
        }));
      },

      setSelectedPerson: (id) => set({ selectedPersonId: id }),

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

      setMinistryEdges: (cityKey, edges) =>
        set(state => ({ ministryEdges: { ...state.ministryEdges, [cityKey]: edges } })),

      setShowExport: (v) => set({ showExport: v }),
      setShowImport: (v) => set({ showImport: v }),

      reset: () => set({
        rawHeaders: [], rawRows: [], people: [],
        selectedCities: [], searchQuery: '', showExport: false, showImport: false, selectedPersonId: null,
        apiLoading: false, apiError: '',
      }),

      // ── Derived helpers ───────────────────────────────────────────────────
      // Structural layout (regions → cities → ministries) is always anchored to
      // original import data so cards never move when people are dragged around.
      // Only the people *inside* the cards reflect current assignments.

      getAllRegions: () => {
        const { people, cityRegionOverrides } = get();
        const fromPeople = people.map(p => p._originalRegion ?? '');
        const fromOverrides = Object.values(cityRegionOverrides).flat();
        return [...new Set([...fromPeople, ...fromOverrides])].sort();
      },

      getAllCities: () => {
        return [...new Set(get().people.map(p => p._originalCity))].sort();
      },

      getCitiesInRegion: (region) => {
        return [...new Set(
          get().people
            .filter(p => (p._originalRegion ?? '') === region)
            .map(p => p._originalCity)
        )].sort();
      },

      getVisibleCities: () => {
        const { people, selectedCities, searchQuery } = get();
        const allCities = [...new Set(people.map(p => p._originalCity))].sort();
        const filtered = selectedCities.length > 0
          ? allCities.filter(c => selectedCities.includes(c))
          : allCities;

        if (!searchQuery.trim()) return filtered;
        const q = searchQuery.toLowerCase();
        return filtered.filter(city =>
          people.some(p =>
            p._originalCity === city && (
              p.name.toLowerCase().includes(q) ||
              p._originalMinistry.toLowerCase().includes(q) ||
              p._originalCity.toLowerCase().includes(q)
            )
          )
        );
      },

      getVisibleCitiesInRegion: (region) => {
        const { people, selectedCities, searchQuery, cityRegionOverrides } = get();
        const citiesInRegion = [...new Set(
          people
            .filter(p => cityInRegion(p._originalCity, p._originalRegion ?? '', region, cityRegionOverrides))
            .map(p => p._originalCity)
        )].sort();
        const filtered = selectedCities.length > 0
          ? citiesInRegion.filter(c => selectedCities.includes(c))
          : citiesInRegion;
        if (!searchQuery.trim()) return filtered;
        const q = searchQuery.toLowerCase();
        return filtered.filter(city =>
          people.some(p =>
            p._originalCity === city &&
            cityInRegion(city, p._originalRegion ?? '', region, cityRegionOverrides) && (
              p.name.toLowerCase().includes(q) ||
              p._originalMinistry.toLowerCase().includes(q) ||
              p._originalCity.toLowerCase().includes(q)
            )
          )
        );
      },

      getMinistriesInCity: (city, region) => {
        const { people, cityRegionOverrides } = get();
        const r = region === undefined ? undefined : effectiveRegionFilter(city, region, cityRegionOverrides);
        const base = people.filter(p =>
          p._originalCity === city &&
          (r === undefined || (p._originalRegion ?? '') === r)
        );
        return [...new Set(base.map(p => p._originalMinistry))].sort();
      },

      getPeopleInMinistry: (city, ministryName, region) => {
        const { people, searchQuery, cityRegionOverrides } = get();
        const r = region === undefined ? undefined : effectiveRegionFilter(city, region, cityRegionOverrides);
        const inMinistry = people.filter(p =>
          p.city === city && p.ministryName === ministryName &&
          (r === undefined || (p.region ?? '') === r)
        );
        // Deduplicate by _rowId: multi-city splits that got normalised to the
        // same home city would otherwise produce the same person twice.
        const unique = [...new Map(inMinistry.map(p => [p._rowId, p])).values()];
        if (!searchQuery.trim()) return unique;
        const q = searchQuery.toLowerCase();
        return unique.filter(p =>
          p.name.toLowerCase().includes(q) ||
          p.ministryName.toLowerCase().includes(q)
        );
      },

      getMinistryStats: (city, ministryName, region) => {
        const { cityRegionOverrides } = get();
        const r = region === undefined ? undefined : effectiveRegionFilter(city, region, cityRegionOverrides);
        const all = get().people.filter(p =>
          p.city === city && p.ministryName === ministryName &&
          (r === undefined || (p.region ?? '') === r)
        );
        // Same deduplication as getPeopleInMinistry
        const people = [...new Map(all.map(p => [p._rowId, p])).values()];
        const counts = { driver: 0, team: 0, member: 0, total: people.length };
        people.forEach(p => { counts[p.role] = (counts[p.role] || 0) + 1; });

        const children = people.reduce((sum, p) => sum + (p.childrenCount || 0), 0);

        const { mapping } = get();
        const aggregates = (mapping.additionalFields ?? []).map(f => {
          const vals = people.map(p => Number(p.extra[f.label])).filter(v => !isNaN(v));
          let value = 0;
          if (f.aggregate === 'sum') value = vals.reduce((a, b) => a + b, 0);
          else if (f.aggregate === 'avg') value = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
          else if (f.aggregate === 'count') value = vals.filter(v => v > 0).length;
          return { label: f.label, value: f.aggregate === 'avg' ? value.toFixed(1) : value };
        });

        return { ...counts, children, aggregates };
      },

      getCityStats: (city, region) => {
        const { cityRegionOverrides } = get();
        const r = region === undefined ? undefined : effectiveRegionFilter(city, region, cityRegionOverrides);
        const people = get().people.filter(p =>
          p.city === city && (r === undefined || (p.region ?? '') === r)
        );
        const ministries = [...new Set(people.map(p => p.ministryName))];
        // Deduplicate by _rowId so a person in multiple ministries counts once
        const unique = [...new Map(people.map(p => [p._rowId, p])).values()];
        return {
          total: unique.length,
          ministries: ministries.length,
          children: unique.reduce((sum, p) => sum + (p.childrenCount || 0), 0),
          drivers: unique.filter(p => p.role === 'driver').length,
          team: unique.filter(p => p.role === 'team').length,
          members: unique.filter(p => p.role === 'member').length,
        };
      },

      getRegionStats: (region) => {
        const { cityRegionOverrides, selectedCities } = get();
        let people = get().people.filter(p =>
          cityInRegion(p.city, p.region ?? '', region, cityRegionOverrides)
        );
        if (selectedCities.length > 0) {
          people = people.filter(p => selectedCities.includes(p.city));
        }
        const unique = [...new Map(people.map(p => [p._rowId, p])).values()];
        const cities = [...new Set(people.map(p => p.city))];
        return {
          total: unique.length,
          cities: cities.length,
          children: unique.reduce((sum, p) => sum + (p.childrenCount || 0), 0),
          drivers: unique.filter(p => p.role === 'driver').length,
          team: unique.filter(p => p.role === 'team').length,
          members: unique.filter(p => p.role === 'member').length,
        };
      },

      getChanges: () => {
        return get().people.filter(p =>
          (p.region ?? '') !== (p._originalRegion ?? '') ||
          p.city !== p._originalCity ||
          p.ministryName !== p._originalMinistry ||
          p.role !== p._originalRole
        );
      },
    }),
    {
      name: 'network-visualizer-v1',
      version: 1,
      // v0→v1: cityRegionOverrides values changed from string to string[].
      // Normalize any stored strings so the spread operator doesn't explode them.
      migrate: (persisted) => {
        if (persisted.cityRegionOverrides) {
          const fixed = {};
          Object.entries(persisted.cityRegionOverrides).forEach(([city, val]) => {
            fixed[city] = Array.isArray(val) ? val : (val ? [val] : []);
          });
          persisted.cityRegionOverrides = fixed;
        }
        return persisted;
      },
      partialize: state => ({
        mapping: state.mapping,
        rawHeaders: state.rawHeaders,
        rawRows: state.rawRows,
        people: state.people,
        apiConfig: state.apiConfig,
        ministryEdges: state.ministryEdges,
        cityRegionOverrides: state.cityRegionOverrides,
      }),
    }
  )
);

export { ROLE_ORDER };
export default useStore;
