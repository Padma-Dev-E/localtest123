type CacheEntry<T> = {
  expiresAt: number;
  value?: T;
  pending?: Promise<T>;
};

const entries = new Map<string, CacheEntry<unknown>>();

export async function cached<T>(key: string, loader: () => Promise<T>, ttlMs = 30_000): Promise<T> {
  const now = Date.now();
  const existing = entries.get(key) as CacheEntry<T> | undefined;
  if (existing && existing.expiresAt > now) {
    if (existing.pending) return existing.pending;
    if (existing.value !== undefined) return existing.value;
  }

  const pending = loader();
  entries.set(key, { expiresAt: now + ttlMs, pending });
  try {
    const value = await pending;
    entries.set(key, { expiresAt: Date.now() + ttlMs, value });
    return value;
  } catch (error) {
    entries.delete(key);
    throw error;
  }
}
