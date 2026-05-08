// GENERATED CODE - DO NOT MODIFY BY HAND.
// Generated from demo_3.riv.
// Inspection status: partialUsable.

import 'package:rive/rive.dart' as rive;
import 'package:rive_telemetry/rive_telemetry.dart';

final class Demo3Rive {
  const Demo3Rive(this.instance);

  final rive.ViewModelInstance instance;

  static const viewModelName = 'ViewModel1';
  static const instanceName = 'Instance';

  RtNumber get confettiCount => RtNumber(instance, 'confettiCount');
  RtNumber get confettiSize => RtNumber(instance, 'confettiSize');
  RtColor get confettiColor => RtColor(instance, 'confettiColor');
  RtTrigger get confetti => RtTrigger(instance, 'confetti');
  RtTrigger get spin => RtTrigger(instance, 'spin');
  RtTrigger get pointAtUser => RtTrigger(instance, 'pointAtUser');
  RtTrigger get puffCheeks => RtTrigger(instance, 'puffCheeks');
  RtTrigger get mock => RtTrigger(instance, 'mock');
  RtNumber get stance => RtNumber(instance, 'stance');
  RtColor get colorGradientDark => RtColor(instance, 'colorGradientDark');
  RtColor get colorPrimary => RtColor(instance, 'colorPrimary');
  RtColor get colorShadowDark => RtColor(instance, 'colorShadowDark');
  RtColor get colorShadowLight => RtColor(instance, 'colorShadowLight');
  RtTrigger get eyeRoll => RtTrigger(instance, 'eyeRoll');
  RtTrigger get nod => RtTrigger(instance, 'nod');
  RtTrigger get headShake => RtTrigger(instance, 'headShake');
  RtTrigger get waveHand => RtTrigger(instance, 'waveHand');
  RtNumber get talkLevel => RtNumber(instance, 'talkLevel');
  RtNumber get mood => RtNumber(instance, 'mood');
  RtColor get faceColor => RtColor(instance, 'faceColor');

  static const artboards = Demo3RiveArtboards();
  static const stateMachines = Demo3RiveStateMachines();
  static const animations = Demo3RiveAnimations();
  static const viewModels = Demo3RiveViewModels();
}

final class Demo3RiveArtboards {
  const Demo3RiveArtboards();
  final mainArtboard = 'MainArtboard';
  final faceTransitions = 'Face-transitions';
  final faceMood = 'Face-mood';
  final faceReactns = 'Face-reactns';
}

final class Demo3RiveStateMachines {
  const Demo3RiveStateMachines();
  final mainArtboardMainStateMachine = 'MainStateMachine';
  final faceTransitionsFaceTransitionSm = 'Face transition SM';
  final faceMoodFaceMoodSm = 'Face Mood SM';
  final faceReactnsFaceReactionSm = 'Face Reaction SM';
}

final class Demo3RiveAnimations {
  const Demo3RiveAnimations();
  final mainArtboardConfetti = 'confetti';
  final mainArtboardSpin = 'spin';
  final mainArtboardPointAtUser = 'pointAtUser';
  final mainArtboardPuffCheeks = 'puffCheeks';
  final mainArtboardEyeRoll = 'eyeRoll';
  final mainArtboardMock = 'mock';
  final mainArtboardCelebrate = 'celebrate';
  final mainArtboardHeadShake = 'headShake';
  final mainArtboardNod = 'nod';
  final mainArtboardNeutral = 'neutral';
  final mainArtboardListening = 'listening';
  final mainArtboardWaveHand = 'waveHand';
  final mainArtboardThinking = 'thinking';
  final mainArtboardDefaultPose = 'defaultPose';
  final faceTransitionsFlicker = 'flicker';
  final faceMoodEncouraging = 'encouraging';
  final faceMoodPlayful = 'playful';
  final faceMoodSurprise = 'surprise';
  final faceMoodEyeRoll = 'eyeRoll';
  final faceMoodThinking = 'thinking';
  final faceMoodHappy = 'happy';
  final faceMoodTalkLow = 'talkLow';
  final faceMoodNeutral = 'neutral';
  final faceMoodTalkActive = 'talkActive';
  final faceMoodTalkNeutral = 'talkNeutral';
  final faceReactnsThinking = 'thinking';
  final faceReactnsPuffyCheeks = 'puffyCheeks';
  final faceReactnsConfetti = 'confetti';
  final faceReactnsEyeRoll = 'eyeRoll';
  final faceReactnsListen = 'listen';
  final faceReactnsTalkLow = 'talkLow';
  final faceReactnsNeutral = 'neutral';
  final faceReactnsTalkActive = 'talkActive';
  final faceReactnsTalkNeutral = 'talkNeutral';
}

final class Demo3RiveViewModels {
  const Demo3RiveViewModels();
  final viewModel1 = 'ViewModel1';
}

