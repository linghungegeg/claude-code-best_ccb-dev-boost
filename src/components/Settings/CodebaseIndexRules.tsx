import * as React from 'react';
import { useState, useEffect } from 'react';
import { Box, Text, useInput } from '@anthropic/ink';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';
import { getCwd } from '../../utils/cwd.js';
import { getPlatform } from '../../utils/platform.js';
import { isExcluded } from '../../utils/largeFileScan.js';
import { safeIndexRepository } from '../../services/mcp/codebaseMemory.js';

type Props = {
  onDone: () => void;
};

function openInEditor(filePath: string): void {
  const platform = getPlatform();
  // Create the file if it doesn't exist, so Windows doesn't pop a "file not found" dialog
  if (!existsSync(filePath)) {
    try {
      writeFileSync(filePath, '', 'utf-8');
    } catch {
      // Can't create — just try to open anyway
    }
  }
  try {
    if (platform === 'windows') {
      execSync(`start "" "${filePath}"`, { shell: 'cmd.exe' });
    } else if (platform === 'macos') {
      execSync(`open "${filePath}"`);
    } else {
      execSync(`xdg-open "${filePath}"`);
    }
  } catch {
    // Fallback: just show the path
  }
}

export function CodebaseIndexRules({ onDone }: Props): React.ReactNode {
  const cwd = getCwd();
  const cbmignorePath = resolve(cwd, '.cbmignore');
  const [content, setContent] = useState<string | null>(null);
  const [showOpenedHint, setShowOpenedHint] = useState(false);
  const [safetyResult, setSafetyResult] = useState<Awaited<ReturnType<typeof safeIndexRepository>> | null>(null);

  // Safety check on mount
  useEffect(() => {
    safeIndexRepository(cwd)
      .then(setSafetyResult)
      .catch(() => setSafetyResult(null));
  }, [cwd]);

  useEffect(() => {
    if (existsSync(cbmignorePath)) {
      try {
        setContent(readFileSync(cbmignorePath, 'utf-8'));
      } catch {
        setContent('');
      }
    } else {
      setContent('');
    }
  }, [cbmignorePath]);

  useInput((input, key) => {
    if (key.escape) {
      onDone();
      return;
    }
    if (input === 'e' && !key.ctrl) {
      openInEditor(cbmignorePath);
      setShowOpenedHint(true);
      return;
    }
    if (input === 'r' && !key.ctrl) {
      // Reload file content
      if (existsSync(cbmignorePath)) {
        try {
          setContent(readFileSync(cbmignorePath, 'utf-8'));
        } catch {
          setContent('');
        }
      }
      setShowOpenedHint(false);
    }
  });

  const largeRules: string[] =
    content !== null && content.length > 0
      ? content
          .split('\n')
          .map(l => l.trim())
          .filter(l => l && !l.startsWith('#'))
      : [];

  const largeScan = safetyResult?.scan ?? null;
  const safetyWarning = safetyResult?.warning ?? null;

  const largeWarning =
    largeScan && largeScan.unexcludedCount > 0
      ? largeScan.largeFiles.filter(f => !isExcluded(f.path, largeRules)).slice(0, 5)
      : [];

  return (
    <Box flexDirection="column" gap={1}>
      {safetyWarning && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="warning">{safetyWarning}</Text>
          {largeWarning.length > 0 && (
            <>
              <Text dimColor>建议排除以下文件：</Text>
              {largeWarning.map(f => (
                <Text key={f.path} dimColor>
                  {'  '}
                  {f.path} ({(f.size / 1_048_576).toFixed(1)}MB)
                </Text>
              ))}
              {largeScan && largeScan.unexcludedCount > 5 && (
                <Text dimColor> ... 及其他 {largeScan.unexcludedCount - 5} 个文件</Text>
              )}
            </>
          )}
          <Text dimColor>在下方 .cbmignore 中添加规则即可排除。</Text>
        </Box>
      )}
      <Text bold>索引规则 — .cbmignore</Text>
      <Text dimColor>{cbmignorePath}</Text>
      {content !== null && content.length > 0 ? (
        <Box flexDirection="column" marginY={1}>
          <Text dimColor>当前内容:</Text>
          <Text>{content}</Text>
        </Box>
      ) : (
        <Text dimColor>文件不存在。按 e 在编辑器中创建 .cbmignore 来排除不需要索引的文件。</Text>
      )}
      {showOpenedHint && <Text color="success">文件已在外部编辑器中打开，编辑完成后按 r 刷新内容。</Text>}
      <Box marginY={1}>
        <Text dimColor>使用 gitignore 语法。每行一个规则。例如跳过图片和数据文件：</Text>
        <Text>{'\n# 跳过贴图\n*.png\n*.jpg\n\n# 跳过数据文件\nclient/cfg/'}</Text>
      </Box>
      <Text>
        <Text color="suggestion">e</Text> 在编辑器中打开 | <Text color="suggestion">r</Text> 刷新内容 |{' '}
        <Text color="suggestion">Esc</Text> 返回
      </Text>
      <Text dimColor>编辑完成后，重新开启索引开关即可生效。</Text>
    </Box>
  );
}
