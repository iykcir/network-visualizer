import { useDroppable } from '@dnd-kit/core';
import PersonChip from './PersonChip';
import { ROLE_STYLES } from '../utils/colors';

export default function RoleSection({ city, ministryName, role, people, isOver }) {
  const droppableId = `${city}::${ministryName}::${role}`;
  const { setNodeRef, isOver: dndIsOver } = useDroppable({ id: droppableId });

  const { bg, border, dot, label, icon } = ROLE_STYLES[role];
  const active = dndIsOver || isOver;

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

      {people.length === 0 ? (
        <p className={`text-xs text-center py-1 transition-opacity ${active ? 'opacity-70 text-indigo-400' : 'text-slate-300'}`}>
          {active ? 'Drop here' : 'Empty'}
        </p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {people.map(p => (
            <PersonChip key={p.id} person={p} />
          ))}
        </div>
      )}
    </div>
  );
}
