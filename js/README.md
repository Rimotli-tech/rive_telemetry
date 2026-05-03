# @rimotli-tech/rive-telemetry

Debug Rive animations in JavaScript from VS Code.

This package connects a running Rive web runtime to the Rive Telemetry VS Code
extension. It streams state machine inputs and optional ViewModel properties,
then applies commands sent from the panel while your app is running.

## Install

```sh
npm install @rimotli-tech/rive-telemetry
```

Install the Rive Telemetry VS Code extension and run:

```text
RiveTelemetry: Open Panel
```

## Usage

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

You can also pass a state machine object directly when your integration exposes
one:

```ts
const telemetry = new RiveTelemetry({
  stateMachine,
  runtimeId: 'hero-animation',
  stateMachineName: 'State Machine 1',
});
```

To include ViewModel telemetry, pass the bound instance and ViewModel name. This
matches the Flutter bridge: the package does not auto-discover ViewModel
instances.

```ts
const telemetry = new RiveTelemetry({
  rive,
  stateMachineName: 'State Machine 1',
  viewModelName: 'CatViewModel',
  viewModelInstance: rive.viewModelInstance,
});
```

Call `dispose()` when the Rive runtime is no longer mounted:

```ts
telemetry.dispose();
```

## Local demo

Run the browser demo while the VS Code extension panel is open:

```sh
npm run app
```

The demo uses `@rive-app/canvas`, loads `demo.riv` and `demo_2.riv`, and
streams two runtimes so you can test active runtime selection in the VS Code
panel.

## Options

- `rive`: Rive web runtime object.
- `stateMachine`: state machine object, if available directly.
- `runtimeId`: stable runtime identifier. A generated id is used by default.
- `label`: human-readable runtime label.
- `stateMachineName`: state machine name. Defaults to `State Machine 1`.
- `viewModelName`: optional ViewModel name.
- `viewModelInstance`: optional bound ViewModel instance.
- `socketUrl`: defaults to `ws://localhost:8080`.
- `pollingIntervalMs`: defaults to `250`.
- `debug`: logs JSON payloads and ignored command reasons.

The package is framework-neutral and does not import a specific `@rive-app/*`
runtime. It uses public runtime-shaped APIs when present.

## Protocol

The client sends JSON telemetry payloads with `protocolVersion: 1` to the Rive
Telemetry VS Code extension. The extension accepts older payloads without the
field, but new runtime bridges should include it.
