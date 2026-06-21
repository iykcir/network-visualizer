import { useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core';
import CityColumn from './CityColumn';
import { ChipPreview } from './PersonChip';
import useStore from '../store/useStore';
import { getCityColor } from '../utils/colors';

export default function Board() {
  const getVisibleCities = useStore(s => s.getVisibleCities);
  const getAllCities = useStore(s => s.getAllCities);
  const movePerson = useStore(s => s.movePerson);
  const people = useStore(s => s.people);

  const [activePerson, setActivePerson] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const visibleCities = getVisibleCities();
  const allCities = getAllCities();

  function handleDragStart({ active }) {
    const person = people.find(p => p.id === active.id);
    setActivePerson(person ?? null);
  }

  function handleDragEnd({ active, over }) {
    setActivePerson(null);
    if (!over) return;

    // over.id format: "city::ministry::role"
    const parts = over.id.split('::');
    if (parts.length !== 3) return;
    const [toCity, toMinistry, toRole] = parts;

    const person = people.find(p => p.id === active.id);
    if (!person) return;

    if (
      person.city === toCity &&
      person.ministryName === toMinistry &&
      person.role === toRole
    ) return;

    movePerson(active.id, toCity, toMinistry, toRole);
  }

  if (visibleCities.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
        No cities match your filter.
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-4 h-full px-4 pb-4 pt-2" style={{ minWidth: 'max-content' }}>
          {visibleCities.map(city => (
            <CityColumn
              key={city}
              city={city}
              cityColor={getCityColor(city, allCities)}
            />
          ))}
        </div>
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
        {activePerson && <ChipPreview person={activePerson} />}
      </DragOverlay>
    </DndContext>
  );
}
