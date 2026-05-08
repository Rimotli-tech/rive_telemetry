import 'package:rive_telemetry_core/rive_telemetry_core.dart';
import 'package:test/test.dart';

void main() {
  test(
    'generates Flutter constants and ViewModel helpers for demo_3',
    () async {
      final metadata = await inspectRivFile('../demo/assets/demo_3.riv');
      final generated = const RiveFlutterIntegrationGenerator().generate(
        metadata,
        options: const RiveFlutterGeneratorOptions(className: 'Demo3Rive'),
      );

      expect(
        generated.diagnostics.any(
          (diagnostic) =>
              diagnostic.severity == RiveCodegenDiagnosticSeverity.error,
        ),
        isFalse,
      );
      expect(generated.source, contains('// Generated from demo_3.riv.'));
      expect(generated.source, contains('final class Demo3Rive {'));
      expect(generated.source, contains('const Demo3Rive(this.instance);'));
      expect(
        generated.source,
        contains("import 'package:rive_telemetry/rive_telemetry.dart';"),
      );
      expect(
        generated.source,
        isNot(contains('final class RiveNumberViewModelProperty')),
      );
      expect(generated.source, isNot(contains('Usage')));
      expect(generated.source, contains('final class Demo3RiveArtboards'));
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
      expect(
        generated.source,
        contains("static const viewModel1 = 'ViewModel1';"),
      );
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
        contains("RtTrigger get confetti => RtTrigger(instance, 'confetti');"),
      );
      expect(
        generated.source,
        contains("RtNumber get talkLevel => RtNumber(instance, 'talkLevel');"),
      );
      expect(
        generated.source,
        contains("RtColor get faceColor => RtColor(instance, 'faceColor');"),
      );
      expect(generated.source, contains('RiveTelemetryBinding telemetry({'));
      expect(generated.source, contains('viewModelInstance: instance,'));
    },
  );

  test('defaults generated root class name from the Rive filename', () async {
    final metadata = await inspectRivFile('../demo/assets/demo_3.riv');
    final generated = const RiveFlutterIntegrationGenerator().generate(
      metadata,
      options: const RiveFlutterGeneratorOptions(includeHeader: false),
    );

    expect(generated.source, startsWith("import 'package:rive/rive.dart'"));
    expect(generated.source, contains('final class Demo3Rive {'));
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
      options: const RiveFlutterGeneratorOptions(className: 'DemoRive'),
    );

    expect(
      generated.source,
      contains(
        "RtUnsupported get nested => RtUnsupported(instance, 'nested');",
      ),
    );
    expect(
      generated.diagnostics.map((diagnostic) => diagnostic.code),
      contains('unsupportedFlutterViewModelProperty'),
    );
  });
}
