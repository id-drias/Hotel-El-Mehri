export function RoomSpecs({ items }: { items: string[] }) {
  return (
    <ul className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item} className="flex items-center gap-3 text-sm text-ink-500">
          <span className="h-px w-4 shrink-0 bg-gold-500" aria-hidden="true" />
          {item}
        </li>
      ))}
    </ul>
  );
}
