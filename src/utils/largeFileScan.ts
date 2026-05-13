/**
 * Large-file scanner for codebase indexing protection.
 *
 * Scans the project directory for files that are likely to cause
 * codebase-memory-mcp to crash (SIGSEGV during parallel.extract, known
 * bug GitHub issue #141). These files have no call relationships /
 * symbols worth indexing, so excluding them via .cbmignore is a pure
 * safety + performance win.
 *
 * Standalone — no MCP dependency.
 */

import { readdir, stat } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import { existsSync } from 'node:fs'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Files larger than this are candidates for .cbmignore exclusion. */
const LARGE_FILE_THRESHOLD = 1_000_000 // 1 MB

/** Extensions that are known to be data/asset files with no code symbols. */
const LARGE_FILE_EXTS = new Set<string>([
  '.json',
  '.sql',
  '.xml',
  '.csv',
  '.tsv',
  '.min.js',
  '.min.css',
  '.pb.go',
  '.pb.cc',
  '.bin',
  '.dat',
  '.pak',
  '.zip',
  '.tar',
  '.gz',
  '.tgz',
  '.7z',
  '.rar',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.mp3',
  '.mp4',
  '.wav',
  '.ogg',
  '.ttf',
  '.woff',
  '.woff2',
])

/** Directories to skip during scanning. */
const SKIP_DIRS = new Set<string>([
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

export interface LargeFileInfo {
  path: string // relative to cwd
  size: number
  ext: string
}

export interface LargeFileScanResult {
  largeFiles: LargeFileInfo[]
  cbmignoreExists: boolean
  unexcludedCount: number
}

// ---------------------------------------------------------------------------
// .cbmignore parsing (minimal gitignore-compatible subset)
// ---------------------------------------------------------------------------

export function readCbmignore(cwd: string): string[] {
  const path = join(cwd, '.cbmignore')
  if (!existsSync(path)) return []
  try {
    const content = require('fs').readFileSync(path, 'utf8') as string
    return (content as string)
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'))
  } catch {
    return []
  }
}

/**
 * Check if a path matches a gitignore-style pattern.
 * Simplified subset: supports `*.ext`, `dir/`, `path/file`.
 */
function matchesPattern(relPath: string, pattern: string): boolean {
  if (pattern.endsWith('/')) {
    // Directory pattern
    const dir = pattern.slice(0, -1)
    return relPath.startsWith(dir + '/') || relPath === dir
  }
  if (pattern.startsWith('*.')) {
    // Extension pattern
    const ext = pattern.slice(1)
    return relPath.endsWith(ext)
  }
  return relPath === pattern || relPath.startsWith(pattern)
}

export function isExcluded(relPath: string, rules: string[]): boolean {
  return rules.some(r => matchesPattern(relPath, r))
}

// ---------------------------------------------------------------------------
// Scanner
// ---------------------------------------------------------------------------

export async function scanLargeFiles(
  cwd: string,
): Promise<LargeFileScanResult> {
  const largeFiles: LargeFileInfo[] = []

  async function walk(dir: string): Promise<void> {
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      const relPath = relative(cwd, fullPath).replace(/\\/g, '/')

      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue
        if (entry.name.startsWith('.')) continue
        await walk(fullPath)
        continue
      }

      // Check extension
      const extIdx = entry.name.lastIndexOf('.')
      if (extIdx < 0) continue

      const ext = entry.name.slice(extIdx).toLowerCase()
      if (!LARGE_FILE_EXTS.has(ext)) continue

      // Check size
      let fileStat
      try {
        fileStat = await stat(fullPath)
      } catch {
        continue
      }

      if (fileStat.size >= LARGE_FILE_THRESHOLD) {
        largeFiles.push({
          path: relPath,
          size: fileStat.size,
          ext,
        })
      }
    }
  }

  await walk(cwd)

  largeFiles.sort((a, b) => b.size - a.size)

  const rules = readCbmignore(cwd)
  const cbmignoreExists = existsSync(resolve(cwd, '.cbmignore'))
  const unexcludedCount = largeFiles.filter(
    f => !isExcluded(f.path, rules),
  ).length

  return { largeFiles, cbmignoreExists, unexcludedCount }
}
