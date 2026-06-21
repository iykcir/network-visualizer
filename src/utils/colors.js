// City accent colors — auto-assigned in order, cycling if > 8 cities
const CITY_PALETTE = [
  '#6366f1', // indigo
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ef4444', // red
  '#14b8a6', // teal
];

const cache = {};

export function getCityColor(city, allCities) {
  if (!cache[city]) {
    const idx = allCities.indexOf(city);
    cache[city] = CITY_PALETTE[idx % CITY_PALETTE.length];
  }
  return cache[city];
}

export const ROLE_STYLES = {
  driver: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    chip: 'bg-amber-100 text-amber-800 border-amber-200',
    dot: 'bg-amber-400',
    label: 'Drivers',
    icon: '🚗',
  },
  team: {
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    chip: 'bg-sky-100 text-sky-800 border-sky-200',
    dot: 'bg-sky-400',
    label: 'Team',
    icon: '👥',
  },
  member: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    chip: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-400',
    label: 'Members',
    icon: '✦',
  },
};
