/**
 * Index health checker.
 *
 * Detects whether the codebase-memory-mcp index may be stale by
 * comparing the current project file count against the indexed node
 * count (from the MCP server). When files change substantially
 * (>20%), the StatusLine shows a reminder to re-index.
 *
 * Also checks whether .cbmignore exists and offers to create one
 * if large data files are detected (delegates to largeFileScan.ts).
 */

import { existsSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IndexHealth {
  totalFiles: number
  indexedNodes: number | null
  isStale: boolean
  changedCount: number
  cbmignoreExists: boolean
  suggestion: string | null
}

// ---------------------------------------------------------------------------
// Simple file counter — skips well-known non-code dirs
// ---------------------------------------------------------------------------

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  '.next',
  'vendor',
  '__pycache__',
  '.venv',
  'venv',
  '.cache',
  '.turbo',
])

async function countProjectFiles(cwd: string): Promise<number> {
  let count = 0

  async function walk(dir: string): Promise<void> {
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue
        if (entry.name.startsWith('.')) continue
        await walk(join(dir, entry.name))
      } else {
        count++
      }
    }
  }

  await walk(cwd)
  return count
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

/** Module-level cache so StatusLine can detect staleness across re-renders
 *  without needing MCP server data on every call. */
let _lastFileCount: number | null = null

/**
 * Check index health for the given project directory.
 *
 * @param cwd - Project root directory
 * @param lastKnownNodes - Number of nodes from the last successful index
 *   (e.g., from index_status MCP tool). Pass null if unknown.
 * @param lastKnownFiles - Total files from the last successful index.
 *   Pass null if unknown. When null, falls back to the module-level
 *   last-seen file count (if available) so staleness can be detected
 *   without MCP round-trips.
 */
export async function checkIndexHealth(
  cwd: string,
  lastKnownNodes: number | null = null,
  lastKnownFiles: number | null = null,
): Promise<IndexHealth> {
  const totalFiles = await countProjectFiles(cwd)
  const cbmignoreExists = existsSync(resolve(cwd, '.cbmignore'))

  // Fall back to the module-level cached file count when caller doesn't
  // provide explicit last-known values (e.g. StatusLine).
  const effectiveLastKnown = lastKnownFiles ?? _lastFileCount
  _lastFileCount = totalFiles

  // Without any last-known data, we can't determine staleness
  if (effectiveLastKnown === null) {
    return {
      totalFiles,
      indexedNodes: lastKnownNodes,
      isStale: false,
      changedCount: 0,
      cbmignoreExists,
      suggestion: cbmignoreExists ? null : '建议创建 .cbmignore 排除大文件',
    }
  }

  const changedCount = Math.abs(totalFiles - effectiveLastKnown)
  const changeRatio =
    effectiveLastKnown > 0 ? changedCount / effectiveLastKnown : 1

  const isStale = changeRatio > 0.2 && changedCount > 10

  let suggestion: string | null = null
  if (isStale) {
    suggestion = `索引可能过期 (${changedCount} 文件变更)，建议 /index 刷新`
  } else if (!cbmignoreExists) {
    suggestion = '建议创建 .cbmignore 排除大文件'
  }

  return {
    totalFiles,
    indexedNodes: lastKnownNodes,
    isStale,
    changedCount,
    cbmignoreExists,
    suggestion,
  }
}
