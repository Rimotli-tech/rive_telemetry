import 'package:rive_telemetry_core/rive_telemetry_core.dart';
import 'package:test/test.dart';

void main() {
  test('generates Flutter constants and ViewModel helpers for demo_3', () async {
    final metadata = await inspectRivFile('../demo/assets/demo_3.riv');
    final generated = const RiveFlutterIntegrationGenerator().generate(
      metadata,
      options: const RiveFlutterGeneratorOptions(classPrefix: 'CatRive'),
    );

    expect(
      generated.diagnostics.any(
        (diagnostic) =>
            diagnostic.severity == RiveCodegenDiagnosticSeverity.error,
      ),
      isFalse,
    );
    expect(generated.source, contains('abstract final class CatRiveArtboards'));
    expect(
      generated.source,
      contains("static const mainArtboard = 'MainArtboard';"),
    );
    expect(
      generated.source,
      contains(
        "static const mainArtboardMainStateMachine = 'MainStateMachine';",
      ),
    );
    expect(
      generated.source,
      contains("static const faceReactnsThinking = 'thinking';"),
    );
    expect(generated.source, contains('final class CatRiveViewModel1Binding'));
    expect(
      generated.source,
      contains("static const viewModelName = 'ViewModel1';"),
    );
    expect(
      generated.source,
      contains("static const instanceName = 'Instance';"),
    );
    expect(
      generated.source,
      contains(
        "RiveTriggerViewModelProperty get confetti => RiveTriggerViewModelProperty(instance, 'confetti');",
      ),
    );
    expect(
      generated.source,
      contains(
        "RiveNumberViewModelProperty get talkLevel => RiveNumberViewModelProperty(instance, 'talkLevel');",
      ),
    );
    expect(
      generated.source,
      contains(
        "RiveColorViewModelProperty get faceColor => RiveColorViewModelProperty(instance, 'faceColor');",
      ),
    );
  });

  test('marks unsupported ViewModel property helpers with diagnostics', () {
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

    final generated = const RiveFlutterIntegrationGenerator().generate(
      metadata,
      options: const RiveFlutterGeneratorOptions(classPrefix: 'Demo'),
    );

    expect(
      generated.source,
      contains(
        "RiveUnsupportedViewModelProperty get nested => RiveUnsupportedViewModelProperty(instance, 'nested');",
      ),
    );
    expect(
      generated.diagnostics.map((diagnostic) => diagnostic.code),
      contains('unsupportedFlutterViewModelProperty'),
    );
  });
}
