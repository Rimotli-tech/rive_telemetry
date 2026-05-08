// GENERATED CODE - DO NOT MODIFY BY HAND.
// Generated from demo-new-1.riv.
// Inspection status: complete.

import 'package:rive/rive.dart' as rive;
import 'package:rive_telemetry/rive_telemetry.dart';

final class DemoNew1Rive {
  const DemoNew1Rive(this.instance);

  final rive.ViewModelInstance instance;

  static const viewModelName = 'DemoVM1';
  static const instanceName = 'Instance';

  RtBool get booleanProperty => RtBool(instance, 'booleanProperty');
  RtNumber get numberProperty => RtNumber(instance, 'numberProperty');

  static const artboards = DemoNew1RiveArtboards();
  static const stateMachines = DemoNew1RiveStateMachines();
  static const animations = DemoNew1RiveAnimations();
  static const viewModels = DemoNew1RiveViewModels();
}

final class DemoNew1RiveArtboards {
  const DemoNew1RiveArtboards();
  final artboard1 = '';
  final artboard = 'Artboard';
}

final class DemoNew1RiveStateMachines {
  const DemoNew1RiveStateMachines();
  final artboardStateMachine1 = 'State Machine 1';
}

final class DemoNew1RiveAnimations {
  const DemoNew1RiveAnimations();
  final artboardTimeline1 = 'Timeline 1';
}

final class DemoNew1RiveViewModels {
  const DemoNew1RiveViewModels();
  final demoVm1 = 'DemoVM1';
}

