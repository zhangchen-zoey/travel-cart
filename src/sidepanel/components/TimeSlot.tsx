import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ItemCard } from './ItemCard';
import { GapIndicator } from './GapIndicator';
import { useCartStore } from '../store/cartStore';
import type { CartItem } from '../../shared/types';

interface TimeSlotProps {
  slotLabel: string;
  items: CartItem[];
  dayDate: string;
}

function SortableItem({ item, nextItem }: { item: CartItem; nextItem?: CartItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ItemCard item={item} />
      {nextItem && <GapIndicator fromItem={item} toItem={nextItem} />}
    </div>
  );
}

export const TimeSlot: React.FC<TimeSlotProps> = ({ slotLabel, items }) => {
  const reorder = useCartStore((s) => s.reorder);
  const allItems = useCartStore((s) => s.items);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const fromIndex = allItems.findIndex((i) => i.id === active.id);
    const toIndex = allItems.findIndex((i) => i.id === over.id);
    if (fromIndex !== -1 && toIndex !== -1) {
      reorder(fromIndex, toIndex);
    }
  };

  return (
    <div className="ml-4">
      <p className="text-xs font-medium text-gray-500 mb-2">{slotLabel}</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <SortableItem key={item.id} item={item} nextItem={items[idx + 1]} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};
