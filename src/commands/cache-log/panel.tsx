import React, { useMemo, useState } from 'react';
import { Box, Dialog, Text, useInput } from '@anthropic/ink';
import type { LocalJSXCommandOnDone } from '../../types/command.js';
import { getCacheHistory, getCacheHistoryStats, type CacheHistoryEntry } from '../../utils/cacheHistory.js';

// ---------------------------------------------------------------------------
// Column widths
// ---------------------------------------------------------------------------
const TURN_COL_WIDTH = 4;
const TIME_COL_WIDTH = 5;
const RATE_COL_WIDTH = 6;
const MODEL_COL_WIDTH = 10;
const READ_COL_WIDTH = 6;
const WRITE_COL_WIDTH = 6;
const CMP_COL_WIDTH = 3;

function formatCountdown(msAgo: number): string {
  if (msAgo < 60_000) return '<1m';
  if (msAgo < 3_600_000) return `${Math.floor(msAgo / 60_000)}m`;
  return `${Math.floor(msAgo / 3_600_000)}h`;
}

function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function getTrendIcon(trend: string): string {
  switch (trend) {
    case 'up':
      return '↑';
    case 'down':
      return '↓';
    case 'stable':
      return '→';
    default:
      return '—';
  }
}

function hitRateColor(rate: number | null): string {
  if (rate === null) return 'inactive';
  if (rate >= 80) return 'success';
  if (rate >= 50) return 'warning';
  return 'error';
}

const SCROLL_PAGE_SIZE = 5;

function CacheLogPanel({ onDone }: { onDone: LocalJSXCommandOnDone }): React.ReactNode {
  const entries = useMemo(() => getCacheHistory().slice().reverse(), []);
  const stats = useMemo(() => getCacheHistoryStats(), []);

  const [scrollOffset, setScrollOffset] = useState(0);
  const maxScroll = Math.max(0, entries.length - 1);

  useInput((_input, key) => {
    if (key.upArrow) {
      setScrollOffset(o => Math.max(0, o - 1));
      return;
    }
    if (key.downArrow) {
      setScrollOffset(o => Math.min(maxScroll, o + 1));
      return;
    }
    if (key.pageUp) {
      setScrollOffset(o => Math.max(0, o - SCROLL_PAGE_SIZE));
      return;
    }
    if (key.pageDown) {
      setScrollOffset(o => Math.min(maxScroll, o + SCROLL_PAGE_SIZE));
      return;
    }
    if (key.return || key.escape) {
      onDone('', { display: 'skip' });
    }
  });

  const now = Date.now();
  const visibleStart = scrollOffset;
  const visibleEnd = Math.min(entries.length, visibleStart + SCROLL_PAGE_SIZE);
  const visible = entries.slice(visibleStart, visibleEnd);

  // Rate bar helper
  const renderRateBar = (entry: CacheHistoryEntry, index: number) => {
    const isHovered = index === scrollOffset;
    const prefix = isHovered ? '›' : ' ';
    const hRate = entry.hitRate;
    const hRateStr = hRate !== null ? `${String(hRate).padStart(3)}%` : '  --';
    const modelShort = entry.model.replace(/^claude-/, '').slice(0, 9);
    const compactStr = entry.isCompacted ? ' ✓' : '';

    return (
      <Box key={`${entry.turn}-${entry.timestamp}`} flexDirection="row">
        <Text color={isHovered ? 'success' : undefined}>
          {`${prefix} ${String(entry.turn).padStart(2)}`.padEnd(TURN_COL_WIDTH)}
        </Text>
        <Text dimColor={!isHovered}>
          {formatCountdown(now - entry.timestamp).padStart(TIME_COL_WIDTH)}
          {'  '}
        </Text>
        <Text color={hitRateColor(hRate) as 'success' | 'warning' | 'error' | 'inactive'}>
          {hRateStr.padEnd(RATE_COL_WIDTH)}
        </Text>
        <Text dimColor>
          {modelShort.padEnd(MODEL_COL_WIDTH)}
          {`R${formatTokenCount(entry.cacheReadTokens).padStart(4)}`.padEnd(READ_COL_WIDTH)}
          {`W${formatTokenCount(entry.cacheCreateTokens).padStart(4)}`.padEnd(WRITE_COL_WIDTH)}
          {compactStr.padEnd(CMP_COL_WIDTH)}
        </Text>
      </Box>
    );
  };

  return (
    <Dialog
      title="缓存命中率日志"
      subtitle={`${entries.length} 轮（最近 20 轮）`}
      onCancel={() => onDone('', { display: 'skip' })}
      color="background"
      hideInputGuide
    >
      <Box flexDirection="column" gap={0}>
        {/* Summary */}
        <Box flexDirection="row" gap={2}>
          <Text dimColor>平均命中率</Text>
          <Text color={hitRateColor(stats.avgHitRate) as 'success' | 'warning' | 'error' | 'inactive'}>
            {stats.avgHitRate !== null ? `${stats.avgHitRate}%` : '--'}
          </Text>
          <Text>{getTrendIcon(stats.trend)}</Text>
        </Box>
        <Box flexDirection="row" gap={2}>
          <Text dimColor>
            {`总读 ${formatTokenCount(stats.totalCacheRead)}  总写 ${formatTokenCount(stats.totalCacheCreate)}`}
          </Text>
        </Box>

        {/* Column header */}
        <Box marginTop={1}>
          <Text dimColor>
            {`  # `.padEnd(TURN_COL_WIDTH)}
            {` 时间`.padEnd(TIME_COL_WIDTH + 2)}
            {` 命中率`.padEnd(RATE_COL_WIDTH)}
            {` 模型`.padEnd(MODEL_COL_WIDTH)}
            {` R令牌`.padEnd(READ_COL_WIDTH)}
            {` W令牌`.padEnd(WRITE_COL_WIDTH)}
            {` 压缩`}
          </Text>
        </Box>

        {/* Divider */}
        <Text dimColor>{'—'.repeat(52)}</Text>

        {/* Rows */}
        {visible.map((entry, idx) => renderRateBar(entry, visibleStart + idx))}

        {entries.length === 0 && <Text dimColor>暂无缓存数据（等待首轮 API 调用）</Text>}

        {/* Footer */}
        <Box marginTop={1}>
          <Text dimColor>{`↑/↓ 滚动  PgUp/PgDn 翻页  Enter/Esc 退出  /break-cache 管理缓存`}</Text>
        </Box>
      </Box>
    </Dialog>
  );
}

export async function call(onDone: LocalJSXCommandOnDone, _context: unknown, args?: string): Promise<React.ReactNode> {
  if (args?.trim()) {
    const { callCacheLog } = await import('./index.js');
    const result = await callCacheLog(args);
    if (result.type === 'text') {
      onDone(result.value, { display: 'system' });
    }
    return null;
  }
  return <CacheLogPanel onDone={onDone} />;
}
