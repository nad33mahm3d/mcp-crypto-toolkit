interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class Cache {
  private store = new Map<string, CacheEntry<unknown>>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    const existingTimer = this.timers.get(key);
    if (existingTimer) clearTimeout(existingTimer);

    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });

    const timer = setTimeout(() => {
      this.delete(key);
    }, ttlMs);
    timer.unref?.();
    this.timers.set(key, timer);
  }

  clear(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.store.clear();
  }

  private delete(key: string): void {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
    this.store.delete(key);
  }
}

export const priceCache = new Cache();
export const gasCache = new Cache();
export const historicalCache = new Cache();
export const pkrCache = new Cache();

export const TTL = {
  PRICE: 60_000,
  GAS: 15_000,
  HISTORICAL: 3_600_000,
  PKR: 300_000,
  SEARCH: 120_000,
} as const;
