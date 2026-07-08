import { useDroppable } from '@dnd-kit/core';
import PersonChip from './PersonChip';
import { ROLE_STYLES } from '../utils/colors';

// Extract the earliest 4-digit year from a peer class string ("Fall 2019" → 2019).
// People with no peer class sort last.
function peerYear(peerClass) {
  const m = String(peerClass ?? '').match(/\d{4}/);
  return m ? parseInt(m[0], 10) : 9999;
}

// Returns an array of groups: each group is [person] or [person, spouse].
// Groups are sorted oldest-first by the minimum peer year in the group.
// Couples are only paired when both spouses appear in the same role section.
function groupAndSort(people) {
  const used = new Set();
  const groups = [];

  for (const person of people) {
    if (used.has(person.id)) continue;

    const spouseMemId = String(person._raw?.spouse ?? '').trim();
    if (spouseMemId) {
      const spouse = people.find(
        p => !used.has(p.id) && String(p._raw?._membership_id ?? '') === spouseMemId
      );
      if (spouse) {
        used.add(person.id);
        used.add(spouse.id);
        groups.push([person, spouse]);
        continue;
      }
    }

    used.add(person.id);
    groups.push([person]);
  }

  groups.sort((a, b) => {
    const aYear = Math.min(...a.map(p => peerYear(p.peerClass)));
    const bYear = Math.min(...b.map(p => peerYear(p.peerClass)));
    return aYear - bYear;
  });

  return groups;
}

export default function RoleSection({ region, city, ministryName, role, people, isOver }) {
  const droppableId = `${region ?? ''}::${city}::${ministryName}::${role}`;
  const { setNodeRef, isOver: dndIsOver } = useDroppable({ id: droppableId });

  const { bg, border, dot, label } = ROLE_STYLES[role];
  const active = dndIsOver || isOver;

  const groups = groupAndSort(people);

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border p-2 transition-all min-h-[40px]
        ${active ? 'ring-2 ring-indigo-400 ring-offset-1 bg-indigo-50/80' : `${bg} ${border}`}
      `}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          {label}
        </span>
        <span className="ml-auto text-xs text-slate-400 font-medium">{people.length}</span>
      </div>

      {groups.length === 0 ? (
        <p className={`text-xs text-center py-1 transition-opacity ${active ? 'opacity-70 text-indigo-400' : 'text-slate-300'}`}>
          {active ? 'Drop here' : 'Empty'}
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {groups.map(group => (
            <div key={group.map(p => p.id).join('+')} className="flex flex-wrap gap-1">
              {group.map(p => <PersonChip key={p.id} person={p} />)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
