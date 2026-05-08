import 'dart:ui' as ui;

import 'package:rive/rive.dart' as rive;

final class RtNumber {
  const RtNumber(this.instance, this.name);

  final rive.ViewModelInstance instance;
  final String name;

  double? get value => instance.number(name)?.value;

  bool set(num value) {
    final property = instance.number(name);
    if (property == null) {
      return false;
    }
    property.value = value.toDouble();
    instance.requestAdvance();
    return true;
  }
}

final class RtBool {
  const RtBool(this.instance, this.name);

  final rive.ViewModelInstance instance;
  final String name;

  bool? get value => instance.boolean(name)?.value;

  bool set(bool value) {
    final property = instance.boolean(name);
    if (property == null) {
      return false;
    }
    property.value = value;
    instance.requestAdvance();
    return true;
  }
}

final class RtString {
  const RtString(this.instance, this.name);

  final rive.ViewModelInstance instance;
  final String name;

  String? get value => instance.string(name)?.value;

  bool set(String value) {
    final property = instance.string(name);
    if (property == null) {
      return false;
    }
    property.value = value;
    instance.requestAdvance();
    return true;
  }
}

final class RtColor {
  const RtColor(this.instance, this.name);

  final rive.ViewModelInstance instance;
  final String name;

  ui.Color? get value => instance.color(name)?.value;

  bool set(ui.Color value) {
    final property = instance.color(name);
    if (property == null) {
      return false;
    }
    property.value = value;
    instance.requestAdvance();
    return true;
  }
}

final class RtEnum {
  const RtEnum(this.instance, this.name);

  final rive.ViewModelInstance instance;
  final String name;

  String? get value => instance.enumerator(name)?.value;

  bool set(String value) {
    final property = instance.enumerator(name);
    if (property == null) {
      return false;
    }
    property.value = value;
    instance.requestAdvance();
    return true;
  }
}

final class RtTrigger {
  const RtTrigger(this.instance, this.name);

  final rive.ViewModelInstance instance;
  final String name;

  bool fire() {
    final property = instance.trigger(name);
    if (property == null) {
      return false;
    }
    property.trigger();
    instance.requestAdvance();
    return true;
  }
}

final class RtUnsupported {
  const RtUnsupported(this.instance, this.name);

  final rive.ViewModelInstance instance;
  final String name;
}
