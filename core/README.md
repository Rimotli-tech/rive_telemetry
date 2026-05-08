# rive_telemetry_core

Pure-Dart foundations for Rive integration tooling.

This package is schema-first: it inspects `.riv` files and converts their
structure into stable metadata that can power VS Code UI, CLI workflows, and
integration code generation.

Current capabilities:

- Load `.riv` files without running an app.
- Extract artboards, animations, state machines, inputs, and ViewModels from
  supported schema records.
- Preserve structured warnings for unsupported records.
- Export deterministic metadata JSON with `schemaVersion: 1`.
- Decode metadata JSON back into typed Dart models.
- Build language-neutral codegen plans with safe identifiers and diagnostics.

This is a metadata-focused inspector, not a complete Rive runtime parser.
Unknown or unsupported records are ignored safely when possible and reported as
warnings when traversal cannot continue with confidence.

## Metadata JSON

The stable JSON contract lives at:

```text
schema/rive_metadata.schema.json
```

The current schema version is `1`. Consumers should reject unsupported schema
versions instead of guessing.

The contract is the shared boundary for the CLI, VS Code extension, and future
generators. Root fields are stable and intentionally explicit:

- `schemaVersion`: metadata contract version. Currently `1`.
- `source`: inspected `.riv` source path or label.
- `status`: `complete`, `partialUsable`, `partialWithIntegrationRisk`, or
  `failed`.
- `completeness`: per-section extraction flags.
- `codegen`: whether Flutter/TypeScript generators may safely run.
- `header`: parsed Rive file header metadata.
- `artboards`: artboards with animations, state machines, inputs, and hierarchy.
- `viewModels`: ViewModels, properties, instances, and instance values.
- `recordCount` / `unknownRecordCount`: traversal diagnostics.
- `warnings`: structured parser or integration warnings with severity.

The exported media type constant is:

```text
application/vnd.rive-telemetry.metadata+json; schemaVersion=1
```

## Usage

```dart
import 'package:rive_telemetry_core/rive_telemetry_core.dart';

final metadata = await inspectRivFile('animation.riv');
final json = metadataToJson(metadata);
final decoded = metadataFromJson(json);
```

Command-line inspection:

```bash
dart run bin/rive_telemetry.dart inspect path/to/file.riv
```

Stable JSON output:

```bash
dart run bin/rive_telemetry.dart inspect --json path/to/file.riv
dart run bin/rive_telemetry.dart export --out metadata.json path/to/file.riv
```

Parser diagnostics:

```bash
dart run bin/rive_telemetry.dart debug path/to/file.riv
```

## Codegen foundation

Generators should start from `RiveCodegenPlanner`, not raw names. The planner
creates deterministic symbols for artboards, animations, state machines, inputs,
ViewModels, ViewModel properties, and ViewModel instances.

It handles:

- identifier sanitization
- reserved word avoidance
- duplicate names within a scope
- fallback names for unnamed metadata
- diagnostics that generators can surface before writing files

```dart
final metadata = await inspectRivFile('animation.riv');
final plan = const RiveCodegenPlanner().build(metadata);

for (final symbol in plan.symbolsFor(RiveCodegenSymbolKind.viewModelProperty)) {
  print('${symbol.sourceName} -> ${symbol.identifier}');
}
```
