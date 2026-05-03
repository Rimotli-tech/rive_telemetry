# RiveTelemetry

Inspect and control Rive runtime behavior from VS Code.

RiveTelemetry connects any Rive runtime (e.g. Flutter apps) to a local VS Code panel over WebSocket for real-time inspection and control.

## Features

- Inspect live Rive State Machine inputs
- Control boolean, number, and trigger inputs from VS Code
- Inspect ViewModel telemetry
- Mutate supported ViewModel properties
- Support multiple Rive runtimes with `runtimeId` and `label`
- Preserve last-known telemetry when the app disconnects
- Clear retained telemetry manually from the panel

## Usage

### Install the extension

Install the packaged extension from this directory:

```sh
code --install-extension rive-telemetry-0.3.0.vsix
```

Then open the command palette and run:

```text
RiveTelemetry: Open Panel
```

The extension starts a local WebSocket server at:

```text
ws://localhost:8080
```

### Flutter

Add the Flutter bridge package to your app:

```yaml
dependencies:
  rive_telemetry: ^0.3.0
```

Wrap your rendered Rive widget and pass the loaded state machine:

```dart
RiveDebugger(
  stateMachine: stateMachine,
  stateMachineName: 'State Machine 1',
  child: rive.RiveWidget(controller: controller),
)
```

For local validation, you can opt in explicitly and provide stable runtime
identity fields:

```dart
RiveDebugger(
  enabled: true,
  source: 'my-flutter-app',
  runtimeId: 'main-rive',
  label: 'Main Rive',
  stateMachineName: 'State Machine 1',
  stateMachine: stateMachine,
  child: rive.RiveWidget(controller: controller),
)
```

Telemetry is disabled in Flutter release builds by default unless `enabled` is
set to `true`.

## ViewModel telemetry

If your Rive file uses data binding, pass the loaded `ViewModelInstance` and
ViewModel name to inspect and mutate supported properties from the panel.

```dart
RiveDebugger(
  enabled: true,
  stateMachineName: 'State Machine 1',
  stateMachine: stateMachine,
  viewModelName: 'CatViewModel',
  viewModelInstance: viewModelInstance,
  child: rive.RiveWidget(controller: controller),
)
```

Supported mutable ViewModel property types are `number`, `boolean`, `string`,
`color`, `enum`, and `trigger`.

## Development

Install dependencies and compile the extension:

```sh
npm install
npm run compile
```

Run a type check without emitting files:

```sh
npm run check
```
