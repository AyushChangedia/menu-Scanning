/** "Today", "Yesterday", "4 days ago", then "12 Oct". */
export function formatWhen(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(date)) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** SATURDAY · DINNER — before 11:00 breakfast, before 16:00 lunch, else dinner. */
export function mealEyebrow(now = new Date()): string {
  const weekday = now.toLocaleDateString("en-IN", { weekday: "long" });
  const hour = now.getHours();
  const meal = hour < 11 ? "Breakfast" : hour < 16 ? "Lunch" : "Dinner";
  return `${weekday} · ${meal}`;
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}
