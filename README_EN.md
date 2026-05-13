# CCB Dev Boost

A developer-focused Claude Code Best fork for large codebases: lower token usage, better cache stability, faster code navigation, Windows-friendly setup, and Chinese-localized UI.

[中文](./README.md) · [Optimization Notes](./docs/ccb-optimizations.md) · [Upstream CCB](https://github.com/claude-code-best/claude-code)

> This is an unofficial enhancement fork of `claude-code-best/claude-code`. It focuses on token cost, prompt-cache hit rate, response latency, codebase indexing, session continuity, and Windows usability. It is not affiliated with Anthropic.

## Quick Navigation

[Key Benefits](#key-benefits) · [Real-World Measurement](#real-world-measurement) · [Cost Reference](#cost-reference) · [Quick Start](#quick-start) · [Added Features](#how-to-use-the-added-features) · [Codebase Indexing](#1-codebase-indexing) · [Acknowledgements](#acknowledgements)

## Key Benefits

| Scenario | Optimized Result |
|---|---|
| Daily prompts | Save roughly 500-1,500 tokens per turn |
| Large codebase analysis | Avoid 10K-30K tokens of unrelated source and config reads |
| MCP stability | Reduce 80%+ of cache busts caused by tool-list churn |
| Parallel tool calls | Cut latency by about 40%-75% for 2-4 independent tools |
| Call-chain lookup | Move from 30-120 seconds of searching to about 3-10 seconds of index querying |
| Session handoff | Avoid 5K-20K tokens of repeated historical context |
| Chinese developer UX | Localized high-frequency settings, MCP, cache warnings, permission prompts, and task status labels |

## Real-World Measurement

In multi-turn development and bug fixing on a legacy H5 game codebase, the optimized prompt-cache hit rate stayed around **92%-96%** over long-running work, with peak runs reaching **98%**. This is observed from real development usage, not a theoretical estimate. Actual results still depend on the model, context length, MCP setup, file-read volume, and session workflow.

## Cost Reference

For individual developers, reading fewer unrelated files, repeating less context, and improving cache stability eventually means lower API spend.

### Combined Cost Reduction

For input-heavy, long-running work on the same project with stable prompt-cache hits, cost reduction comes from three layers:

| Setup | Cost Impact Reference |
|---|---|
| Model switch only: Claude Sonnet → DeepSeek V4 Pro | Model-price difference can reduce cost to roughly 1/7-1/10, saving about 85%-90% |
| CCB Dev Boost only: still using Claude | Indexing, fewer file reads, and cache stability usually reduce 40%-60% of wasted input tokens |
| CCB Dev Boost + DeepSeek V4 Pro | Under the measured 92%-96% long-running cache hit rate, with peak runs at 98%, total API spend can potentially drop by 90%+ |

Intuition: if heavy development used to cost around ¥100, an ideal setup with official DeepSeek V4 Pro pricing, high input ratio, and stable cache hits may bring it down to single-digit or low-teen RMB. The real bill depends on output ratio, model pricing, cache hit rate, MCP stability, project size, and workflow.

### Mainstream Model Cost Estimate

Rough estimate with **100M cacheable input tokens/month**, long-running hit rate around **94%-96%**, peak hit rate **98%**, and **1 USD ≈ 7.2 RMB**. This only counts input-cache savings. It does not include output tokens, extra tool charges, subscription discounts, or third-party proxy pricing.

| Example Model | Uncached Input | Cache Hit Input | Monthly Savings at 94%-96% Hit Rate | Monthly Savings at 98% Hit Rate |
|---|---:|---:|---:|---:|
| Claude Sonnet 4.6 | $3 / 1M | $0.30 / 1M | ~¥1,827-¥1,866 | ~¥1,905 |
| Claude Opus 4.7 | $5 / 1M | $0.50 / 1M | ~¥3,045-¥3,110 | ~¥3,175 |
| GPT-5.4 | $2.50 / 1M | $0.25 / 1M | ~¥1,523-¥1,555 | ~¥1,588 |
| GPT-5.4 mini | $0.75 / 1M | $0.075 / 1M | ~¥457-¥467 | ~¥476 |
| DeepSeek V4 Pro | $0.435 / 1M | $0.003625 / 1M | ~¥292-¥298 | ~¥306 |
| DeepSeek V4 Flash | $0.14 / 1M | $0.0028 / 1M | ~¥93-¥95 | ~¥97 |

GLM, Qwen, third-party proxy, and enterprise pricing vary a lot. Use this formula for your own plan:

```text
monthly savings ≈ cacheable input volume × hit rate × (uncached input price - cached input price)
```

Price references: official [Claude](https://platform.claude.com/docs/en/about-claude/pricing) / [OpenAI](https://openai.com/api/pricing/) / [DeepSeek](https://api-docs.deepseek.com/quick_start/pricing-details-usd) pricing pages. Model prices change frequently, so these numbers are for scale only. Your provider dashboard is the source of truth.

| Usage Level | Typical Savings | Monthly Cost Impact |
|---|---|---|
| Light usage | Save roughly 50K-150K tokens per day | Useful for solo and side projects by reducing wasted exploration and repeated context |
| Medium usage | Save roughly 200K-800K tokens per day | More visible in daily large-codebase development, often reducing a meaningful part of fixed API usage |
| Heavy usage | Save 1M+ tokens per day | Multi-round debugging, multi-agent work, and long-context projects can see a very large monthly difference |

Rule of thumb: if your blended model price is a few to dozens of RMB per 1M tokens, saving 6M-30M tokens per month roughly maps to tens to hundreds of RMB saved. Higher usage or more expensive models amplify the benefit. Actual savings depend on model pricing, cache hit rate, project size, and daily workflow.

## What This Is

CCB Dev Boost keeps the terminal coding workflow from CCB and adds a practical optimization layer for long-running real-world projects:

- Cache optimization: prompt-cache stability, hit-rate warning, cache-break diagnosis, and recent cache logs.
- Codebase indexing: built-in `codebase-memory-mcp` to reduce blind Grep/Read exploration.
- Session continuity: built-in `ai-sessions` for searching local Claude Code / Codex sessions.
- DeepSeek support: DeepSeek V4 Pro / Flash 1M context recognition and output-token tuning.
- Windows-friendly setup: bundled helper MCPs and Windows compatibility fixes.
- Localized UI: Chinese developer-friendly labels for config items, MCP panels, cache warnings, permission prompts, and common task states.

## Results At A Glance

| Area | Result |
|---|---|
| Token usage | Small requests save roughly 500-1,500 tokens; large codebase analysis can avoid 10K-30K unnecessary tokens |
| Measured cache hit rate | Stable 92%-96% in multi-turn legacy H5 game development and bug fixing; peak runs reached 98% |
| Cache stability | MCP tool stabilization reduces 80%+ of cache busts caused by MCP reconnect noise |
| Latency | Independent tool calls can run in parallel, reducing latency by about 40%-75% in 2-4 tool scenarios |
| Code navigation | Call-chain and impact analysis move from multiple Grep/Read rounds to one index query plus targeted source reads |
| Session recovery | AI session search can avoid 5K-20K tokens of repeated context explanation |
| Windows usage | Bundled MCP binaries and index-rule fixes reduce setup friction |
| Chinese UX | Localized config, MCP, cache, permission approval, and task status surfaces reduce onboarding friction |

Numbers are based on project measurements and estimates. Actual savings depend on model pricing, project size, cache hit rate, and workflow.

## Quick Start

### Requirements

- Windows / macOS / Linux
- Node.js 20+
- Bun 1.3+

Install Bun on Windows:

```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

Install Bun on Linux / macOS:

```bash
curl -fsSL https://bun.sh/install | bash
```

### Build From Source

```bash
git clone https://github.com/linghungegeg/claude-code-best_ccb-dev-boost.git
cd claude-code-best_ccb-dev-boost
bun install
bun run build
node dist/cli-node.js
```

Development mode:

```bash
bun run dev
```

For daily usage, prefer the built output:

```bash
node dist/cli-node.js
```

### Windows Launcher Example

Save this as a `.bat` file and double-click it to start CCB inside your project:

```bat
@echo off
chcp 65001 >nul
set "PROJECT=F:\ltcq-xin"
set "CCB_SRC=F:\ccb-source\dist\cli-node.js"

cd /d "%PROJECT%"
node "%CCB_SRC%"

pause
```

## How To Use The Added Features

### 1. Codebase Indexing

Open MCP management inside CCB:

```text
/mcp
```

Enable:

```text
codebase-memory-mcp
```

`codebase-memory-mcp` is resolved in this order:

1. The `CODEBASE_MEMORY_MCP_COMMAND` environment variable.
2. The bundled binary in the build output, if the package includes one.
3. The default Windows install path: `%LOCALAPPDATA%\codebase-memory-mcp\codebase-memory-mcp.exe`.
4. `codebase-memory-mcp` on PATH.

If `/mcp` shows `failed`, first confirm that the server is installed locally or configure `CODEBASE_MEMORY_MCP_COMMAND`.

Then ask CCB:

```text
Use codebase-memory-mcp to index the current project, mode=fast, persistence=true.
```

Recommended prompt:

```text
First use project memory and the codebase-memory index to analyze this feature, then read only the necessary source files to confirm.
```

The index is not updated in real time. After larger code changes, refresh it:

```text
Use codebase-memory-mcp to re-index the current project, mode=fast, persistence=true.
```

### 2. Claude / Codex Session Search

Enable this server in `/mcp`:

```text
ai-sessions
```

Then ask:

```text
Use ai-sessions to search recent Claude/Codex sessions related to this project and summarize where I left off.
```

Or:

```text
Read recent Codex sessions related to the current project, recover the context, and continue the unfinished task.
```

### 3. Cache And Cost Observability

Useful commands:

```text
/break-cache status
/cache-log
```

- `/break-cache status`: shows why the prompt cache was last broken.
- `/cache-log`: shows the recent 20 turns, cache hit rate, read/write tokens, model, and compaction status.

### 4. Permission And Plan Modes

Use `Shift + Tab` to cycle permission modes:

```text
Default -> Accept edits -> Plan -> Auto -> Bypass -> Default
```

Common meanings:

| Mode | Meaning |
|---|---|
| Default | Standard approval mode |
| Accept edits | Fewer approvals for file edits |
| Plan | Planning mode, analyze and propose before editing |
| Auto | Automatic mode for lower-friction workflows |
| Bypass | Skip approvals, high risk, use only in trusted projects |

### 5. Settings

Open:

```text
/config
```

Recommended defaults:

```text
Terminal progress bar = true
Show turn duration = true
Verbose output = false
```

## Before / After

| Scenario | Original CCB | Dev Boost |
|---|---|---|
| Find feature entrypoints | Multiple Grep + Read rounds | Query code index first, then read key files |
| Estimate impact | Global search and manual verification | `query_graph` / `trace_path` assisted analysis |
| Continue an old task | Re-explain the context | Search previous AI sessions |
| Cache anomaly | Only see low hit rate | Diagnose system prompt / tools / MCP / model changes |
| Large-file indexing | MCP may crash on huge data files | `.cbmignore` hints and large-file protection |
| Long-running projects | Re-explore repeatedly | Memory + index + session history accumulate over time |

## Developer Setup

```bash
git clone https://github.com/linghungegeg/claude-code-best_ccb-dev-boost.git
cd claude-code-best_ccb-dev-boost
bun install
bun run typecheck
bun run build
node dist/cli-node.js
```

Common checks:

```bash
bun test
bun run lint
```

Build only:

```bash
bun run build
```

## Recommended Reading Order

1. This README: overview, installation, and common workflows.
2. [docs/ccb-optimizations.md](./docs/ccb-optimizations.md): full optimization record, numbers, and technical notes.
3. [README.md](./README.md): Chinese README.
4. `docs/features/`: upstream CCB feature docs.

## Acknowledgements

Thanks to:

- [claude-code-best/claude-code](https://github.com/claude-code-best/claude-code): upstream CCB project.
- [Anthropic Claude Code](https://docs.anthropic.com/en/docs/claude-code): original product and interaction model.
- [codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp): code graph indexing and project memory MCP.
- [ai-sessions-mcp](https://github.com/yoavf/ai-sessions-mcp): local AI session search for Claude Code, Codex, Gemini, and more.
- The CCB, MCP, DeepSeek, and Claude Code communities.

## Support

If this fork saves you time or tokens, feel free to connect or support the work.

<table>
  <tr>
    <td align="center">
      <img src="./wx.jpg" alt="WeChat" width="220" />
      <br />
      WeChat
    </td>
    <td align="center">
      <img src="./zhanshang.png" alt="Sponsor QR" width="220" />
      <br />
      Sponsor
    </td>
  </tr>
</table>

## License Notice

This repository does not declare an additional open-source license.

The upstream `claude-code-best/claude-code` project did not provide an explicit open-source license at the time of this publication, so this fork does not re-license upstream code. Use, modification, and redistribution depend on the upstream license status.

Third-party components keep their own licenses, for example `vendor/ai-sessions/LICENSE`.

This project is for research, learning, and personal developer-productivity use. It is not affiliated with Anthropic.
