/**
 * MCP tool description and schema stabilization utilities.
 *
 * Motivation: MCP servers may return tool descriptions containing dynamic
 * content (timestamps, version numbers, UUIDs, session IDs) or input_schema
 * properties in non-deterministic order. Any byte-level change in the tool
 * block busts the ~11K-token tool cache AND everything downstream in the
 * system prompt. Stabilizing these values prevents unnecessary cache breaks
 * between MCP reconnections.
 */

// ---------------------------------------------------------------------------
// Description cleaning — strip dynamic content
// ---------------------------------------------------------------------------

/**
 * ISO 8601 timestamp: 2026-05-13T14:32:15.123Z
 * Also matches space-separated variants and timezone offsets.
 */
const TIMESTAMP_RE =
  /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?/g

/** Unix timestamps (seconds: 10 digits, milliseconds: 13 digits) */
const UNIX_TS_RE = /\b\d{10,13}\b/g

/** UUIDs (standard hex format, case-insensitive) */
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

/** Semantic version strings: v1.2.3, 2.0.0-beta.1 */
const SEMVER_RE = /\bv?\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?\b/g

/**
 * Generic hex-based IDs (SHA hashes, session IDs, etc.) — 16+ hex chars.
 * Applied AFTER UUID_RE so we don't double-match.
 */
const HEX_ID_RE = /\b[0-9a-f]{16,}\b/gi

/**
 * Strip dynamic content from an MCP tool description so it remains
 * byte-stable across reconnections.
 *
 * - ISO timestamps → [timestamp]
 * - Unix timestamps → [unixts]
 * - UUIDs → [uuid]
 * - Semantic versions → [version]
 * - Long hex strings → [hexid]
 *
 * The replacement tokens are chosen to be clearly artificial so the
 * model still understands the description's intent without the actual
 * volatile values triggering a cache miss.
 */
export function stabilizeMCPDescription(desc: string): string {
  // ORDER MATTERS: UUID must run before UNIX_TS_RE, otherwise UUIDs whose
  // last 12-char hex group contains only decimal digits (e.g. 000000000000)
  // will be partially matched by the unix timestamp regex first.
  return desc
    .replace(TIMESTAMP_RE, '[timestamp]')
    .replace(UUID_RE, '[uuid]')
    .replace(UNIX_TS_RE, '[unixts]')
    .replace(SEMVER_RE, '[version]')
    .replace(HEX_ID_RE, '[hexid]')
}

// ---------------------------------------------------------------------------
// Input schema stabilization — canonical property ordering
// ---------------------------------------------------------------------------

/**
 * Deep-clone and canonicalize a JSON Schema object so that serialization
 * is deterministic regardless of the order the MCP server returns
 * properties in.
 *
 * Rules:
 * - Object keys are sorted alphabetically
 * - 'properties' sub-object keys are sorted alphabetically
 * - 'required' arrays are sorted alphabetically
 * - Arrays of non-object values are left as-is (order is meaningful)
 * - Arrays of objects are recursively sorted
 * - Primitives pass through unchanged
 */
export function stabilizeInputSchema(schema: unknown): unknown {
  if (typeof schema !== 'object' || schema === null) return schema

  if (Array.isArray(schema)) return schema.map(stabilizeInputSchema)

  const obj = schema as Record<string, unknown>
  const result: Record<string, unknown> = {}

  for (const key of Object.keys(obj).sort()) {
    const val = obj[key]

    if (key === 'properties' && typeof val === 'object' && val !== null) {
      const propsObj = val as Record<string, unknown>
      const sortedProps: Record<string, unknown> = {}
      for (const pk of Object.keys(propsObj).sort()) {
        sortedProps[pk] = stabilizeInputSchema(propsObj[pk])
      }
      result.properties = sortedProps
    } else if (key === 'required' && Array.isArray(val)) {
      result.required = [...(val as string[])].sort()
    } else {
      result[key] = stabilizeInputSchema(val)
    }
  }

  return result
}
