# CCB Dev Boost

面向大项目开发的 Claude Code Best 增强版：更省 token、更快定位代码、更适合 Windows 和中文开发者。

[English](./README_EN.md) · [优化细节](./docs/ccb-optimizations.md) · [上游项目](https://github.com/claude-code-best/claude-code)

> 本项目是 `claude-code-best/claude-code` 的非官方增强分支，重点放在 token 消耗、缓存命中率、响应延迟、代码库索引、跨会话续接和 Windows 体验。项目不隶属于 Anthropic。

## 核心收益

| 场景 | 优化后收益 |
|---|---|
| 日常提问 | 每轮少消耗约 500-1,500 tokens |
| 大项目分析 | 少读 10K-30K tokens 的无关源码和配置 |
| MCP 稳定性 | 减少 80%+ 因工具列表抖动导致的缓存破坏 |
| 并行工具调用 | 2-4 个独立工具场景延迟降低约 40%-75% |
| 调用链定位 | 从 30-120 秒搜索压到约 3-10 秒索引查询 |
| 跨会话续接 | 少重复解释 5K-20K tokens 的历史上下文 |
| 中文开发体验 | 高频配置、MCP、缓存告警、权限提示等界面中文化，降低新手理解成本 |

## 真实项目实测

在 H5 游戏老项目的多轮开发和 bug 修复场景中，优化后 prompt cache 命中率长期稳定在 **92%-96%**，极限情况下可达到 **98%**。这是实际开发过程中的观测数据，不是理论估算；具体结果仍会受模型、上下文长度、MCP 配置、文件读取量和会话方式影响。

## 成本参考

对个人开发者来说，少读无关文件、少重复解释上下文、提高缓存命中，最后都会变成更低的 API 成本。

| 使用强度 | 典型节省量 | 月成本影响 |
|---|---|---|
| 轻度使用 | 每天少用约 50K-150K tokens | 适合个人副业项目，主要减少无效探索和重复上下文 |
| 中度使用 | 每天少用约 200K-800K tokens | 大项目日常开发更明显，通常能少掉一部分固定 API 消耗 |
| 重度使用 | 每天少用 1M+ tokens | 多轮排查、多 agent、长上下文项目里，月度成本差距会非常明显 |

粗略换算：如果你的模型综合价格约为每 1M tokens 几元到几十元人民币，月省 6M-30M tokens 就大约对应几十到数百元人民币的成本差距；更高强度或更贵模型会放大这个收益。实际金额取决于模型价格、缓存命中率、项目规模和每天使用轮次。

## 这是什么

CCB Dev Boost 在 CCB 原有终端编码能力基础上，补了一套更适合真实项目长期使用的增强：

- 缓存优化：稳定 prompt cache，增加缓存命中率监控、破坏诊断和最近 20 轮日志。
- 代码索引：内置 `codebase-memory-mcp`，用代码图谱替代大量 Grep/Read 探索。
- 会话续接：内置 `ai-sessions`，可检索 Claude Code / Codex 等本机会话历史。
- DeepSeek 支持：补充 DeepSeek V4 Pro / Flash 1M 上下文识别和输出上限。
- Windows 友好：内置 Windows 可用的辅助 MCP，修复索引规则编辑等兼容问题。
- 中文体验：面向中文开发者补充高频界面汉化，覆盖配置项、MCP 面板、缓存告警、权限/审批提示和常见任务状态。

## 效果概览

| 方向 | 优化后效果 |
|---|---|
| Token 消耗 | 普通请求节省约 500-1,500 tokens；大项目分析可少读 10K-30K tokens |
| 实测缓存命中 | H5 游戏老项目多轮开发和 bug 修复中长期稳定 92%-96%，峰值可到 98% |
| 缓存命中 | MCP 工具稳定化减少 80%+ 重连导致的工具缓存破坏 |
| 响应延迟 | 独立工具并行调用，2-4 个工具场景延迟降低约 40%-75% |
| 代码定位 | 调用链/影响面分析从 3-6 轮搜索变成 1 次索引查询 + 少量源码确认 |
| 会话恢复 | 通过历史会话检索减少 5K-20K tokens 的重复解释 |
| Windows 使用 | 内置 MCP 和索引规则兼容修复，减少手动配置成本 |
| 中文开发 | 配置、MCP、缓存、权限审批和任务状态中文化，降低上手门槛 |

这些数字来自项目内的实测和估算，具体收益取决于模型价格、项目规模、缓存命中率和使用方式。

## 快速开始

### 环境要求

- Windows / macOS / Linux
- Node.js 20+
- Bun 1.3+

Windows 安装 Bun：

```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

Linux / macOS 安装 Bun：

```bash
curl -fsSL https://bun.sh/install | bash
```

### 从源码运行

```bash
git clone https://github.com/linghungegeg/claude-code-best_ccb-dev-boost.git
cd claude-code-best_ccb-dev-boost
bun install
bun run build
node dist/cli-node.js
```

开发调试：

```bash
bun run dev
```

建议日常使用编译产物：

```bash
node dist/cli-node.js
```

### Windows 项目启动脚本示例

把下面内容保存成 `.bat`，双击即可在指定项目目录启动 CCB：

```bat
@echo off
chcp 65001 >nul
set "PROJECT=F:\ltcq-xin"
set "CCB_SRC=F:\ccb-source\dist\cli-node.js"

cd /d "%PROJECT%"
node "%CCB_SRC%"

pause
```

## 新增功能怎么用

### 1. 代码库索引

先在 CCB 中打开：

```text
/mcp
```

启用：

```text
codebase-memory-mcp
```

`codebase-memory-mcp` 的查找顺序：

1. `CODEBASE_MEMORY_MCP_COMMAND` 环境变量指定的路径。
2. 构建产物中的内置二进制（如果发布包包含）。
3. Windows 默认安装位置 `%LOCALAPPDATA%\codebase-memory-mcp\codebase-memory-mcp.exe`。
4. PATH 中的 `codebase-memory-mcp`。

如果 `/mcp` 中显示 failed，请先确认本机已安装或配置了 `CODEBASE_MEMORY_MCP_COMMAND`。

然后对 CCB 说：

```text
使用 codebase-memory-mcp 给当前项目建立索引，mode=fast，persistence=true。
```

常用方式：

```text
先基于项目记忆和 codebase-memory 索引分析这个功能，再读取必要源码确认。
```

索引不会自动实时更新。大改代码后建议：

```text
使用 codebase-memory-mcp 重新索引当前项目，mode=fast，persistence=true。
```

### 2. 读取 Claude / Codex 历史会话

在 `/mcp` 中启用：

```text
ai-sessions
```

然后可以说：

```text
用 ai-sessions 查最近和当前项目相关的 Claude/Codex 会话，总结上次做到哪一步。
```

或者：

```text
读取最近的 Codex 会话，找和当前项目相关的内容，然后继续处理未完成的任务。
```

### 3. 缓存与消耗观察

常用命令：

```text
/break-cache status
/cache-log
```

用途：

- `/break-cache status`：查看上次缓存被破坏的原因。
- `/cache-log`：查看最近 20 轮缓存命中率、R/W tokens、模型和 compact 状态。

### 4. 权限模式与计划模式

`Shift + Tab` 可切换权限模式：

```text
Default -> Accept edits -> Plan -> Auto -> Bypass -> Default
```

常用理解：

| 模式 | 说明 |
|---|---|
| Default | 默认审批模式 |
| Accept edits | 接受编辑，减少文件编辑审批 |
| Plan | 计划模式，只分析和制定方案 |
| Auto | 自动模式，适合少审批工作流 |
| Bypass | 跳过审批，高风险，仅在可信项目使用 |

### 5. 配置入口

```text
/config
```

建议常用配置：

```text
Terminal progress bar = true
Show turn duration = true
Verbose output = false
```

## 优化后的对比

| 场景 | 原始 CCB 常见方式 | Dev Boost 方式 |
|---|---|---|
| 找功能入口 | 多轮 `Grep` + `Read` | 先查代码索引，再读关键源码 |
| 评估影响面 | 全局搜索后人工核对 | `query_graph` / `trace_path` 辅助定位 |
| 继续旧任务 | 重新解释背景 | `ai-sessions` 查历史会话 |
| 缓存异常 | 只知道命中率低 | 定位 system prompt / tools / MCP / model 变化 |
| 大文件索引 | 可能让 MCP 崩溃 | `.cbmignore` 提醒和大文件保护 |
| 长期项目 | 每次重新探索 | 记忆 + 索引 + 会话历史逐步积累 |

## 开发者下载与构建

```bash
git clone https://github.com/linghungegeg/claude-code-best_ccb-dev-boost.git
cd claude-code-best_ccb-dev-boost
bun install
bun run typecheck
bun run build
node dist/cli-node.js
```

常用验证：

```bash
bun test
bun run lint
```

如果只想确认构建：

```bash
bun run build
```

## 文档顺序建议

公开仓库建议按这个顺序阅读：

1. 本 README：快速了解项目、安装和常用功能。
2. [docs/ccb-optimizations.md](./docs/ccb-optimizations.md)：查看完整优化记录、数据和技术细节。
3. [README_EN.md](./README_EN.md)：英文说明。
4. `docs/features/`：上游 CCB 功能文档。

## 鸣谢

感谢以下项目和社区：

- [claude-code-best/claude-code](https://github.com/claude-code-best/claude-code)：CCB 上游项目，本项目基于它进行增强。
- [Anthropic Claude Code](https://docs.anthropic.com/en/docs/claude-code)：原始 Claude Code 产品和交互范式。
- [codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp)：代码库图谱索引与项目记忆 MCP。
- [ai-sessions-mcp](https://github.com/yoavf/ai-sessions-mcp)：Claude / Codex / Gemini 等本机会话历史检索 MCP。
- CCB、MCP、DeepSeek、Claude Code 相关社区贡献者。

## 赞赏与交流

如果这个增强版帮你节省了时间和 token，可以请作者喝杯咖啡，或者加微信交流使用体验。

<table>
  <tr>
    <td align="center">
      <img src="./wx.jpg" alt="微信" width="220" />
      <br />
      微信交流
    </td>
    <td align="center">
      <img src="./zhanshang.png" alt="赞赏码" width="220" />
      <br />
      赞赏支持
    </td>
  </tr>
</table>

## 许可证说明

本仓库暂不声明额外开源许可证。

上游 `claude-code-best/claude-code` 在当前发布时未提供明确开源许可证，因此本仓库不对上游代码重新授权。使用、修改、分发需自行确认上游许可状态。

第三方组件保留各自许可证，例如 `vendor/ai-sessions/LICENSE`。

本项目仅供学习研究和个人开发效率提升使用，不隶属于 Anthropic。
