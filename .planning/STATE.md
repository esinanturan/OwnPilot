# STATE — OwnPilot UI Redesign

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-03-28 — Milestone v1.0 started

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-28)

**Core value:** Sidebar'da sadece kullanicinin ihtiyac duydugu sey gorunur
**Current focus:** Sidebar Overhaul — Cowork tarzi yapisal sidebar + Customize sayfasi

## Accumulated Context

- Layout.tsx 519 satir, 3-column layout (sidebar w-56 + content + StatsPanel)
- mainItems[5] + navGroups[6] (56 items) + bottomItems[2] = ~63 item
- API mevcut: workflowsApi.list(), chatApi.listHistory(), fileWorkspacesApi.list()
- Wireframe: ~/Downloads/Ekran Resmi 2026-03-28 11.42.21.png
- Cowork referans: ~/Downloads/Ekran Resmi 2026-03-27 12.49.14.png
- Base: feature/bridge-conversation-id, image: session-fix-v5
