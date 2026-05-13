import { getIsNonInteractiveSession } from '../../bootstrap/state.js'
import type { Command, LocalCommandResult } from '../../types/command.js'
import {
  getCacheHistory,
  getCacheHistoryStats,
} from '../../utils/cacheHistory.js'

function formatCountdown(msAgo: number): string {
  if (msAgo < 60_000) return '<1m'
  if (msAgo < 3_600_000) return `${Math.floor(msAgo / 60_000)}m`
  return `${Math.floor(msAgo / 3_600_000)}h`
}

function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function getTrendIcon(trend: string): string {
  switch (trend) {
    case 'up':
      return '↑'
    case 'down':
      return '↓'
    case 'stable':
      return '→'
    default:
      return '—'
  }
}

export async function callCacheLog(_args: string): Promise<LocalCommandResult> {
  const stats = getCacheHistoryStats()
  const entries = getCacheHistory()
  const now = Date.now()

  if (entries.length === 0) {
    return {
      type: 'text',
      value: '缓存日志为空（尚无 API 调用记录）',
    }
  }

  const header = [
    '## 缓存命中率日志',
    '',
    `  平均命中率:  ${stats.avgHitRate !== null ? `${stats.avgHitRate}%` : '--'}`,
    `  趋势:        ${getTrendIcon(stats.trend)} ${stats.trend}`,
    `  总缓存读取:  ${formatTokenCount(stats.totalCacheRead)} tokens`,
    `  总缓存写入:  ${formatTokenCount(stats.totalCacheCreate)} tokens`,
    `  最近轮次:    ${stats.recentTurns}`,
    '',
    '  # |  时间 | 命中率 |   模型   | 读缓存 | 写缓存 | 压缩',
    '---|------|-------|---------|-------|-------|-----',
  ].join('\n')

  const rows = entries
    .slice()
    .reverse()
    .map(e => {
      const ago = now - e.timestamp
      const hitRateStr =
        e.hitRate !== null ? `${String(e.hitRate).padStart(3)}%` : '  --'
      const compactStr = e.isCompacted ? '  ✓' : ''
      const modelShort = e.model.replace(/^claude-/, '').slice(0, 12)
      return `  ${String(e.turn).padStart(2)} | ${formatCountdown(ago).padStart(3)} | ${hitRateStr} | ${modelShort.padEnd(7)} | ${formatTokenCount(e.cacheReadTokens).padStart(5)} | ${formatTokenCount(e.cacheCreateTokens).padStart(5)} |${compactStr}`
    })

  return {
    type: 'text',
    value: [header, ...rows].join('\n'),
  }
}

export const cacheLogNonInteractive: Command = {
  type: 'local',
  name: 'cache-log',
  description: '查看最近 20 轮缓存命中率日志',
  isHidden: false,
  isEnabled: () => true,
  supportsNonInteractive: true,
  bridgeSafe: true,
  load: async () => ({
    call: (_args: string) => callCacheLog(_args),
  }),
}

const cacheLog: Command = {
  type: 'local-jsx',
  name: 'cache-log',
  description: '查看最近 20 轮缓存命中率日志',
  isHidden: false,
  isEnabled: () => !getIsNonInteractiveSession(),
  argumentHint: '',
  bridgeSafe: true,
  getBridgeInvocationError: () => undefined,
  load: () => import('./panel.js'),
}

export default cacheLog
