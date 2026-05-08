import 'package:rive_telemetry_core/rive_telemetry_core.dart';
import 'package:test/test.dart';

void main() {
  test(
    'flags duplicate names, unnamed objects, and unsupported properties',
    () {
      final result = const RiveMetadataValidator().validate(_riskyMetadata());
      final codes = result.issues.map((issue) => issue.code).toList();

      expect(result.hasIntegrationRisk, isTrue);
      expect(codes, contains('duplicateArtboardName'));
      expect(codes, contains('unnamedStateMachine'));
      expect(codes, contains('duplicateInputName'));
      expect(codes, contains('unnamedViewModelProperty'));
      expect(codes, contains('unsupportedViewModelPropertyType'));
    },
  );

  test('accepts clean integration-facing metadata', () {
    final result = const RiveMetadataValidator().validate(_cleanMetadata());

    expect(result.hasIssues, isFalse);
    expect(result.hasIntegrationRisk, isFalse);
  });
}

RiveMetadata _cleanMetadata() => RiveMetadata(
  schemaVersion: riveMetadataSchemaVersion,
  source: 'clean.riv',
  status: RiveInspectionStatus.complete,
  completeness: _complete,
  codegen: _codegen,
  header: _header,
  artboards: [
    RiveArtboardMetadata(
      name: 'Main',
      defaultStateMachineId: null,
      viewModelId: null,
      animations: const [
        RiveAnimationMetadata(
          name: 'idle',
          fps: null,
          durationFrames: null,
          durationSeconds: null,
          speed: null,
          loop: null,
        ),
      ],
      stateMachines: [
        RiveStateMachineMetadata(
          name: 'State',
          inputs: const [
            RiveInputMetadata(name: 'active', type: RiveInputType.boolean),
          ],
        ),
      ],
      hierarchy: const [],
    ),
  ],
  viewModels: const [
    RiveViewModelMetadata(
      id: 0,
      name: 'ViewModel',
      typeKey: 435,
      defaultInstanceId: null,
      properties: [
        RiveViewModelPropertyMetadata(
          id: 0,
          name: 'progress',
          type: RiveViewModelPropertyType.number,
          typeKey: 431,
        ),
      ],
      instances: [
        RiveViewModelInstanceMetadata(
          id: 0,
          name: 'Default',
          viewModelId: 0,
          values: [],
        ),
      ],
    ),
  ],
  recordCount: 0,
  unknownRecordCount: 0,
  warnings: const [],
);

RiveMetadata _riskyMetadata() => RiveMetadata(
  schemaVersion: riveMetadataSchemaVersion,
  source: 'risky.riv',
  status: RiveInspectionStatus.complete,
  completeness: _complete,
  codegen: _codegen,
  header: _header,
  artboards: [
    RiveArtboardMetadata(
      name: 'Main',
      defaultStateMachineId: null,
      viewModelId: null,
      animations: const [
        RiveAnimationMetadata(
          name: 'idle',
          fps: null,
          durationFrames: null,
          durationSeconds: null,
          speed: null,
          loop: null,
        ),
        RiveAnimationMetadata(
          name: 'idle',
          fps: null,
          durationFrames: null,
          durationSeconds: null,
          speed: null,
          loop: null,
        ),
      ],
      stateMachines: [
        RiveStateMachineMetadata(
          name: '',
          inputs: const [
            RiveInputMetadata(name: 'active', type: RiveInputType.boolean),
            RiveInputMetadata(name: 'active', type: RiveInputType.number),
          ],
        ),
      ],
      hierarchy: const [],
    ),
    RiveArtboardMetadata(
      name: 'Main',
      defaultStateMachineId: null,
      viewModelId: null,
      animations: const [],
      stateMachines: const [],
      hierarchy: const [],
    ),
  ],
  viewModels: const [
    RiveViewModelMetadata(
      id: 0,
      name: 'ViewModel',
      typeKey: 435,
      defaultInstanceId: null,
      properties: [
        RiveViewModelPropertyMetadata(
          id: 0,
          name: '',
          type: RiveViewModelPropertyType.number,
          typeKey: 431,
        ),
        RiveViewModelPropertyMetadata(
          id: 1,
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

const _complete = RiveMetadataCompleteness(
  artboardsComplete: true,
  stateMachinesComplete: true,
  inputsComplete: true,
  viewModelsComplete: true,
  viewModelInstancesComplete: true,
  animationsComplete: true,
);

const _codegen = RiveCodegenEligibility(
  canGenerateFlutter: true,
  canGenerateTypeScript: true,
  blockedReasons: [],
  warnings: [],
);

const _header = RiveHeaderMetadata(
  majorVersion: 7,
  minorVersion: 0,
  fileId: 1,
  propertyKeyCount: 0,
);
