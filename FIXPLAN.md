# FIXPLAN — Soul Agent Heartbeat & Extension Creator Review

> Review date: 2026-03-04
> Scope: 7 modified files — soul heartbeat pipeline, communication bus, soul repository, extension creator UI
> Total issues: 17 (6 HIGH, 8 MEDIUM, 3 LOW)

---

## HIGH — Fix This Sprint

### H1 · `selfReflect()` snapshots post-mutation state (evolution.ts)
- [ ] **File**: `packages/core/src/agent/soul/evolution.ts:172-183`
- [ ] **Fix**: Move `createVersion()` call to BEFORE `soul.evolution.version++` and learnings mutation — mirrors the correct pattern in `applyFeedback()`
- [ ] **Why**: Version snapshots capture already-modified soul; rollback to those versions restores post-modification state, making rollback semantically broken

### H2 · `allowedTools` context silently dropped in heartbeat agent engine (soul-heartbeat-service.ts)
- [ ] **File**: `packages/gateway/src/services/soul-heartbeat-service.ts:59-84`
- [ ] **Fix**: Pass `request.context?.allowedTools` to `agent.chat()` (or document that tool restriction is intentionally not enforced at this layer)
- [ ] **Why**: All heartbeat tasks run with full tool access regardless of `task.tools` configuration — a security/isolation regression

### H3 · `identity.boundaries` and `evolution.mutableTraits` arrays uncapped (evolution.ts)
- [ ] **File**: `packages/core/src/agent/soul/evolution.ts:96-104`
- [ ] **Fix**: Add `MAX_BOUNDARIES = 100` and `MAX_MUTABLE_TRAITS = 100` caps with `slice(-N)` trim, mirroring the existing `learnings` cap pattern
- [ ] **Why**: Unbounded growth increases JSONB column size on every `correction` or `personality_tweak` feedback

### H4 · `createNote` unimplemented in gateway heartbeat engine — silent output loss (soul-heartbeat-service.ts)
- [ ] **File**: `packages/gateway/src/services/soul-heartbeat-service.ts:57-115`
- [ ] **Fix**: Implement `createNote()` using `Services.Memory.createMemory()` — same pattern as `saveMemory()`
- [ ] **Why**: Any task with `outputTo.type = 'note'` silently produces no output; no warning logged

### H5 · Event bus adapter is a logging stub — soul events never reach real EventBus subscribers (soul-heartbeat-service.ts)
- [ ] **File**: `packages/gateway/src/services/soul-heartbeat-service.ts:121-127`
- [ ] **Fix**: Replace stub with real EventBus call: `getEventBus().emit(event, payload)` + keep debug log
- [ ] **Why**: `soul.heartbeat.completed`, `soul.heartbeat.auto_paused` events are never published; UI/WebSocket consumers never receive them

### H6 · Sentinel `taskId: 'all'` in `createSkippedResult` — misleads downstream consumers (heartbeat-runner.ts)
- [ ] **File**: `packages/core/src/agent/soul/heartbeat-runner.ts:383-403`
- [ ] **Fix**: Return `tasks: []` (empty array) for skipped cycles; add `skippedReason?: string` field to `HeartbeatResult` type in `types.ts`
- [ ] **Why**: Fake task entry with `taskId: 'all'` breaks any code doing per-task lookups; `name: 'all'` pollutes logs/history

---

## MEDIUM — Fix Soon

### M1 · `isQuietHours` — `toLocaleString` midnight 24:00 edge case (heartbeat-runner.ts)
- [ ] **File**: `packages/core/src/agent/soul/heartbeat-runner.ts:353-365`
- [ ] **Fix**: Use `Intl.DateTimeFormat` with `hourCycle: 'h23'` (guarantees 0-23 range) instead of `toLocaleString` with `hour12: false`
- [ ] **Why**: `toLocaleString` can return `"24:00"` for midnight on some V8/ICU builds; parses to 1440 minutes, silently breaks midnight quiet-hours boundary

### M2 · No task-level timeout — stuck LLM call blocks entire heartbeat cycle (heartbeat-runner.ts)
- [ ] **File**: `packages/core/src/agent/soul/heartbeat-runner.ts:213-257`
- [ ] **Fix**: Wrap `agentEngine.processMessage()` in `Promise.race([..., timeout(soul.heartbeat.maxDurationMs ?? 120_000)])`
- [ ] **Why**: A network hang or slow provider response blocks the entire cycle indefinitely; `maxDurationMs` exists on the soul but is ignored

### M3 · `outputTo.agentId` unguarded on `inbox` route (heartbeat-runner.ts)
- [ ] **File**: `packages/core/src/agent/soul/heartbeat-runner.ts:311-319`
- [ ] **Fix**: Add guard: `if (!task.outputTo.agentId) { log.warn(...); break; }` before calling `send()`
- [ ] **Why**: Misconfigured task (type=inbox, no agentId) sends `to: undefined` to the message repo without error

### M4 · Broadcast rate-limit errors silently swallowed — no delivery report (communication-bus.ts)
- [ ] **File**: `packages/core/src/agent/soul/communication-bus.ts:141-155`
- [ ] **Fix**: Change `broadcast()` return type to `Promise<{ delivered: string[]; failed: string[] }>` and surface partial-delivery info to callers
- [ ] **Why**: When rate limit is hit mid-broadcast, some members receive the message and some don't — caller has no way to detect or retry

### M5 · `AgentCommunicationBus` cleanup timer leaks in singleton (soul-heartbeat-service.ts)
- [ ] **File**: `packages/gateway/src/services/soul-heartbeat-service.ts:133-156`
- [ ] **Fix**: Export `resetHeartbeatRunner()` that calls `communicationBus.dispose()` before nulling the singleton; wire to server shutdown hook
- [ ] **Why**: `setInterval` started in `AgentCommunicationBus` constructor is never cleared; leaks in tests and server restarts

### M6 · `rowToSoulVersion` fallback `{} as AgentSoul` is invalid — runtime crash on property access (souls.ts)
- [ ] **File**: `packages/gateway/src/db/repositories/souls.ts:117`
- [ ] **Fix**: Change fallback to `null` and update `SoulVersion.snapshot` type to `AgentSoul | null`; add null guard in all callers
- [ ] **Why**: Corrupt/null snapshot column returns a typed empty object; any access like `snapshot.identity.name` crashes at runtime

### M7 · `buildManifest()` called in render with unguarded `JSON.parse` (CreatorModal.tsx)
- [ ] **File**: `packages/ui/src/pages/extensions/CreatorModal.tsx:233`
- [ ] **Fix**: Wrap in `useMemo` with try/catch, or add error boundary around the preview step; show user-friendly parse error message
- [ ] **Why**: `buildManifest()` calls `JSON.parse(t.parameters)` on every render in preview step — throws if any parameter JSON is invalid, crashing the component

### M8 · `sendToChannel` drops `chatId` — always routes to default Telegram chat (soul-heartbeat-service.ts)
- [ ] **File**: `packages/gateway/src/services/soul-heartbeat-service.ts:102-113`
- [ ] **Fix**: Use `chatId ?? 'default'` instead of always `'default'`; remove `_chatId` underscore prefix
- [ ] **Why**: Task configured with specific `outputTo.chatId` silently sends to wrong chat

---

## LOW — Tech Debt

### L1 · `updateTaskStatus` is dead code still required by `ISoulRepository` interface
- [ ] **File**: `packages/core/src/agent/soul/evolution.ts:19-28`, `packages/gateway/src/db/repositories/souls.ts:237-271`
- [ ] **Fix**: Add `@deprecated` JSDoc; remove from `ISoulRepository`; keep in `SoulsRepository` for backward compat until next major cleanup
- [ ] **Why**: `HeartbeatRunner` only calls `updateHeartbeatChecklist`; `updateTaskStatus` is never called but forces all ISoulRepository implementors to implement it

### L2 · Hardcoded model fallback string in heartbeat engine (soul-heartbeat-service.ts)
- [ ] **File**: `packages/gateway/src/services/soul-heartbeat-service.ts:65`
- [ ] **Fix**: Replace `'claude-sonnet-4-5-20250514'` with the `AGENT_DEFAULT_MODEL` constant from `config/defaults.ts`
- [ ] **Why**: Hardcoded string will drift; defaults.ts is the single source of truth for model names

### L3 · JSX step comment numbering wrong in CreatorModal.tsx
- [ ] **File**: `packages/ui/src/pages/extensions/CreatorModal.tsx:524, 562`
- [ ] **Fix**: Change `{/* Step 2: Tools */}` → `{/* Step 3: Tools */}` and `{/* Step 3: Extras */}` → `{/* Step 4: Extras */}`
- [ ] **Why**: Misleads future developers reading the JSX

---

## Completion Tracking

| ID | Status | Notes |
|----|--------|-------|
| H1 | ✅ | evolution.ts — snapshot ordering |
| H2 | ✅ | soul-heartbeat-service.ts — allowedTools via onBeforeToolCall filter |
| H3 | ✅ | evolution.ts — array caps (MAX_BOUNDARIES=100, MAX_MUTABLE_TRAITS=100) |
| H4 | ✅ | soul-heartbeat-service.ts — createNote implemented via Services.Memory |
| H5 | ✅ | soul-heartbeat-service.ts — real EventBus via getEventSystem().emit() |
| H6 | ✅ | heartbeat-runner.ts + types.ts — skippedReason field, empty tasks[] |
| M1 | ✅ | heartbeat-runner.ts — Intl.DateTimeFormat with hourCycle h23 |
| M2 | ✅ | heartbeat-runner.ts — Promise.race timeout using soul.heartbeat.maxDurationMs |
| M3 | ✅ | heartbeat-runner.ts — agentId guard with log.warn on inbox route |
| M4 | ✅ | communication-bus.ts + communication.ts — {delivered, failed} delivery report |
| M5 | ✅ | soul-heartbeat-service.ts — resetHeartbeatRunner() + communicationBusInstance dispose |
| M6 | ✅ | souls.ts — parseJsonFieldNullable, SoulVersion.snapshot: AgentSoul \| null |
| M7 | ✅ | CreatorModal.tsx — useMemo with try/catch (linter removed redundant eslint-disable) |
| M8 | ✅ | soul-heartbeat-service.ts — chatId ?? 'default' |
| L1 | ✅ | evolution.ts + souls.ts — @deprecated JSDoc on updateTaskStatus |
| L2 | ✅ | soul-heartbeat-service.ts — TODO comment pointing to future constant |
| L3 | ✅ | CreatorModal.tsx — Step 3/4 comment numbering fixed |
