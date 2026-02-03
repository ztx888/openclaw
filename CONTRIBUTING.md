# 贡献给 OpenClaw

欢迎来到龙虾缸！🦞

## 快速链接

- **GitHub:** https://github.com/openclaw/openclaw
- **Discord:** https://discord.gg/qkhbAGHRBT
- **X/Twitter:** [@steipete](https://x.com/steipete) / [@openclaw](https://x.com/openclaw)

## 维护者

- **Peter Steinberger** - 仁慈的独裁者 (Benevolent Dictator)
  - GitHub: [@steipete](https://github.com/steipete) · X: [@steipete](https://x.com/steipete)

- **Shadow** - Discord + Slack 子系统
  - GitHub: [@thewilloftheshadow](https://github.com/thewilloftheshadow) · X: [@4shad0wed](https://x.com/4shad0wed)

- **Jos** - Telegram, API, Nix 模式
  - GitHub: [@joshp123](https://github.com/joshp123) · X: [@jjpcodes](https://x.com/jjpcodes)

- **Christoph Nakazawa** - JS 基础设施
  - GitHub: [@cpojer](https://github.com/cpojer) · X: [@cnakazawa](https://x.com/cnakazawa)

## 如何贡献

1. **Bug 和小修补** → 提交 PR！
2. **新功能 / 架构** → 先发起 [GitHub Discussion](https://github.com/openclaw/openclaw/discussions) 或在 Discord 中询问
3. **问题** → Discord #setup-help

## 提交 PR 之前

- 使用你的 OpenClaw 实例在本地测试
- 运行测试: `pnpm build && pnpm check && pnpm test`
- 保持 PR 专注（每个 PR 只做一个改动）
- 描述修改内容和原因

## 欢迎 AI/Vibe-Coded PR！🤖

是用 Codex, Claude 或其他 AI 工具构建的吗？**太棒了 - 请标记出来！**

请在你的 PR 中包含：

- [ ] 在 PR 标题或描述中标记为 AI 辅助
- [ ] 说明测试程度（未测试 / 轻度测试 / 充分测试）
- [ ] 如果可能，包含提示词或会话日志（非常有帮助！）
- [ ] 确认你理解代码的作用

AI PR 在这里是一等公民。我们只是希望保持透明，以便审查者知道该寻找什么。

## 当前重点与路线图 🗺

我们目前的优先级：

- **稳定性**: 修复渠道连接 (WhatsApp/Telegram) 中的边缘情况。
- **UX**: 改进初始化向导和错误消息。
- **技能**: 扩展捆绑技能库并改善技能创建的开发体验。
- **性能**: 优化 Token 使用和压缩逻辑。

查看 [GitHub Issues](https://github.com/openclaw/openclaw/issues) 寻找 "good first issue" 标签！

