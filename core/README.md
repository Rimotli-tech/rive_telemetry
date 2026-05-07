# rive_telemetry_core

Pure-Dart foundations for Rive integration tooling.

This package is schema-first: it inspects `.riv` files and converts their
structure into stable metadata that can power VS Code UI, CLI workflows, and
integration code generation.

Current capabilities:

- Load `.riv` files without running an app.
- Extract artboards, animations, state machines, and inputs from known fixtures.
- Preserve structured warnings for unsupported records.
- Export deterministic metadata JSON with `schemaVersion: 1`.

This is a metadata-focused inspector, not a complete Rive runtime parser.
Unknown or unsupported records are ignored safely when possible and reported as
warnings when traversal cannot continue with confidence.

## Usage

```dart
import 'package:rive_telemetry_core/rive_telemetry_core.dart';

final metadata = await inspectRivFile('animation.riv');
final json = metadataToJson(metadata);
```
