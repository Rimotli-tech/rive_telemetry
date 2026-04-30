# RiveTelemetry

RiveTelemetry is a developer tool for inspecting and debugging Rive runtime behavior.

## Workspace

- `extension/` contains the VS Code extension.
- `package/` contains the Flutter bridge/debugger wrapper.
- `demo/` contains the Flutter web demo app.

## Day 1 Scope

The current goal is only architectural scaffolding for the monorepo:

- baseline project structure
- dependency wiring
- placeholder Flutter debugger wrapper
- minimal Flutter web demo
- minimal VS Code extension command scaffold

Future work will add runtime telemetry, WebSocket transport, VS Code panels, and production-safe environment gating.
