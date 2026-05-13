import React, { useEffect, useMemo, useState } from 'react';
import { Box, Dialog, Text, useInput } from '@anthropic/ink';
import type { LocalJSXCommandOnDone } from '../../types/command.js';
import { callBreakCache } from './index.js';
import { getCacheBreakSummary } from '../../services/api/promptCacheBreakDetection.js';

type BreakCacheAction = {
  label: string;
  description: string;
  run: () => void;
};

const ACTION_LABEL_COLUMN_WIDTH = 28;

async function runBreakCacheAction(scope: string, onDone: LocalJSXCommandOnDone): Promise<void> {
  const result = await callBreakCache(scope);
  if (result.type === 'text') {
    onDone(result.value, { display: 'system' });
  }
}

function BreakInfoSection(): React.ReactNode {
  const [summary, setSummary] = useState<ReturnType<typeof getCacheBreakSummary>>(null);

  useEffect(() => {
    setSummary(getCacheBreakSummary());
  }, []);

  if (!summary) {
    return (
      <Box marginTop={1}>
        <Text dimColor>暂无缓存破坏记录</Text>
      </Box>
    );
  }

  const ts = summary.lastBreakAt ? new Date(summary.lastBreakAt).toLocaleString('zh-CN') : 'unknown';

  const lines: string[] = [];
  if (summary.prevCacheRead !== null) {
    lines.push(`  cache read: ${summary.prevCacheRead} → ${summary.cacheRead}`);
  }
  if (summary.diffPath) {
    lines.push(`  diff: ${summary.diffPath}`);
  }
  if (summary.details) {
    const d = summary.details;
    if (d.systemPromptChanged) lines.push('  - system prompt');
    if (d.toolSchemasChanged) lines.push(`  - tools (+${d.addedTools.length}/-${d.removedTools.length})`);
    if (d.modelChanged) lines.push('  - model');
    if (d.betasChanged) lines.push('  - betas');
    if (d.effortChanged) lines.push('  - effort');
    if (d.cacheControlChanged) lines.push('  - cache_control');
  }

  return (
    <Box marginTop={1} flexDirection="column">
      <Text bold>上次破坏</Text>
      <Text dimColor>{`  ${ts}`}</Text>
      <Text color="warning">{`  原因: ${summary.reason}`}</Text>
      {lines.length > 0 && <Text dimColor>{lines.join('\n')}</Text>}
    </Box>
  );
}

function BreakCachePanel({ onDone }: { onDone: LocalJSXCommandOnDone }): React.ReactNode {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const actions = useMemo<BreakCacheAction[]>(
    () => [
      {
        label: 'Status',
        description: 'Show pending marker, always mode, and break count',
        run: () => void runBreakCacheAction('status', onDone),
      },
      {
        label: 'Once',
        description: 'Break prompt cache on the next API call only',
        run: () => void runBreakCacheAction('once', onDone),
      },
      {
        label: 'Always',
        description: 'Break prompt cache on every API call',
        run: () => void runBreakCacheAction('always', onDone),
      },
      {
        label: 'Off',
        description: 'Disable always mode and clear pending once marker',
        run: () => void runBreakCacheAction('off', onDone),
      },
      {
        label: 'Clear Once',
        description: 'Cancel the pending one-time cache break',
        run: () => void runBreakCacheAction('--clear', onDone),
      },
    ],
    [onDone],
  );

  const selectCurrent = () => {
    const action = actions[selectedIndex];
    if (!action) return;
    action.run();
  };

  useInput((_input, key) => {
    if (key.upArrow) {
      setSelectedIndex(index => Math.max(0, index - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex(index => Math.min(actions.length - 1, index + 1));
      return;
    }
    if (key.return) {
      selectCurrent();
    }
  });

  return (
    <Dialog
      title="Break Cache"
      subtitle={`${actions.length} actions`}
      onCancel={() => onDone('Break-cache panel dismissed', { display: 'system' })}
      color="background"
      hideInputGuide
    >
      <Box flexDirection="column">
        {actions.map((action, index) => (
          <Box key={action.label} flexDirection="row">
            <Text>{`${index === selectedIndex ? '›' : ' '} ${action.label}`.padEnd(ACTION_LABEL_COLUMN_WIDTH)}</Text>
            <Text dimColor>{action.description}</Text>
          </Box>
        ))}
        <BreakInfoSection />
        <Box marginTop={1}>
          <Text dimColor>↑/↓ select · Enter run · Esc close</Text>
        </Box>
      </Box>
    </Dialog>
  );
}

export async function call(onDone: LocalJSXCommandOnDone, _context: unknown, args?: string): Promise<React.ReactNode> {
  const trimmed = args?.trim() ?? '';
  if (trimmed) {
    await runBreakCacheAction(trimmed, onDone);
    return null;
  }
  return <BreakCachePanel onDone={onDone} />;
}
