/**
 * Service de cache côté client
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
}

class CacheService {
  private cache = new Map<string, CacheEntry<any>>()
  private TTL = 5 * 60 * 1000 // 5 minutes

  get<T>(key: string): T | null {
    const cached = this.cache.get(key)
    if (!cached) return null

    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key)
      return null
    }

    return cached.data as T
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }

  clear(): void {
    this.cache.clear()
  }
}

export const cache = new CacheService()
