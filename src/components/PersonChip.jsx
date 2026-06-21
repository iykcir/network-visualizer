import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { ROLE_STYLES } from '../utils/colors';

export default function PersonChip({ person, compact = false }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: person.id,
    data: { person },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.35 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    zIndex: isDragging ? 50 : undefined,
  };

  const { chip } = ROLE_STYLES[person.role];

  return (
    <span
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      title={`${person.name} — ${person.role}`}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border select-none transition-shadow
        ${chip}
        ${isDragging ? '' : 'hover:shadow-sm hover:scale-105'}
        ${compact ? '' : ''}
      `}
    >
      {person.name}
    </span>
  );
}

// Standalone chip for the drag overlay (no drag hooks — just visual)
export function ChipPreview({ person }) {
  const { chip } = ROLE_STYLES[person.role];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border shadow-xl rotate-2 ${chip}`}
    >
      {person.name}
    </span>
  );
}
