import 'package:rive_telemetry_core/rive_telemetry_core.dart';
import 'package:test/test.dart';

void main() {
  test('sanitizeRiveIdentifier creates safe lower-camel identifiers', () {
    expect(
      sanitizeRiveIdentifier('Face Mood SM', fallback: 'item'),
      'faceMoodSm',
    );
    expect(
      sanitizeRiveIdentifier('123 start', fallback: 'item'),
      'rive123Start',
    );
    expect(sanitizeRiveIdentifier('class', fallback: 'item'), 'classValue');
    expect(sanitizeRiveIdentifier('', fallback: 'item'), 'item');
  });

  test('planner resolves duplicate and unsafe names with diagnostics', () {
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
      artboards: [
        RiveArtboardMetadata(
          name: 'Main Artboard',
          defaultStateMachineId: null,
          viewModelId: null,
          animations: const [
            RiveAnimationMetadata(
              name: 'idle-state',
              fps: null,
              durationFrames: null,
              durationSeconds: null,
              speed: null,
              loop: null,
            ),
            RiveAnimationMetadata(
              name: 'idle state',
              fps: null,
              durationFrames: null,
              durationSeconds: null,
              speed: null,
              loop: null,
            ),
          ],
          stateMachines: [
            RiveStateMachineMetadata(
              name: 'class',
              inputs: const [
                RiveInputMetadata(
                  name: '1 Active?',
                  type: RiveInputType.boolean,
                ),
              ],
            ),
          ],
          hierarchy: const [],
        ),
      ],
      viewModels: const [
        RiveViewModelMetadata(
          id: 0,
          name: 'Demo VM',
          typeKey: 435,
          defaultInstanceId: null,
          properties: [
            RiveViewModelPropertyMetadata(
              id: 0,
              name: 'mood color',
              type: RiveViewModelPropertyType.color,
              typeKey: 440,
            ),
            RiveViewModelPropertyMetadata(
              id: 1,
              name: 'mood-color',
              type: RiveViewModelPropertyType.color,
              typeKey: 440,
            ),
          ],
          instances: [
            RiveViewModelInstanceMetadata(
              id: 0,
              name: '',
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

    final plan = const RiveCodegenPlanner().build(metadata);
    final identifiers = {
      for (final symbol in plan.symbols) symbol.path: symbol.identifier,
    };

    expect(identifiers['artboards[0]'], 'mainArtboard');
    expect(identifiers['artboards[0].animations[0]'], 'idleState');
    expect(identifiers['artboards[0].animations[1]'], 'idleState2');
    expect(identifiers['artboards[0].stateMachines[0]'], 'classValue');
    expect(
      identifiers['artboards[0].stateMachines[0].inputs[0]'],
      'rive1Active',
    );
    expect(identifiers['viewModels[0]'], 'demoVm');
    expect(identifiers['viewModels[0].properties[0]'], 'moodColor');
    expect(identifiers['viewModels[0].properties[1]'], 'moodColor2');
    expect(identifiers['viewModels[0].instances[0]'], 'instance1');

    expect(
      plan.diagnostics.map((diagnostic) => diagnostic.code),
      containsAll(['sanitizedName', 'duplicateName', 'generatedFallbackName']),
    );
    expect(plan.hasErrors, isFalse);
  });

  test('demo_3 codegen symbol snapshot is deterministic', () async {
    final metadata = await inspectRivFile('../demo/assets/demo_3.riv');
    final plan = const RiveCodegenPlanner().build(metadata);
    final snapshot = plan.symbols
        .where(
          (symbol) =>
              symbol.kind == RiveCodegenSymbolKind.artboard ||
              symbol.kind == RiveCodegenSymbolKind.stateMachine ||
              symbol.kind == RiveCodegenSymbolKind.viewModel ||
              symbol.kind == RiveCodegenSymbolKind.viewModelProperty,
        )
        .map(
          (symbol) =>
              '${symbol.kind.name}:${symbol.path}:${symbol.sourceName}->${symbol.identifier}',
        )
        .join('\n');

    expect(snapshot, _demo3SymbolSnapshot);
    expect(plan.hasErrors, isFalse);
  });
}

const _demo3SymbolSnapshot = '''
artboard:artboards[0]:MainArtboard->mainArtboard
stateMachine:artboards[0].stateMachines[0]:MainStateMachine->mainStateMachine
artboard:artboards[1]:Face-transitions->faceTransitions
stateMachine:artboards[1].stateMachines[0]:Face transition SM->faceTransitionSm
artboard:artboards[2]:Face-mood->faceMood
stateMachine:artboards[2].stateMachines[0]:Face Mood SM->faceMoodSm
artboard:artboards[3]:Face-reactns->faceReactns
stateMachine:artboards[3].stateMachines[0]:Face Reaction SM->faceReactionSm
viewModel:viewModels[0]:ViewModel1->viewModel1
viewModelProperty:viewModels[0].properties[0]:confettiCount->confettiCount
viewModelProperty:viewModels[0].properties[1]:confettiSize->confettiSize
viewModelProperty:viewModels[0].properties[2]:confettiColor->confettiColor
viewModelProperty:viewModels[0].properties[3]:confetti->confetti
viewModelProperty:viewModels[0].properties[4]:spin->spin
viewModelProperty:viewModels[0].properties[5]:pointAtUser->pointAtUser
viewModelProperty:viewModels[0].properties[6]:puffCheeks->puffCheeks
viewModelProperty:viewModels[0].properties[7]:mock->mock
viewModelProperty:viewModels[0].properties[8]:stance->stance
viewModelProperty:viewModels[0].properties[9]:colorGradientDark->colorGradientDark
viewModelProperty:viewModels[0].properties[10]:colorPrimary->colorPrimary
viewModelProperty:viewModels[0].properties[11]:colorShadowDark->colorShadowDark
viewModelProperty:viewModels[0].properties[12]:colorShadowLight->colorShadowLight
viewModelProperty:viewModels[0].properties[13]:eyeRoll->eyeRoll
viewModelProperty:viewModels[0].properties[14]:nod->nod
viewModelProperty:viewModels[0].properties[15]:headShake->headShake
viewModelProperty:viewModels[0].properties[16]:waveHand->waveHand
viewModelProperty:viewModels[0].properties[17]:talkLevel->talkLevel
viewModelProperty:viewModels[0].properties[18]:mood->mood
viewModelProperty:viewModels[0].properties[19]:faceColor->faceColor''';
