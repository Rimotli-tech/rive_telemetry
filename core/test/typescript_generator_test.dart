import 'package:rive_telemetry_core/rive_telemetry_core.dart';
import 'package:test/test.dart';

void main() {
  test(
    'generates TypeScript constants, ViewModel helpers, and React starter',
    () async {
      final metadata = await inspectRivFile('../demo/assets/demo_3.riv');
      final generated = const RiveTypeScriptIntegrationGenerator().generate(
        metadata,
        options: const RiveTypeScriptGeneratorOptions(symbolPrefix: 'catRive'),
      );

      expect(
        generated.diagnostics.any(
          (diagnostic) =>
              diagnostic.severity == RiveCodegenDiagnosticSeverity.error,
        ),
        isFalse,
      );
      expect(generated.source, contains('export const catRiveArtboards = {'));
      expect(generated.source, contains("mainArtboard: 'MainArtboard',"));
      expect(
        generated.source,
        contains("mainArtboardMainStateMachine: 'MainStateMachine',"),
      );
      expect(generated.source, contains("faceReactnsThinking: 'thinking',"));
      expect(
        generated.source,
        contains(
          'export function createViewModel1(instance: RiveViewModelRuntime)',
        ),
      );
      expect(generated.source, contains("viewModelName: 'ViewModel1',"));
      expect(generated.source, contains("instance: 'Instance',"));
      expect(
        generated.source,
        contains("confetti: triggerProperty(instance, 'confetti'),"),
      );
      expect(
        generated.source,
        contains(
          "talkLevel: valueProperty<number>(instance, 'talkLevel', 'number'),",
        ),
      );
      expect(
        generated.source,
        contains(
          "faceColor: valueProperty<RiveColorValue>(instance, 'faceColor', 'color'),",
        ),
      );
      expect(
        generated.source,
        contains("import { useRive } from '@rive-app/react-canvas';"),
      );
    },
  );

  test('marks unsupported TypeScript ViewModel helpers with diagnostics', () {
    final metadata = RiveMetadata(
      schemaVersion: riveMetadataSchemaVersion,
      source: 'memory.riv',
      status: RiveInspectionStatus.complete,
      completeness: const RiveMetadataCompleteness(
        artboardsComplete: true,
        stateMachinesComplete: true,
        inputsComplete: true,
        viewModelsComplete: true,
        viewModelInstancesComplete: true,
        animationsComplete: true,
      ),
      codegen: const RiveCodegenEligibility(
        canGenerateFlutter: true,
        canGenerateTypeScript: true,
        blockedReasons: [],
        warnings: [],
      ),
      header: const RiveHeaderMetadata(
        majorVersion: 7,
        minorVersion: 0,
        fileId: 1,
        propertyKeyCount: 0,
      ),
      artboards: const [],
      viewModels: const [
        RiveViewModelMetadata(
          id: 0,
          name: 'VM',
          typeKey: 435,
          defaultInstanceId: null,
          properties: [
            RiveViewModelPropertyMetadata(
              id: 0,
              name: 'nested',
              type: RiveViewModelPropertyType.viewModel,
              typeKey: 438,
            ),
          ],
          instances: [],
        ),
      ],
      recordCount: 0,
      unknownRecordCount: 0,
      warnings: const [],
    );

    final generated = const RiveTypeScriptIntegrationGenerator().generate(
      metadata,
      options: const RiveTypeScriptGeneratorOptions(symbolPrefix: 'demo'),
    );

    expect(
      generated.source,
      contains("nested: unsupportedProperty('nested'),"),
    );
    expect(
      generated.diagnostics.map((diagnostic) => diagnostic.code),
      contains('unsupportedTypeScriptViewModelProperty'),
    );
  });
}
