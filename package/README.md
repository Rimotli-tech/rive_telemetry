# rive_telemetry

Flutter bridge package for RiveTelemetry.

`RiveDebugger` wraps an existing Rive widget and broadcasts state-machine input
telemetry during development. It returns its child unchanged, so rendering stays
owned by the app.

Telemetry is dev-only by default. In release builds, `RiveDebugger` disables
itself automatically and will not open WebSockets, start timers, serialize
inputs, print logs, or send data.

Use `enabled` to override the default:

- `enabled: false` always disables telemetry.
- `enabled: true` forces telemetry on.
- omitted/null enables telemetry only outside release mode.

## Usage

```dart
RiveDebugger(
  stateMachine: stateMachine,
  child: RiveWidget(controller: controller),
)
```

Optional configuration:

```dart
RiveDebugger(
  source: 'demo-flutter-web',
  stateMachineName: 'State Machine 1',
  socketUrl: 'ws://localhost:8080',
  enabled: true,
  stateMachine: stateMachine,
  child: RiveWidget(controller: controller),
)
```
