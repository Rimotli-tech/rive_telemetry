# RiveTelemetry

Inspect and control Rive runtime behavior from VS Code.

RiveTelemetry connects any Rive runtime (e.g. Flutter apps) to a local VS Code panel over WebSocket for real-time inspection and control.

## Features

- Inspect live Rive State Machine inputs
- Control boolean, number, and trigger inputs from VS Code
- Inspect ViewModel telemetry
- Mutate supported ViewModel properties
- Capture runtime snapshots
- Compare snapshot diffs
- Support multiple Rive runtimes with `runtimeId` and `label`
- Clear telemetry automatically when the app disconnects

## Usage

### Flutter

```yaml
dependencies:
  rive_telemetry: ^0.2.0

###
npm install rive-telemetry