import { realpathSync } from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { getPlatform } from '../../utils/platform.js'
import {
  scanLargeFiles,
  readCbmignore,
  isExcluded,
  type LargeFileScanResult,
} from '../../utils/largeFileScan.js'

const __filename = fileURLToPath(import.meta.url)

/**
 * Resolve the vendored codebase-memory-mcp binary path.
 *
 * Uses the same pattern as ripgrep.ts: locate the 'dist' directory
 * (or src/ in dev mode), then find the vendored binary at
 * `vendor/codebase-memory/<arch>-<platform>/codebase-memory-mcp`.
 *
 * Falls back to env var CODEBASE_MEMORY_MCP_COMMAND or system PATH.
 */
export function codebaseMemoryBinaryPath(): string {
  // Allow explicit override via env var (same as ripgrep's USE_BUILTIN_RIPGREP)
  const envCommand = process.env.CODEBASE_MEMORY_MCP_COMMAND
  if (envCommand) return envCommand

  const platform = getPlatform()
  // Map to directory name used in vendor structure
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64'
  const osDir =
    platform === 'windows'
      ? 'win32'
      : platform === 'macos'
        ? 'darwin'
        : platform === 'linux'
          ? 'linux'
          : undefined

  if (!osDir) {
    // Unknown platform — fall back to looking for the binary on PATH
    return 'codebase-memory-mcp'
  }

  const ext = platform === 'windows' ? '.exe' : ''

  // Resolve the vendor root: same algorithm as ripgrep.ts
  const dir = path.dirname(__filename)
  const parts = dir.split(path.sep)
  const distIdx = parts.lastIndexOf('dist')

  let vendorRoot: string
  if (distIdx !== -1) {
    // Built mode: from dist/ or dist/chunks/ → dist/vendor/
    vendorRoot = path.resolve(
      parts.slice(0, distIdx + 1).join(path.sep),
      'vendor',
    )
  } else {
    // Dev mode: from src/services/mcp/ → src/utils/vendor/
    vendorRoot = path.resolve(dir, '../../utils/vendor')
  }

  const binaryPath = path.resolve(
    vendorRoot,
    'codebase-memory',
    `${arch}-${osDir}`,
    `codebase-memory-mcp${ext}`,
  )

  try {
    // Verify the binary exists and is accessible
    realpathSync(binaryPath)
    return binaryPath
  } catch {
    // Fall back to the user-installed location, then PATH
    if (platform === 'windows' && process.env.LOCALAPPDATA) {
      const localAppPath = path.resolve(
        process.env.LOCALAPPDATA,
        'codebase-memory-mcp',
        `codebase-memory-mcp${ext}`,
      )
      try {
        realpathSync(localAppPath)
        return localAppPath
      } catch {
        // fall through
      }
    }
    // Last resort: assume it's on PATH
    return `codebase-memory-mcp${ext}`
  }
}

// ---------------------------------------------------------------------------
// safeIndexRepository — large-file safety check before indexing
// ---------------------------------------------------------------------------

export interface SafeIndexResult {
  /** Whether it's safe to proceed with indexing (no large unexcluded files). */
  safe: boolean
  /** Human-readable warning message if unsafe. */
  warning: string | null
  /** Paths of large files not covered by .cbmignore. */
  unexcludedLargeFiles: string[]
  /** Raw scan result for detailed UI display. */
  scan: LargeFileScanResult
}

/**
 * Scan the project for large files that could crash codebase-memory-mcp
 * during `index_repository`.
 *
 * Call this BEFORE `index_repository`. If the result has `safe: false`,
 * show the warning to the user and let them decide whether to proceed.
 */
export async function safeIndexRepository(
  cwd: string,
): Promise<SafeIndexResult> {
  const scan = await scanLargeFiles(cwd)

  if (scan.unexcludedCount === 0) {
    return { safe: true, warning: null, unexcludedLargeFiles: [], scan }
  }

  const rules = readCbmignore(cwd)
  const unexcluded = scan.largeFiles
    .filter(f => !isExcluded(f.path, rules))
    .map(f => f.path)

  const topPaths = unexcluded.slice(0, 5).join('\n  ')
  const more =
    unexcluded.length > 5
      ? `\n  ... 及其他 ${unexcluded.length - 5} 个文件`
      : ''

  const warning = [
    `⚠ 检测到 ${unexcluded.length} 个大文件未在 .cbmignore 中排除：`,
    `  ${topPaths}${more}`,
    '',
    scan.cbmignoreExists
      ? '建议编辑 .cbmignore 排除这些文件后再索引，避免崩溃。'
      : '建议先创建 .cbmignore 排除这些文件（/config → 索引规则）。',
    '大文件（>1MB 的数据/资源文件）可能导致索引进程崩溃（已知内存 bug）。',
  ].join('\n')

  return {
    safe: false,
    warning,
    unexcludedLargeFiles: unexcluded,
    scan,
  }
}
