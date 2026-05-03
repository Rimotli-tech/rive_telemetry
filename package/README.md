# rive_telemetry

`rive_telemetry` helps you debug Rive animations in Flutter from VS Code.

Use it to inspect and control state machine inputs and ViewModel properties
while your app is running. It wraps your existing Rive widget, streams telemetry
to the RiveTelemetry VS Code extension, and leaves rendering, layout, and
controller ownership with your app.

## Features

- Stream state machine input telemetry to VS Code.
- Control boolean, number, and trigger state machine inputs from the panel.
- Identify multiple Rive runtimes with `runtimeId` and `label`.
- Stream supported ViewModel properties.
- Mutate supported ViewModel properties at runtime.
- Capture in-memory snapshots and compare live state against them in the panel.
- Disable itself automatically in release builds by default.

## Production safety

Telemetry is disabled in release builds unless you explicitly opt in:

- `enabled: null` or omitted: enabled outside release mode only.
- `enabled: false`: always disabled.
- `enabled: true`: always enabled.

When disabled, `RiveDebugger` does not open a WebSocket, start polling timers,
serialize telemetry, print telemetry JSON, or send runtime data.

## Getting started

Install the Flutter package:

```yaml
dependencies:
  rive_telemetry: ^0.3.0
```

Install and run the RiveTelemetry VS Code extension, then open:

```text
RiveTelemetry: Open Panel
```

By default the package connects to:

```text
ws://localhost:8080
```

## Basic usage

Wrap the rendered Rive widget with `RiveDebugger` and pass the state machine
instance once it is loaded.

```dart
RiveDebugger(
  stateMachine: stateMachine,
  stateMachineName: 'State Machine 1',
  child: rive.RiveWidget(controller: controller),
)
```

For local demos or release-mode validation, explicitly enable telemetry:

```dart
RiveDebugger(
  enabled: true,
  source: 'my-flutter-app',
  runtimeId: 'mascot-main',
  label: 'Mascot Main',
  stateMachineName: 'State Machine 1',
  stateMachine: stateMachine,
  child: rive.RiveWidget(controller: controller),
)
```

## Multiple runtimes

Use stable runtime identity fields when an app screen contains more than one
Rive runtime:

```dart
RiveDebugger(
  runtimeId: 'settings-cat',
  label: 'Settings Cat',
  stateMachineName: 'State Machine 2',
  stateMachine: stateMachine,
  child: rive.RiveWidget(controller: controller),
)
```

Commands sent from VS Code include `runtimeId`, so each `RiveDebugger` instance
only applies commands intended for its own runtime.

## ViewModel telemetry

If your Rive file uses data binding, pass the loaded `ViewModelInstance` into
`RiveDebugger`.

```dart
rive.RiveWidgetBuilder(
  fileLoader: fileLoader,
  stateMachineSelector: rive.StateMachineSelector.byName('State Machine 2'),
  dataBind: rive.DataBind.byName('catVMInstance'),
  builder: (context, state) => switch (state) {
    rive.RiveLoaded() => RiveDebugger(
      enabled: true,
      source: 'example',
      runtimeId: 'example-cat',
      label: 'Cat Example',
      stateMachineName: 'State Machine 2',
      stateMachine: state.controller.stateMachine,
      viewModelName: 'CatViewModel',
      viewModelInstance: state.viewModelInstance,
      child: rive.RiveWidget(controller: state.controller),
    ),
    rive.RiveLoading() => const CircularProgressIndicator(),
    rive.RiveFailed(:final error) => Text(error.toString()),
  },
)
```

Supported ViewModel mutation types:

- `number`
- `boolean`
- `string`
- `color`
- `enum`
- `trigger`

Unsupported or unavailable ViewModel APIs fail gracefully and are reported as
unavailable in telemetry.

## Snapshots and diffs

The VS Code panel can capture an in-memory snapshot for the selected runtime and
compare live telemetry against it. Snapshot diffing currently covers:

- state machine inputs
- supported ViewModel properties

Snapshots are runtime-specific and ViewModel-instance-specific. They are not
persisted across extension reloads.

## Example

See `example/` for a minimal Flutter app using one `demo_2.riv` instance, one
state machine, and one ViewModel instance.

## Limitations

- This package is intended for development tooling, not production analytics.
- The VS Code extension must be running for live panel telemetry.
- Snapshot history and persistence are intentionally out of scope.
- ViewModel support is limited to public Rive Flutter runtime APIs.
