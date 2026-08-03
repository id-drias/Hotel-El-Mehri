import { RoomCard } from './RoomCard';
import { Stagger } from '@/components/motion';
import type { RoomContent } from '@/content/rooms';

export function RoomGrid({ rooms }: { rooms: RoomContent[] }) {
  return (
    // `RoomCard` renders a TiltCard, which already carries the stagger child
    // variant — the parent only has to declare the cascade.
    <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {rooms.map((room, index) => (
        <RoomCard key={room.slug} room={room} priority={index < 2} />
      ))}
    </Stagger>
  );
}
