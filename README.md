# RiveTelemetry

RiveTelemetry is evolving into schema-first Rive integration tooling:

```text
.riv -> schema -> VS Code inspector -> Flutter/JS integration code
```

Runtime telemetry remains part of the roadmap, but the product now starts with
loading a `.riv` file, inspecting its structure, and generating safer
integration code before an app is running.

## Quick Start

### VS Code extension

Install the packaged extension from the release artifact, or build one locally
from `extension/`:

```sh
code --install-extension rive-telemetry-0.3.1.vsix
```

Then run this command from the VS Code command palette:

```text
RiveTelemetry: Open Panel
```

The extension listens for runtime clients on:

```text
ws://localhost:8080
```

The port is configurable with the VS Code setting `riveTelemetry.port`.

### Flutter

Add the Flutter bridge package:

```yaml
dependencies:
  rive_telemetry: ^0.3.1
```

Wrap your rendered Rive widget and pass the loaded state machine:

```dart
RiveDebugger(
  stateMachine: stateMachine,
  stateMachineName: 'State Machine 1',
  child: RiveWidget(controller: controller),
)
```

Telemetry is disabled in Flutter release builds by default unless `enabled` is
set to `true`.

### JavaScript

Add the JavaScript bridge package:

```sh
npm install @rimotli-tech/rive-telemetry
```

Start telemetry after your Rive runtime is available:

```ts
import { RiveTelemetry } from '@rimotli-tech/rive-telemetry';

const telemetry = new RiveTelemetry({
  rive,
  runtimeId: 'hero-animation',
  label: 'Hero Animation',
  stateMachineName: 'State Machine 1',
});

telemetry.start();
```

## Workspace

- `core/` contains the pure-Dart `.riv` inspector and metadata JSON contract.
- `extension/` contains the VS Code extension.
- `package/` contains the Flutter bridge/debugger wrapper.
- `js/` contains the JavaScript/TypeScript runtime bridge and browser demo.
- `demo/` contains the Flutter web demo app.

## Rebuild Direction

The current rebuild spine is:

```text
Load .riv
-> inspect structure
-> show schema in VS Code
-> generate Flutter/JS integration code
-> optionally merge runtime telemetry later
```

## Protocol

Runtime clients send JSON telemetry payloads to the extension over WebSocket.
Current clients send `protocolVersion: 1`; the extension also accepts older
payloads without that field for compatibility.

## Release Checks

Run these before publishing:

```sh
cd extension
npm run check
npm run compile
npx --yes @vscode/vsce package
```

```sh
cd package
flutter analyze
flutter test
dart pub publish --dry-run
```

```sh
cd js
npm run check
npm test
npm run app:build
npm pack --dry-run
```
