/**
 * Ring buffer that records the last 20 turns of prompt-cache hit-rate data.
 *
 * Hooked into the API response path (claude.ts:checkResponseForCacheBreak
 * site) so every completed turn appends a new entry. Consumers (StatusLine,
 * /cache-log panel) read the buffer to surface per-turn cache behaviour.
 */

import type { QuerySource } from '../constants/querySource.js'
import { computeHitRate, type CacheUsage } from './cacheStats.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CacheHistoryEntry {
  turn: number
  timestamp: number // ms epoch
  hitRate: number | null // 0–100 or null if no denominator
  cacheReadTokens: number
  cacheCreateTokens: number
  inputTokens: number
  model: string
  isCompacted: boolean
  querySource: string
}

export interface CacheHistoryStats {
  avgHitRate: number | null
  trend: 'up' | 'down' | 'stable' | 'insufficient'
  totalCacheRead: number
  totalCacheCreate: number
  totalInput: number
  bestTurn: CacheHistoryEntry | null
  worstTurn: CacheHistoryEntry | null
  recentTurns: number
}

// ---------------------------------------------------------------------------
// Ring buffer
// ---------------------------------------------------------------------------

const MAX_ENTRIES = 20

const historyBuffer: CacheHistoryEntry[] = []

let turnCounter = 0

function nextTurn(): number {
  turnCounter++
  return turnCounter
}

export function recordCacheHistory(
  entry: Omit<CacheHistoryEntry, 'turn'>,
): void {
  historyBuffer.push({ ...entry, turn: nextTurn() })
  if (historyBuffer.length > MAX_ENTRIES) {
    historyBuffer.shift()
  }
}

export function getCacheHistory(): readonly CacheHistoryEntry[] {
  return historyBuffer
}

export function getCacheHistoryStats(): CacheHistoryStats {
  const entries = historyBuffer
  if (entries.length === 0) {
    return {
      avgHitRate: null,
      trend: 'insufficient',
      totalCacheRead: 0,
      totalCacheCreate: 0,
      totalInput: 0,
      bestTurn: null,
      worstTurn: null,
      recentTurns: 0,
    }
  }

  let totalCacheRead = 0
  let totalCacheCreate = 0
  let totalInput = 0
  let hitRateSum = 0
  let hitRateCount = 0
  let bestTurn: CacheHistoryEntry | null = null
  let worstTurn: CacheHistoryEntry | null = null

  for (const e of entries) {
    totalCacheRead += e.cacheReadTokens
    totalCacheCreate += e.cacheCreateTokens
    totalInput += e.inputTokens
    if (e.hitRate !== null) {
      hitRateSum += e.hitRate
      hitRateCount++
    }
    if (
      e.hitRate !== null &&
      (bestTurn === null || e.hitRate > (bestTurn.hitRate ?? 0))
    ) {
      bestTurn = e
    }
    if (
      e.hitRate !== null &&
      (worstTurn === null || e.hitRate < (worstTurn.hitRate ?? 100))
    ) {
      worstTurn = e
    }
  }

  const avgHitRate =
    hitRateCount > 0 ? Math.round(hitRateSum / hitRateCount) : null

  // Trend from first half → second half (min 3 entries per half)
  let trend: CacheHistoryStats['trend'] = 'stable'
  if (entries.length >= 6) {
    const mid = Math.floor(entries.length / 2)
    const firstHalf = entries.slice(0, mid)
    const secondHalf = entries.slice(mid)
    const firstAvg =
      firstHalf
        .map(e => e.hitRate)
        .filter((h): h is number => h !== null)
        .reduce((a, b) => a + b, 0) /
        firstHalf.filter(e => e.hitRate !== null).length || 0
    const secondAvg =
      secondHalf
        .map(e => e.hitRate)
        .filter((h): h is number => h !== null)
        .reduce((a, b) => a + b, 0) /
        secondHalf.filter(e => e.hitRate !== null).length || 0
    if (secondAvg - firstAvg > 5) trend = 'up'
    else if (firstAvg - secondAvg > 5) trend = 'down'
  }

  return {
    avgHitRate,
    trend,
    totalCacheRead,
    totalCacheCreate,
    totalInput,
    bestTurn,
    worstTurn,
    recentTurns: entries.length,
  }
}

/**
 * Convienience: record from the raw usage + model / source info that is
 * available at the API response site.
 */
export function recordCacheHistoryFromUsage(
  usage: CacheUsage,
  model: string,
  querySource: QuerySource,
  isCompacted: boolean,
): void {
  recordCacheHistory({
    timestamp: Date.now(),
    hitRate: computeHitRate(usage),
    cacheReadTokens: usage.cache_read_input_tokens,
    cacheCreateTokens: usage.cache_creation_input_tokens,
    inputTokens: usage.input_tokens,
    model,
    isCompacted,
    querySource,
  })
}

/**
 * Reset the ring buffer (used in tests / session restarts).
 */
export function resetCacheHistory(): void {
  historyBuffer.length = 0
  turnCounter = 0
}
