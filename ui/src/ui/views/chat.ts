import { html, nothing } from "lit";
import { ref } from "lit/directives/ref.js";
import { repeat } from "lit/directives/repeat.js";
import type { SessionsListResult } from "../types";
import type { ChatItem, MessageGroup } from "../types/chat-types";
import type { ChatAttachment, ChatQueueItem } from "../ui-types";
import {
  renderMessageGroup,
  renderReadingIndicatorGroup,
  renderStreamingGroup,
} from "../chat/grouped-render";
import { normalizeMessage, normalizeRoleForGrouping } from "../chat/message-normalizer";
import { icons } from "../icons";
import { renderMarkdownSidebar } from "./markdown-sidebar";
import "../components/resizable-divider";

export type CompactionIndicatorStatus = {
  active: boolean;
  startedAt: number | null;
  completedAt: number | null;
};

export type ChatProps = {
  sessionKey: string;
  onSessionKeyChange: (next: string) => void;
  thinkingLevel: string | null;
  showThinking: boolean;
  loading: boolean;
  sending: boolean;
  canAbort?: boolean;
  compactionStatus?: CompactionIndicatorStatus | null;
  messages: unknown[];
  toolMessages: unknown[];
  stream: string | null;
  streamStartedAt: number | null;
  assistantAvatarUrl?: string | null;
  draft: string;
  queue: ChatQueueItem[];
  connected: boolean;
  canSend: boolean;
  disabledReason: string | null;
  error: string | null;
  sessions: SessionsListResult | null;
  // Focus mode
  focusMode: boolean;
  // Sidebar state
  sidebarOpen?: boolean;
  sidebarContent?: string | null;
  sidebarError?: string | null;
  splitRatio?: number;
  assistantName: string;
  assistantAvatar: string | null;
  // Image attachments
  attachments?: ChatAttachment[];
  onAttachmentsChange?: (attachments: ChatAttachment[]) => void;
  // Scroll control
  showNewMessages?: boolean;
  onScrollToBottom?: () => void;
  // Event handlers
  onRefresh: () => void;
  onToggleFocusMode: () => void;
  onDraftChange: (next: string) => void;
  onSend: () => void;
  onAbort?: () => void;
  onQueueRemove: (id: string) => void;
  onNewSession: () => void;
  onOpenSidebar?: (content: string) => void;
  onCloseSidebar?: () => void;
  onSplitRatioChange?: (ratio: number) => void;
  onChatScroll?: (event: Event) => void;
};

const COMPACTION_TOAST_DURATION_MS = 5000;
const CHAT_HISTORY_RENDER_LIMIT = 100;

function adjustTextareaHeight(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

function renderCompactionIndicator(status: CompactionIndicatorStatus | null | undefined) {
  if (!status) {
    return nothing;
  }

  // Show "compacting..." while active
  if (status.active) {
    return html`
      <div class="callout info compaction-indicator compaction-indicator--active">
        ${icons.loader} 正在压缩上下文...
      </div>
    `;
  }

  // Show "compaction complete" briefly after completion
  if (status.completedAt) {
    const elapsed = Date.now() - status.completedAt;
    if (elapsed < COMPACTION_TOAST_DURATION_MS) {
      return html`
        <div class="callout success compaction-indicator compaction-indicator--complete">
          ${icons.check} 上下文压缩完成
        </div>
      `;
    }
  }

  return nothing;
}

export function renderChat(props: ChatProps) {
  const groups = resolveChatGroups(props);
  const isBusy = props.sending || props.loading;
  const canAbort = props.canAbort ?? false;
  const attachments = props.attachments ?? [];
  const hasAttachments = attachments.length > 0;

  const composePlaceholder = props.connected
    ? hasAttachments
      ? "添加消息或粘贴更多图片..."
      : "发送消息 (Enter 发送, Shift+Enter 换行, 支持粘贴图片)"
    : "连接 Gateway 以开始对话...";

  return html`
    <div class="chat-layout ${props.sidebarOpen ? "chat-layout--split" : ""}">
      <div class="chat-main">
        <div class="chat-messages" @scroll=${props.onChatScroll}>
          ${props.error
      ? html`<div class="callout danger" style="margin: 16px;">${props.error}</div>`
      : nothing}
            
          ${repeat(
        groups,
        (group) => group.key,
        (group) => renderChatGroup(group, props)
      )}
          
          ${props.loading
      ? html`<div class="chat-message-loading">
                <span class="muted">正在加载对话...</span>
              </div>`
      : nothing}
            
          <div class="chat-spacer"></div>
        </div>

        <div class="chat-compose">
          ${renderCompactionIndicator(props.compactionStatus)}
          
          ${attachments.length > 0
      ? html`
                <div class="chat-attachments">
                  ${attachments.map(
        (att) => html`
                      <div class="chat-attachment">
                        <img
                          src=${att.dataUrl}
                          alt="附件预览"
                          class="chat-attachment__img"
                        />
                        <button
                          class="chat-attachment__remove"
                          type="button"
                          aria-label="移除附件"
                          @click=${() => {
            const next = (props.attachments ?? []).filter((a) => a.id !== att.id);
            props.onAttachmentsChange?.(next);
          }}
                        >
                          ${icons.x}
                        </button>
                      </div>
                    `,
      )}
                </div>
              `
      : nothing}

          ${props.focusMode
      ? html`
                <button
                  class="chat-focus-exit"
                  type="button"
                  @click=${props.onToggleFocusMode}
                  aria-label="退出专注模式"
                  title="退出专注模式"
                >
                  ${icons.x}
                </button>
              `
      : nothing}

          ${props.queue.length
      ? html`
                <div class="chat-queue" role="status" aria-live="polite">
                  <div class="chat-queue__title">队列中 (${props.queue.length})</div>
                  <div class="chat-queue__list">
                    ${props.queue.map(
        (item) => html`
                        <div class="chat-queue__item">
                          <div class="chat-queue__text">
                            ${item.text ||
          (item.attachments?.length ? `图片 (${item.attachments.length})` : "")}
                          </div>
                          <button
                            class="btn chat-queue__remove"
                            type="button"
                            aria-label="移除队列消息"
                            @click=${() => props.onQueueRemove(item.id)}
                          >
                            ${icons.x}
                          </button>
                        </div>
                      `,
      )}
                  </div>
                </div>
              `
      : nothing}

          ${props.showNewMessages
      ? html`
                <button
                  class="chat-new-messages"
                  type="button"
                  @click=${props.onScrollToBottom}
                >
                  新消息 ${icons.arrowDown}
                </button>
              `
      : nothing}

          <div class="chat-compose__row">
            <label class="field chat-compose__field">
              <span class="sr-only">消息</span>
              <textarea
                class="chat-compose__input"
                placeholder=${composePlaceholder}
                .value=${props.draft}
                ?disabled=${!props.connected}
                @input=${(e: Event) => {
      const target = e.target as HTMLTextAreaElement;
      adjustTextareaHeight(target);
      props.onDraftChange(target.value);
    }}
                @keydown=${(e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (props.canSend) {
          props.onSend();
        }
      }
    }}
                ${ref(adjustTextareaHeight)}
              ></textarea>
            </label>
            
            <div class="chat-compose__actions">
              <button
                class="btn"
                ?disabled=${!props.connected || (!canAbort && props.sending)}
                @click=${canAbort ? props.onAbort : props.onNewSession}
              >
                ${canAbort ? "停止" : "新会话"}
              </button>
              <button
                class="btn primary"
                ?disabled=${!props.connected || (!props.canSend && !isBusy)}
                @click=${props.onSend}
              >
                ${isBusy ? "排队" : "发送"} <kbd class="btn-kbd">↵</kbd>
              </button>
            </div>
          </div>
          
          ${props.disabledReason
      ? html`<div class="chat-compose-status muted">${props.disabledReason}</div>`
      : nothing}
        </div>
      </div>

      ${props.sidebarContent
      ? html`
            <resizable-divider
              direction="horizontal"
              .value=${props.splitRatio ?? 50}
              @change=${(e: CustomEvent) => props.onSplitRatioChange?.(e.detail.value)}
            ></resizable-divider>
            <div class="chat-sidebar" style="width: ${props.splitRatio ?? 50}%">
              ${renderMarkdownSidebar({
        content: props.sidebarContent,
        error: props.sidebarError,
        onClose: props.onCloseSidebar,
      })}
            </div>
          `
      : nothing}
    </div>
  `;
}

function renderChatGroup(group: MessageGroup, props: ChatProps) {
  const g = group as any;
  if (g.kind === "message-group") {
    return renderMessageGroup(group, {
      assistantAvatar: props.assistantAvatar,
      assistantName: props.assistantName,
      onOpenSidebar: props.onOpenSidebar,
      showReasoning: true
    });
  }
  if (g.kind === "reading-indicator") {
    return renderReadingIndicatorGroup(undefined);
  }
  if (g.kind === "stream") {
    return renderStreamingGroup(g.text || "", g.timestamp || Date.now(), undefined, {
      name: props.assistantName,
      avatar: props.assistantAvatar || undefined
    });
  }
  return nothing;
}

function resolveChatGroups(props: ChatProps): MessageGroup[] {
  const history = props.messages as Record<string, unknown>[];
  const tools = props.toolMessages as Record<string, unknown>[];
  const items: ChatItem[] = [];

  const historyStart = Math.max(0, history.length - CHAT_HISTORY_RENDER_LIMIT);

  if (historyStart > 0) {
    items.push({
      kind: "message",
      key: "chat:history:notice",
      message: {
        role: "system",
        content: `显示最近 ${CHAT_HISTORY_RENDER_LIMIT} 条消息 (隐藏了 ${historyStart} 条)。`,
        timestamp: Date.now(),
      },
    });
  }
  for (let i = historyStart; i < history.length; i++) {
    const msg = history[i];
    const normalized = normalizeMessage(msg);

    if (!props.showThinking && normalized.role.toLowerCase() === "toolresult") {
      continue;
    }

    items.push({
      kind: "message",
      key: messageKey(msg, i),
      message: msg,
    });
  }
  if (props.showThinking) {
    for (let i = 0; i < tools.length; i++) {
      items.push({
        kind: "message",
        key: messageKey(tools[i], i + history.length),
        message: tools[i],
      });
    }
  }

  if (props.stream !== null) {
    const key = `stream:${props.sessionKey}:${props.streamStartedAt ?? "live"}`;
    if (props.stream.trim().length > 0) {
      items.push({
        kind: "stream",
        key,
        text: props.stream,
        startedAt: props.streamStartedAt ?? Date.now(),
      });
    } else {
      items.push({ kind: "reading-indicator", key });
    }
  }

  return groupMessages(items);
}

function groupMessages(items: ChatItem[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  let currentGroup: MessageGroup | null = null;

  for (const item of items) {
    if (item.kind === "stream") {
      currentGroup = null;
      // Force cast to suit render expectations
      groups.push({
        kind: "stream" as any,
        key: item.key,
        role: "assistant",
        messages: [],
        timestamp: item.startedAt,
        isStreaming: true,
        text: item.text
      } as any);
      continue;
    }

    if (item.kind === "reading-indicator") {
      currentGroup = null;
      groups.push({
        kind: "reading-indicator" as any,
        key: item.key,
        role: "assistant",
        messages: [],
        timestamp: Date.now(),
        isStreaming: false
      } as any);
      continue;
    }

    if (item.kind === "message") {
      const msg = item.message as Record<string, unknown>;
      const role = typeof msg.role === 'string' ? msg.role : 'unknown';
      const normalizedRole = normalizeRoleForGrouping(role);

      if (currentGroup &&
        (currentGroup as any).kind === "message-group" &&
        normalizeRoleForGrouping(currentGroup.role) === normalizedRole) {
        currentGroup.messages.push({ message: msg, key: item.key });
      } else {
        const timestamp = typeof msg.timestamp === 'number' ? msg.timestamp : Date.now();
        currentGroup = {
          kind: "message-group" as any,
          key: `group:${item.key}`,
          role,
          messages: [{ message: msg, key: item.key }],
          timestamp,
          isStreaming: false
        } as unknown as MessageGroup;
        groups.push(currentGroup);
      }
    }
  }
  return groups;
}

function messageKey(message: unknown, index: number): string {
  const m = message as Record<string, unknown>;
  const toolCallId = typeof m.toolCallId === "string" ? m.toolCallId : "";
  if (toolCallId) {
    return `tool:${toolCallId}`;
  }
  const id = typeof m.id === "string" ? m.id : "";
  if (id) {
    return `msg:${id}`;
  }
  const messageId = typeof m.messageId === "string" ? m.messageId : "";
  if (messageId) {
    return `msg:${messageId}`;
  }
  const timestamp = typeof m.timestamp === "number" ? m.timestamp : null;
  const role = typeof m.role === "string" ? m.role : "unknown";
  if (timestamp != null) {
    return `msg:${role}:${timestamp}:${index}`;
  }
  return `msg:${role}:${index}`;
}
