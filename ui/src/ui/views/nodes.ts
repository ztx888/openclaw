import { html, nothing } from "lit";
import type {
  DevicePairingList,
  DeviceTokenSummary,
  PairedDevice,
  PendingDevice,
} from "../controllers/devices";
import type {
  ExecApprovalsAllowlistEntry,
  ExecApprovalsFile,
  ExecApprovalsSnapshot,
} from "../controllers/exec-approvals";
import { clampText, formatAgo, formatList } from "../format";

export type NodesProps = {
  loading: boolean;
  nodes: Array<Record<string, unknown>>;
  devicesLoading: boolean;
  devicesError: string | null;
  devicesList: DevicePairingList | null;
  configForm: Record<string, unknown> | null;
  configLoading: boolean;
  configSaving: boolean;
  configDirty: boolean;
  configFormMode: "form" | "raw";
  execApprovalsLoading: boolean;
  execApprovalsSaving: boolean;
  execApprovalsDirty: boolean;
  execApprovalsSnapshot: ExecApprovalsSnapshot | null;
  execApprovalsForm: ExecApprovalsFile | null;
  execApprovalsSelectedAgent: string | null;
  execApprovalsTarget: "gateway" | "node";
  execApprovalsTargetNodeId: string | null;
  onRefresh: () => void;
  onDevicesRefresh: () => void;
  onDeviceApprove: (requestId: string) => void;
  onDeviceReject: (requestId: string) => void;
  onDeviceRotate: (deviceId: string, role: string, scopes?: string[]) => void;
  onDeviceRevoke: (deviceId: string, role: string) => void;
  onLoadConfig: () => void;
  onLoadExecApprovals: () => void;
  onBindDefault: (nodeId: string | null) => void;
  onBindAgent: (agentIndex: number, nodeId: string | null) => void;
  onSaveBindings: () => void;
  onExecApprovalsTargetChange: (kind: "gateway" | "node", nodeId: string | null) => void;
  onExecApprovalsSelectAgent: (agentId: string) => void;
  onExecApprovalsPatch: (path: Array<string | number>, value: unknown) => void;
  onExecApprovalsRemove: (path: Array<string | number>) => void;
  onSaveExecApprovals: () => void;
};

export function renderNodes(props: NodesProps) {
  const bindingState = resolveBindingsState(props);
  const approvalsState = resolveExecApprovalsState(props);
  return html`
    ${renderExecApprovals(approvalsState)}
    ${renderBindings(bindingState)}
    ${renderDevices(props)}
    <section class="card">
      <div class="row" style="justify-content: space-between;">
        <div>
          <div class="card-title">节点</div>
          <div class="card-sub">已配对设备及实时链接。</div>
        </div>
        <button class="btn" ?disabled=${props.loading} @click=${props.onRefresh}>
          ${props.loading ? "加载中…" : "刷新"}
        </button>
      </div>
      <div class="list" style="margin-top: 16px;">
        ${props.nodes.length === 0
      ? html`
                <div class="muted">未找到节点。</div>
              `
      : props.nodes.map((n) => renderNode(n))
    }
      </div>
    </section>
  `;
}

function renderDevices(props: NodesProps) {
  const list = props.devicesList ?? { pending: [], paired: [] };
  const pending = Array.isArray(list.pending) ? list.pending : [];
  const paired = Array.isArray(list.paired) ? list.paired : [];
  return html`
    <section class="card">
      <div class="row" style="justify-content: space-between;">
        <div>
          <div class="card-title">设备</div>
          <div class="card-sub">配对请求及角色令牌。</div>
        </div>
        <button class="btn" ?disabled=${props.devicesLoading} @click=${props.onDevicesRefresh}>
          ${props.devicesLoading ? "加载中…" : "刷新"}
        </button>
      </div>
      ${props.devicesError
      ? html`<div class="callout danger" style="margin-top: 12px;">${props.devicesError}</div>`
      : nothing
    }
      <div class="list" style="margin-top: 16px;">
        ${pending.length > 0
      ? html`
              <div class="muted" style="margin-bottom: 8px;">待处理</div>
              ${pending.map((req) => renderPendingDevice(req, props))}
            `
      : nothing
    }
        ${paired.length > 0
      ? html`
              <div class="muted" style="margin-top: 12px; margin-bottom: 8px;">已配对</div>
              ${paired.map((device) => renderPairedDevice(device, props))}
            `
      : nothing
    }
        ${pending.length === 0 && paired.length === 0
      ? html`
                <div class="muted">暂无已配对设备。</div>
              `
      : nothing
    }
      </div>
    </section>
  `;
}

function renderPendingDevice(req: PendingDevice, props: NodesProps) {
  const name = req.displayName?.trim() || req.deviceId;
  const age = typeof req.ts === "number" ? formatAgo(req.ts) : "未知";
  const role = req.role?.trim() ? `角色: ${req.role}` : "角色: -";
  const repair = req.isRepair ? " · 修复" : "";
  const ip = req.remoteIp ? ` · ${req.remoteIp}` : "";
  return html`
    <div class="list-item">
      <div class="list-main">
        <div class="list-title">${name}</div>
        <div class="list-sub">${req.deviceId}${ip}</div>
        <div class="muted" style="margin-top: 6px;">
          ${role} · 请求于 ${age}${repair}
        </div>
      </div>
      <div class="list-meta">
        <div class="row" style="justify-content: flex-end; gap: 8px; flex-wrap: wrap;">
          <button class="btn btn--sm primary" @click=${() => props.onDeviceApprove(req.requestId)}>
            批准
          </button>
          <button class="btn btn--sm" @click=${() => props.onDeviceReject(req.requestId)}>
            拒绝
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderPairedDevice(device: PairedDevice, props: NodesProps) {
  const name = device.displayName?.trim() || device.deviceId;
  const ip = device.remoteIp ? ` · ${device.remoteIp}` : "";
  const roles = `角色: ${formatList(device.roles)}`;
  const scopes = `权限范围: ${formatList(device.scopes)}`;
  const tokens = Array.isArray(device.tokens) ? device.tokens : [];
  return html`
    <div class="list-item">
      <div class="list-main">
        <div class="list-title">${name}</div>
        <div class="list-sub">${device.deviceId}${ip}</div>
        <div class="muted" style="margin-top: 6px;">${roles} · ${scopes}</div>
        ${tokens.length === 0
      ? html`
                <div class="muted" style="margin-top: 6px">令牌: 无</div>
              `
      : html`
              <div class="muted" style="margin-top: 10px;">令牌</div>
              <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 6px;">
                ${tokens.map((token) => renderTokenRow(device.deviceId, token, props))}
              </div>
            `
    }
      </div>
    </div>
  `;
}

function renderTokenRow(deviceId: string, token: DeviceTokenSummary, props: NodesProps) {
  const status = token.revokedAtMs ? "已撤销" : "活跃";
  const scopes = `权限范围: ${formatList(token.scopes)}`;
  const when = formatAgo(token.rotatedAtMs ?? token.createdAtMs ?? token.lastUsedAtMs ?? null);
  return html`
    <div class="row" style="justify-content: space-between; gap: 8px;">
      <div class="list-sub">${token.role} · ${status} · ${scopes} · ${when}</div>
      <div class="row" style="justify-content: flex-end; gap: 6px; flex-wrap: wrap;">
        <button
          class="btn btn--sm"
          @click=${() => props.onDeviceRotate(deviceId, token.role, token.scopes)}
        >
          轮换
        </button>
        ${token.revokedAtMs
      ? nothing
      : html`
              <button
                class="btn btn--sm danger"
                @click=${() => props.onDeviceRevoke(deviceId, token.role)}
              >
                撤销
              </button>
            `
    }
      </div>
    </div>
  `;
}

type BindingAgent = {
  id: string;
  name?: string;
  index: number;
  isDefault: boolean;
  binding?: string | null;
};

type BindingNode = {
  id: string;
  label: string;
};

type BindingState = {
  ready: boolean;
  disabled: boolean;
  configDirty: boolean;
  configLoading: boolean;
  configSaving: boolean;
  defaultBinding?: string | null;
  agents: BindingAgent[];
  nodes: BindingNode[];
  onBindDefault: (nodeId: string | null) => void;
  onBindAgent: (agentIndex: number, nodeId: string | null) => void;
  onSave: () => void;
  onLoadConfig: () => void;
  formMode: "form" | "raw";
};

type ExecSecurity = "deny" | "allowlist" | "full";
type ExecAsk = "off" | "on-miss" | "always";

type ExecApprovalsResolvedDefaults = {
  security: ExecSecurity;
  ask: ExecAsk;
  askFallback: ExecSecurity;
  autoAllowSkills: boolean;
};

type ExecApprovalsAgentOption = {
  id: string;
  name?: string;
  isDefault?: boolean;
};

type ExecApprovalsTargetNode = {
  id: string;
  label: string;
};

type ExecApprovalsState = {
  ready: boolean;
  disabled: boolean;
  dirty: boolean;
  loading: boolean;
  saving: boolean;
  form: ExecApprovalsFile | null;
  defaults: ExecApprovalsResolvedDefaults;
  selectedScope: string;
  selectedAgent: Record<string, unknown> | null;
  agents: ExecApprovalsAgentOption[];
  allowlist: ExecApprovalsAllowlistEntry[];
  target: "gateway" | "node";
  targetNodeId: string | null;
  targetNodes: ExecApprovalsTargetNode[];
  onSelectScope: (agentId: string) => void;
  onSelectTarget: (kind: "gateway" | "node", nodeId: string | null) => void;
  onPatch: (path: Array<string | number>, value: unknown) => void;
  onRemove: (path: Array<string | number>) => void;
  onLoad: () => void;
  onSave: () => void;
};

const EXEC_APPROVALS_DEFAULT_SCOPE = "__defaults__";

const SECURITY_OPTIONS: Array<{ value: ExecSecurity; label: string }> = [
  { value: "deny", label: "拒绝 (Deny)" },
  { value: "allowlist", label: "白名单 (Allowlist)" },
  { value: "full", label: "完全 (Full)" },
];

const ASK_OPTIONS: Array<{ value: ExecAsk; label: string }> = [
  { value: "off", label: "关闭 (Off)" },
  { value: "on-miss", label: "缺失时 (On miss)" },
  { value: "always", label: "总是 (Always)" },
];

function resolveBindingsState(props: NodesProps): BindingState {
  const config = props.configForm;
  const nodes = resolveExecNodes(props.nodes);
  const { defaultBinding, agents } = resolveAgentBindings(config);
  const ready = Boolean(config);
  const disabled = props.configSaving || props.configFormMode === "raw";
  return {
    ready,
    disabled,
    configDirty: props.configDirty,
    configLoading: props.configLoading,
    configSaving: props.configSaving,
    defaultBinding,
    agents,
    nodes,
    onBindDefault: props.onBindDefault,
    onBindAgent: props.onBindAgent,
    onSave: props.onSaveBindings,
    onLoadConfig: props.onLoadConfig,
    formMode: props.configFormMode,
  };
}

function normalizeSecurity(value?: string): ExecSecurity {
  if (value === "allowlist" || value === "full" || value === "deny") {
    return value;
  }
  return "deny";
}

function normalizeAsk(value?: string): ExecAsk {
  if (value === "always" || value === "off" || value === "on-miss") {
    return value;
  }
  return "on-miss";
}

function resolveExecApprovalsDefaults(
  form: ExecApprovalsFile | null,
): ExecApprovalsResolvedDefaults {
  const defaults = form?.defaults ?? {};
  return {
    security: normalizeSecurity(defaults.security),
    ask: normalizeAsk(defaults.ask),
    askFallback: normalizeSecurity(defaults.askFallback ?? "deny"),
    autoAllowSkills: Boolean(defaults.autoAllowSkills ?? false),
  };
}

function resolveConfigAgents(config: Record<string, unknown> | null): ExecApprovalsAgentOption[] {
  const agentsNode = (config?.agents ?? {}) as Record<string, unknown>;
  const list = Array.isArray(agentsNode.list) ? agentsNode.list : [];
  const agents: ExecApprovalsAgentOption[] = [];
  list.forEach((entry) => {
    if (!entry || typeof entry !== "object") {
      return;
    }
    const record = entry as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id.trim() : "";
    if (!id) {
      return;
    }
    const name = typeof record.name === "string" ? record.name.trim() : undefined;
    const isDefault = record.default === true;
    agents.push({ id, name: name || undefined, isDefault });
  });
  return agents;
}

function resolveExecApprovalsAgents(
  config: Record<string, unknown> | null,
  form: ExecApprovalsFile | null,
): ExecApprovalsAgentOption[] {
  const configAgents = resolveConfigAgents(config);
  const approvalsAgents = Object.keys(form?.agents ?? {});
  const merged = new Map<string, ExecApprovalsAgentOption>();
  configAgents.forEach((agent) => merged.set(agent.id, agent));
  approvalsAgents.forEach((id) => {
    if (merged.has(id)) {
      return;
    }
    merged.set(id, { id });
  });
  const agents = Array.from(merged.values());
  if (agents.length === 0) {
    agents.push({ id: "main", isDefault: true });
  }
  agents.sort((a, b) => {
    if (a.isDefault && !b.isDefault) {
      return -1;
    }
    if (!a.isDefault && b.isDefault) {
      return 1;
    }
    const aLabel = a.name?.trim() ? a.name : a.id;
    const bLabel = b.name?.trim() ? b.name : b.id;
    return aLabel.localeCompare(bLabel);
  });
  return agents;
}

function resolveExecApprovalsScope(
  selected: string | null,
  agents: ExecApprovalsAgentOption[],
): string {
  if (selected === EXEC_APPROVALS_DEFAULT_SCOPE) {
    return EXEC_APPROVALS_DEFAULT_SCOPE;
  }
  if (selected && agents.some((agent) => agent.id === selected)) {
    return selected;
  }
  return EXEC_APPROVALS_DEFAULT_SCOPE;
}

function resolveExecApprovalsState(props: NodesProps): ExecApprovalsState {
  const form = props.execApprovalsForm ?? props.execApprovalsSnapshot?.file ?? null;
  const ready = Boolean(form);
  const defaults = resolveExecApprovalsDefaults(form);
  const agents = resolveExecApprovalsAgents(props.configForm, form);
  const targetNodes = resolveExecApprovalsNodes(props.nodes);
  const target = props.execApprovalsTarget;
  let targetNodeId =
    target === "node" && props.execApprovalsTargetNodeId ? props.execApprovalsTargetNodeId : null;
  if (target === "node" && targetNodeId && !targetNodes.some((node) => node.id === targetNodeId)) {
    targetNodeId = null;
  }
  const selectedScope = resolveExecApprovalsScope(props.execApprovalsSelectedAgent, agents);
  const selectedAgent =
    selectedScope !== EXEC_APPROVALS_DEFAULT_SCOPE
      ? (((form?.agents ?? {})[selectedScope] as Record<string, unknown> | undefined) ?? null)
      : null;
  const allowlist = Array.isArray((selectedAgent as { allowlist?: unknown })?.allowlist)
    ? ((selectedAgent as { allowlist?: ExecApprovalsAllowlistEntry[] }).allowlist ?? [])
    : [];
  return {
    ready,
    disabled: props.execApprovalsSaving || props.execApprovalsLoading,
    dirty: props.execApprovalsDirty,
    loading: props.execApprovalsLoading,
    saving: props.execApprovalsSaving,
    form,
    defaults,
    selectedScope,
    selectedAgent,
    agents,
    allowlist,
    target,
    targetNodeId,
    targetNodes,
    onSelectScope: props.onExecApprovalsSelectAgent,
    onSelectTarget: props.onExecApprovalsTargetChange,
    onPatch: props.onExecApprovalsPatch,
    onRemove: props.onExecApprovalsRemove,
    onLoad: props.onLoadExecApprovals,
    onSave: props.onSaveExecApprovals,
  };
}

function renderBindings(state: BindingState) {
  const supportsBinding = state.nodes.length > 0;
  const defaultValue = state.defaultBinding ?? "";
  return html`
    <section class="card">
      <div class="row" style="justify-content: space-between; align-items: center;">
        <div>
          <div class="card-title">执行节点绑定</div>
          <div class="card-sub">
            使用 <span class="mono">exec host=node</span> 时将代理绑定到特定节点。
          </div>
        </div>
        <button
          class="btn"
          ?disabled=${state.disabled || !state.configDirty}
          @click=${state.onSave}
        >
          ${state.configSaving ? "保存中…" : "保存"}
        </button>
      </div>

      ${state.formMode === "raw"
      ? html`
              <div class="callout warn" style="margin-top: 12px">
                切换配置标签页到 <strong>Form</strong> 模式以在此编辑绑定。
              </div>
            `
      : nothing
    }

      ${!state.ready
      ? html`<div class="row" style="margin-top: 12px; gap: 12px;">
            <div class="muted">加载配置以编辑绑定。</div>
            <button class="btn" ?disabled=${state.configLoading} @click=${state.onLoadConfig}>
              ${state.configLoading ? "加载中…" : "加载配置"}
            </button>
          </div>`
      : html`
            <div class="list" style="margin-top: 16px;">
              <div class="list-item">
                <div class="list-main">
                  <div class="list-title">默认绑定</div>
                  <div class="list-sub">当代理未覆盖节点绑定时使用。</div>
                </div>
                <div class="list-meta">
                  <label class="field">
                    <span>节点</span>
                    <select
                      ?disabled=${state.disabled || !supportsBinding}
                      @change=${(event: Event) => {
          const target = event.target as HTMLSelectElement;
          const value = target.value.trim();
          state.onBindDefault(value ? value : null);
        }}
                    >
                      <option value="" ?selected=${defaultValue === ""}>任意节点</option>
                      ${state.nodes.map(
          (node) =>
            html`<option
                            value=${node.id}
                            ?selected=${defaultValue === node.id}
                          >
                            ${node.label}
                          </option>`,
        )}
                    </select>
                  </label>
                  ${!supportsBinding
          ? html`
                          <div class="muted">无支持 system.run 的可用节点。</div>
                        `
          : nothing
        }
                </div>
              </div>

              ${state.agents.length === 0
          ? html`
                      <div class="muted">未找到代理。</div>
                    `
          : state.agents.map((agent) => renderAgentBinding(agent, state))
        }
            </div>
          `
    }
    </section>
  `;
}

function renderExecApprovals(state: ExecApprovalsState) {
  const ready = state.ready;
  const targetReady = state.target !== "node" || Boolean(state.targetNodeId);
  return html`
    <section class="card">
      <div class="row" style="justify-content: space-between; align-items: center;">
        <div>
          <div class="card-title">执行审批</div>
          <div class="card-sub">
            <span class="mono">exec host=gateway/node</span> 的白名单及审批策略。
          </div>
        </div>
        <button
          class="btn"
          ?disabled=${state.disabled || !state.dirty || !targetReady}
          @click=${state.onSave}
        >
          ${state.saving ? "保存中…" : "保存"}
        </button>
      </div>

      ${renderExecApprovalsTarget(state)}

      ${!ready
      ? html`<div class="row" style="margin-top: 12px; gap: 12px;">
            <div class="muted">加载执行审批以编辑白名单。</div>
            <button class="btn" ?disabled=${state.loading || !targetReady} @click=${state.onLoad}>
              ${state.loading ? "加载中…" : "加载审批"}
            </button>
          </div>`
      : html`
            ${renderExecApprovalsTabs(state)}
            ${renderExecApprovalsPolicy(state)}
            ${state.selectedScope === EXEC_APPROVALS_DEFAULT_SCOPE
          ? nothing
          : renderExecApprovalsAllowlist(state)
        }
          `
    }
    </section>
  `;
}

function renderExecApprovalsTarget(state: ExecApprovalsState) {
  const hasNodes = state.targetNodes.length > 0;
  const nodeValue = state.targetNodeId ?? "";
  return html`
    <div class="list" style="margin-top: 12px;">
      <div class="list-item">
        <div class="list-main">
          <div class="list-title">目标</div>
          <div class="list-sub">
            网关编辑本地审批；节点编辑所选节点。
          </div>
        </div>
        <div class="list-meta">
          <label class="field">
            <span>主机</span>
            <select
              ?disabled=${state.disabled}
              @change=${(event: Event) => {
      const target = event.target as HTMLSelectElement;
      const value = target.value;
      if (value === "node") {
        const first = state.targetNodes[0]?.id ?? null;
        state.onSelectTarget("node", nodeValue || first);
      } else {
        state.onSelectTarget("gateway", null);
      }
    }}
            >
              <option value="gateway" ?selected=${state.target === "gateway"}>网关</option>
              <option value="node" ?selected=${state.target === "node"}>节点</option>
            </select>
          </label>
          ${state.target === "node"
      ? html`
                <label class="field">
                  <span>节点</span>
                  <select
                    ?disabled=${state.disabled || !hasNodes}
                    @change=${(event: Event) => {
          const target = event.target as HTMLSelectElement;
          const value = target.value.trim();
          state.onSelectTarget("node", value ? value : null);
        }}
                  >
                    <option value="" ?selected=${nodeValue === ""}>选择节点</option>
                    ${state.targetNodes.map(
          (node) =>
            html`<option
                          value=${node.id}
                          ?selected=${nodeValue === node.id}
                        >
                          ${node.label}
                        </option>`,
        )}
                  </select>
                </label>
              `
      : nothing
    }
        </div>
      </div>
      ${state.target === "node" && !hasNodes
      ? html`
              <div class="muted">暂无节点广播执行审批功能。</div>
            `
      : nothing
    }
    </div>
  `;
}

function renderExecApprovalsTabs(state: ExecApprovalsState) {
  return html`
    <div class="row" style="margin-top: 12px; gap: 8px; flex-wrap: wrap;">
      <span class="label">范围</span>
      <div class="row" style="gap: 8px; flex-wrap: wrap;">
        <button
          class="btn btn--sm ${state.selectedScope === EXEC_APPROVALS_DEFAULT_SCOPE ? "active" : ""}"
          @click=${() => state.onSelectScope(EXEC_APPROVALS_DEFAULT_SCOPE)}
        >
          默认值
        </button>
        ${state.agents.map((agent) => {
    const label = agent.name?.trim() ? `${agent.name} (${agent.id})` : agent.id;
    return html`
            <button
              class="btn btn--sm ${state.selectedScope === agent.id ? "active" : ""}"
              @click=${() => state.onSelectScope(agent.id)}
            >
              ${label}
            </button>
          `;
  })}
      </div>
    </div>
  `;
}

function renderExecApprovalsPolicy(state: ExecApprovalsState) {
  const isDefaults = state.selectedScope === EXEC_APPROVALS_DEFAULT_SCOPE;
  const defaults = state.defaults;
  const agent = state.selectedAgent ?? {};
  const basePath = isDefaults ? ["defaults"] : ["agents", state.selectedScope];
  const agentSecurity = typeof agent.security === "string" ? agent.security : undefined;
  const agentAsk = typeof agent.ask === "string" ? agent.ask : undefined;
  const agentAskFallback = typeof agent.askFallback === "string" ? agent.askFallback : undefined;
  const securityValue = isDefaults ? defaults.security : (agentSecurity ?? "__default__");
  const askValue = isDefaults ? defaults.ask : (agentAsk ?? "__default__");
  const askFallbackValue = isDefaults ? defaults.askFallback : (agentAskFallback ?? "__default__");
  const autoOverride =
    typeof agent.autoAllowSkills === "boolean" ? agent.autoAllowSkills : undefined;
  const autoEffective = autoOverride ?? defaults.autoAllowSkills;
  const autoIsDefault = autoOverride == null;

  return html`
    <div class="list" style="margin-top: 16px;">
      <div class="list-item">
        <div class="list-main">
          <div class="list-title">安全</div>
          <div class="list-sub">
            ${isDefaults ? "默认安全模式。" : `默认: ${defaults.security}。`}
          </div>
        </div>
        <div class="list-meta">
          <label class="field">
            <span>模式</span>
            <select
              ?disabled=${state.disabled}
              @change=${(event: Event) => {
      const target = event.target as HTMLSelectElement;
      const value = target.value;
      if (!isDefaults && value === "__default__") {
        state.onRemove([...basePath, "security"]);
      } else {
        state.onPatch([...basePath, "security"], value);
      }
    }}
            >
              ${!isDefaults
      ? html`<option value="__default__" ?selected=${securityValue === "__default__"}>
                    使用默认 (${defaults.security})
                  </option>`
      : nothing
    }
              ${SECURITY_OPTIONS.map(
      (option) =>
        html`<option
                    value=${option.value}
                    ?selected=${securityValue === option.value}
                  >
                    ${option.label}
                  </option>`,
    )}
            </select>
          </label>
        </div>
      </div>

      <div class="list-item">
        <div class="list-main">
          <div class="list-title">询问</div>
          <div class="list-sub">
            ${isDefaults ? "默认提示策略。" : `默认: ${defaults.ask}。`}
          </div>
        </div>
        <div class="list-meta">
          <label class="field">
            <span>模式</span>
            <select
              ?disabled=${state.disabled}
              @change=${(event: Event) => {
      const target = event.target as HTMLSelectElement;
      const value = target.value;
      if (!isDefaults && value === "__default__") {
        state.onRemove([...basePath, "ask"]);
      } else {
        state.onPatch([...basePath, "ask"], value);
      }
    }}
            >
              ${!isDefaults
      ? html`<option value="__default__" ?selected=${askValue === "__default__"}>
                    使用默认 (${defaults.ask})
                  </option>`
      : nothing
    }
              ${ASK_OPTIONS.map(
      (option) =>
        html`<option
                    value=${option.value}
                    ?selected=${askValue === option.value}
                  >
                    ${option.label}
                  </option>`,
    )}
            </select>
          </label>
        </div>
      </div>

      <div class="list-item">
        <div class="list-main">
          <div class="list-title">询问失败策略</div>
          <div class="list-sub">
             ${isDefaults
      ? "由于无 UI 等原因无法询问时的动作。"
      : `默认: ${defaults.askFallback}。`
    }
          </div>
        </div>
        <div class="list-meta">
          <label class="field">
            <span>模式</span>
            <select
              ?disabled=${state.disabled}
              @change=${(event: Event) => {
      const target = event.target as HTMLSelectElement;
      const value = target.value;
      if (!isDefaults && value === "__default__") {
        state.onRemove([...basePath, "askFallback"]);
      } else {
        state.onPatch([...basePath, "askFallback"], value);
      }
    }}
            >
              ${!isDefaults
      ? html`<option value="__default__" ?selected=${askFallbackValue === "__default__"}>
                    使用默认 (${defaults.askFallback})
                  </option>`
      : nothing
    }
              ${SECURITY_OPTIONS.map(
      (option) =>
        html`<option
                    value=${option.value}
                    ?selected=${askFallbackValue === option.value}
                  >
                    ${option.label}
                  </option>`,
    )}
            </select>
          </label>
        </div>
      </div>

      <div class="list-item">
        <div class="list-main">
          <div class="list-title">自动允许技能</div>
          <div class="list-sub">
            ${isDefaults
      ? "自动将技能二进制文件加入白名单。"
      : `默认: ${defaults.autoAllowSkills ? "是" : "否"}。`
    }
          </div>
        </div>
        <div class="list-meta">
          <label class="field">
            <span>启用</span>
            <select
              ?disabled=${state.disabled}
              @change=${(event: Event) => {
      const target = event.target as HTMLSelectElement;
      const value = target.value;
      if (!isDefaults && value === "__default__") {
        state.onRemove([...basePath, "autoAllowSkills"]);
      } else {
        state.onPatch([...basePath, "autoAllowSkills"], value === "true");
      }
    }}
            >
              ${!isDefaults
      ? html`<option value="__default__" ?selected=${autoIsDefault}>
                    使用默认 (${defaults.autoAllowSkills ? "是" : "否"})
                  </option>`
      : nothing
    }
              <option value="true" ?selected=${!autoIsDefault && autoEffective === true}>
                是 (True)
              </option>
              <option value="false" ?selected=${!autoIsDefault && autoEffective === false}>
                否 (False)
              </option>
            </select>
          </label>
        </div>
      </div>
    </div>
  `;
}

function renderExecApprovalsAllowlist(state: ExecApprovalsState) {
  return html`
    <div class="list" style="margin-top: 16px;">
      <div class="list-item">
        <div class="list-main">
          <div class="list-title">白名单</div>
          <div class="list-sub">已批准的哈希和路径。</div>
        </div>
        <div class="list-meta">
          <div class="row" style="gap: 8px;">
            <input
              id="exec-approvals-add-input"
              placeholder="哈希或路径"
              ?disabled=${state.disabled}
            />
            <button
              class="btn primary"
              ?disabled=${state.disabled}
              @click=${() => {
      const input = document.getElementById(
        "exec-approvals-add-input",
      ) as HTMLInputElement;
      const val = input.value.trim();
      if (!val) return;
      const isHash = val.length > 32 && !val.includes("/") && !val.includes("\\");
      const entry = isHash ? { hash: val } : { path: val };
      const basePath = ["agents", state.selectedScope, "allowlist"];
      const nextList = [...state.allowlist, entry];
      state.onPatch(basePath, nextList);
      input.value = "";
    }}
            >
              添加
            </button>
          </div>
        </div>
      </div>
      ${state.allowlist.length === 0
      ? html`<div class="muted">无条目。</div>`
      : state.allowlist.map((entry, index) => {
        const label = "hash" in entry ? `Hash: ${entry.hash}` : `Path: ${entry.path}`;
        return html`
                <div class="list-item">
                  <div class="list-main">
                    <div class="mono" style="font-size: 0.9em;">${label}</div>
                  </div>
                  <div class="list-meta">
                    <button
                      class="btn btn--sm danger"
                      ?disabled=${state.disabled}
                      @click=${() => {
            const basePath = ["agents", state.selectedScope, "allowlist"];
            const nextList = [...state.allowlist];
            nextList.splice(index, 1);
            state.onPatch(basePath, nextList);
          }}
                    >
                      移除
                    </button>
                  </div>
                </div>
              `;
      })
    }
    </div>
  `;
}

function resolveExecNodes(nodes: Array<Record<string, unknown>>): BindingNode[] {
  return nodes
    .filter((n) => {
      const caps = Array.isArray(n.capabilities) ? n.capabilities : [];
      return caps.includes("system.run") || caps.includes("exec");
    })
    .map((n) => ({
      id: typeof n.deviceId === "string" ? n.deviceId : "",
      label: typeof n.displayName === "string" ? n.displayName || n.deviceId || "?" : "?",
    }))
    .filter((n) => n.id);
}

function resolveAgentBindings(config: Record<string, unknown> | null): {
  defaultBinding: string | null;
  agents: BindingAgent[];
} {
  const agents = resolveConfigAgents(config);
  const hooks = (config?.hooks ?? {}) as Record<string, unknown>;
  const agentBindings = (hooks.agentBindings ?? {}) as Record<string, unknown>;
  const defaultBinding = typeof agentBindings.default === "string" ? agentBindings.default : null;
  const list: BindingAgent[] = agents.map((agent, index) => {
    const binding =
      typeof agentBindings[agent.id] === "string"
        ? (agentBindings[agent.id] as string)
        : undefined;
    if (typeof binding === "string") {
      return { ...agent, index, binding };
    }
    return { ...agent, index, binding: null };
  });
  return { defaultBinding, agents: list };
}

function renderAgentBinding(agent: BindingAgent, state: BindingState) {
  const supportsBinding = state.nodes.length > 0;
  const label = agent.name?.trim() ? `${agent.name} (${agent.id})` : agent.id;
  const bindingValue = agent.binding ?? "";
  const effective = bindingValue || state.defaultBinding || "";
  return html`
    <div class="list-item">
      <div class="list-main">
        <div class="list-title">覆盖 ${label}</div>
        <div class="list-sub">
          ${agent.isDefault ? "默认代理。" : `索引 ${agent.index}。`}
        </div>
      </div>
      <div class="list-meta">
        <label class="field">
          <span>节点</span>
          <select
            ?disabled=${state.disabled || !supportsBinding}
            @change=${(event: Event) => {
      const target = event.target as HTMLSelectElement;
      const value = target.value.trim();
      state.onBindAgent(agent.index, value ? value : null);
    }}
          >
            <option value="" ?selected=${bindingValue === ""}>
              ${state.defaultBinding ? "使用默认" : "使用默认 (任意)"}
            </option>
            ${state.nodes.map(
      (node) =>
        html`<option
                  value=${node.id}
                  ?selected=${bindingValue === node.id}
                >
                  ${node.label}
                </option>`,
    )}
          </select>
        </label>
      </div>
    </div>
  `;
}

function renderNode(node: Record<string, unknown>) {
  const id = typeof node.deviceId === "string" ? node.deviceId : "unknown";
  const label = typeof node.displayName === "string" ? node.displayName : id;
  const connected = node.connected === true;
  const age = typeof node.lastSeenAt === "number" ? formatAgo(node.lastSeenAt) : "未知";
  const caps = Array.isArray(node.capabilities) ? node.capabilities : [];
  return html`
    <div class="list-item">
      <div class="list-main">
        <div class="list-title">
          ${label}
          <span class="pill pill--sm ${connected ? "pill--ok" : "pill--warn"}">
            ${connected ? "已连接" : "离线"}
          </span>
        </div>
        <div class="list-sub">${id}</div>
        <div class="muted">上次可见: ${age}</div>
        ${caps.length > 0
      ? html`<div class="chip-row" style="margin-top: 6px;">
                ${caps.map((c) => html`<span class="chip">${c}</span>`)}
              </div>`
      : nothing
    }
      </div>
    </div>
  `;
}
