# RiveTelemetry

RiveTelemetry is a developer tool for inspecting and debugging Rive runtime behavior.

## Workspace

- `extension/` contains the VS Code extension.
- `package/` contains the Flutter bridge/debugger wrapper.
- `js/` contains the JavaScript/TypeScript runtime bridge.
- `demo/` contains the Flutter web demo app.

## Current Scope

RiveTelemetry currently includes the VS Code inspection panel plus reusable
runtime bridges:

- baseline project structure
- dependency wiring
- minimal VS Code extension command scaffold
- Flutter `RiveDebugger` wrapper for broadcasting Rive state-machine input telemetry
- JavaScript `RiveTelemetry` client for broadcasting web runtime telemetry
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

JavaScript apps can use the framework-neutral client:

```ts
const telemetry = new RiveTelemetry({
  rive,
  runtimeId: 'hero-animation',
  stateMachineName: 'State Machine 1',
});

telemetry.start();
```
