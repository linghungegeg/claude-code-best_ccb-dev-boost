# GitHub 发布说明

## 推荐仓库信息

仓库名：

```text
claude-code-best_ccb-dev-boost
```

一句话描述：

```text
Token-efficient, Windows-friendly CCB enhancement fork with cache optimization, codebase indexing, AI session continuity, DeepSeek support, and localized UI.
```

中文描述：

```text
面向开发者的 CCB 增强版，集成缓存优化、代码库索引、AI 会话续接、DeepSeek 支持、Windows 兼容和中文界面。
```

## 推荐 Topics

```text
claude-code
ccb
ai-coding
developer-tools
mcp
prompt-cache
codebase-indexing
windows
deepseek
ai-assistant
```

## 推荐 README 顺序

1. 项目定位
2. 优化效果概览
3. 快速开始
4. 新增功能使用方式
5. 优化前后对比
6. 开发者构建方式
7. 鸣谢
8. 赞赏与交流
9. 许可证说明

## 许可证建议

GitHub 创建仓库时选择：

```text
No license / None
```

原因：

- 上游 `claude-code-best/claude-code` 当前未提供明确开源许可证。
- 本仓库不能替上游代码重新授权为 MIT / Apache-2.0。
- 第三方组件保留各自许可证，例如 `vendor/ai-sessions/LICENSE`。

## 推送前检查

```bash
bun run typecheck
bun run build
```

注意：`src/utils/vendor/codebase-memory` 中的超大二进制不建议直接提交到 GitHub。构建脚本在该目录缺失时会跳过复制，运行时可通过 `CODEBASE_MEMORY_MCP_COMMAND`、Windows 默认安装路径或 PATH 解析 `codebase-memory-mcp`。

如需完整检查：

```bash
bun test
bun run lint
```

## 远程地址

```bash
git remote add origin https://github.com/linghungegeg/claude-code-best_ccb-dev-boost.git
git branch -M main
git push -u origin main
```
