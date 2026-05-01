# RiveTelemetry

RiveTelemetry is a developer tool for inspecting and debugging Rive runtime behavior.

## Workspace

- `extension/` contains the VS Code extension.
- `package/` contains the Flutter bridge/debugger wrapper.
- `demo/` contains the Flutter web demo app.

## Current Scope

RiveTelemetry currently includes the initial monorepo scaffold plus a reusable
Flutter debugger wrapper:

- baseline project structure
- dependency wiring
- minimal VS Code extension command scaffold
- Flutter `RiveDebugger` wrapper for broadcasting Rive state-machine input telemetry
- demo app that renders a Rive file and passes its active state machine into `RiveDebugger`

`RiveDebugger` is dev-only by default. Release builds automatically disable
telemetry so it does not open WebSockets, poll inputs, print logs, or send data.
Use `enabled` to explicitly override behavior during local validation.

```dart
RiveDebugger(
  stateMachine: stateMachine,
  child: RiveWidget(controller: controller),
)
```

Future work will add VS Code panels, incoming commands, richer telemetry, and
additional production-safe controls.
