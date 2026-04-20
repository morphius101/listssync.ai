export function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'object' && 'seconds' in (value as any)) {
    const d = new Date((value as any).seconds * 1000);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}
