import 'codegen.dart';
import 'metadata.dart';

class RiveFlutterGeneratorOptions {
  const RiveFlutterGeneratorOptions({
    this.className,
    this.includeHeader = true,
  });

  final String? className;
  final bool includeHeader;
}

class RiveFlutterGeneratedFile {
  const RiveFlutterGeneratedFile({
    required this.source,
    required this.diagnostics,
  });

  final String source;
  final List<RiveCodegenDiagnostic> diagnostics;
}

class RiveFlutterIntegrationGenerator {
  const RiveFlutterIntegrationGenerator({
    this.planner = const RiveCodegenPlanner(),
  });

  final RiveCodegenPlanner planner;

  RiveFlutterGeneratedFile generate(
    RiveMetadata metadata, {
    RiveFlutterGeneratorOptions options = const RiveFlutterGeneratorOptions(),
  }) {
    final plan = planner.build(metadata);
    final diagnostics = [...plan.diagnostics];
    if (!metadata.codegen.canGenerateFlutter) {
      diagnostics.addAll(
        metadata.codegen.blockedReasons.map(
          (reason) => RiveCodegenDiagnostic(
            severity: RiveCodegenDiagnosticSeverity.error,
            code: 'flutterCodegenBlocked',
            message: reason,
            path: 'codegen.flutter',
          ),
        ),
      );
    }

    final rootClassName =
        options.className ?? _defaultRootClassName(metadata.source);
    final buffer = StringBuffer();
    if (options.includeHeader) {
      buffer
        ..writeln('// GENERATED CODE - DO NOT MODIFY BY HAND.')
        ..writeln('// Generated from ${_sourceFileName(metadata.source)}.')
        ..writeln('// Inspection status: ${metadata.status.name}.')
        ..writeln();
    }
    buffer
      ..writeln("import 'package:rive/rive.dart' as rive;")
      ..writeln("import 'package:rive_telemetry/rive_telemetry.dart';")
      ..writeln();

    _writeRootBinding(buffer, rootClassName, metadata, plan, diagnostics);
    _writeConstants(buffer, rootClassName, metadata, plan);
    _writeNestedViewModelBindings(
      buffer,
      rootClassName,
      metadata,
      plan,
      diagnostics,
    );

    return RiveFlutterGeneratedFile(
      source: buffer.toString(),
      diagnostics: List.unmodifiable(diagnostics),
    );
  }

  void _writeRootBinding(
    StringBuffer buffer,
    String rootClassName,
    RiveMetadata metadata,
    RiveCodegenPlan plan,
    List<RiveCodegenDiagnostic> diagnostics,
  ) {
    final viewModels = metadata.viewModels;
    buffer.writeln('final class $rootClassName {');
    if (viewModels.length == 1) {
      buffer
        ..writeln('  const $rootClassName(this.instance);')
        ..writeln()
        ..writeln('  final rive.ViewModelInstance instance;')
        ..writeln();
      _writeViewModelStatics(buffer, viewModels.single, '  ');
      buffer.writeln();
      _writeViewModelProperties(
        buffer,
        viewModels.single,
        'viewModels[0]',
        'instance',
        plan,
        diagnostics,
        '  ',
      );
      buffer
        ..writeln()
        ..writeln('  RiveTelemetryBinding telemetry({')
        ..writeln('    String? artboardName,')
        ..writeln('    String? stateMachineName,')
        ..writeln('    rive.StateMachine? stateMachine,')
        ..writeln('  }) => RiveTelemetryBinding(')
        ..writeln('    artboardName: artboardName,')
        ..writeln('    stateMachineName: stateMachineName,')
        ..writeln('    stateMachine: stateMachine,')
        ..writeln('    viewModelName: viewModelName,')
        ..writeln('    viewModelInstance: instance,')
        ..writeln('  );');
    } else if (viewModels.length > 1) {
      buffer.writeln('  const $rootClassName({');
      for (var index = 0; index < viewModels.length; index++) {
        final symbol = plan.symbolFor(
          kind: RiveCodegenSymbolKind.viewModel,
          path: 'viewModels[$index]',
        );
        buffer.writeln(
          '    required this.${symbol?.identifier ?? 'viewModel${index + 1}'}Instance,',
        );
      }
      buffer
        ..writeln('  });')
        ..writeln();
      for (var index = 0; index < viewModels.length; index++) {
        final symbol = plan.symbolFor(
          kind: RiveCodegenSymbolKind.viewModel,
          path: 'viewModels[$index]',
        );
        buffer.writeln(
          '  final rive.ViewModelInstance ${symbol?.identifier ?? 'viewModel${index + 1}'}Instance;',
        );
      }
      buffer.writeln();
      for (var index = 0; index < viewModels.length; index++) {
        final symbol = plan.symbolFor(
          kind: RiveCodegenSymbolKind.viewModel,
          path: 'viewModels[$index]',
        );
        final identifier = symbol?.identifier ?? 'viewModel${index + 1}';
        buffer.writeln(
          '  ${_nestedViewModelClassName(rootClassName, identifier)} get $identifier => '
          '${_nestedViewModelClassName(rootClassName, identifier)}(${identifier}Instance);',
        );
      }
    } else {
      buffer.writeln('  const $rootClassName();');
    }

    buffer
      ..writeln()
      ..writeln('  static const artboards = ${rootClassName}Artboards();')
      ..writeln(
        '  static const stateMachines = ${rootClassName}StateMachines();',
      )
      ..writeln('  static const animations = ${rootClassName}Animations();')
      ..writeln('  static const viewModels = ${rootClassName}ViewModels();')
      ..writeln('}')
      ..writeln();
  }

  void _writeConstants(
    StringBuffer buffer,
    String rootClassName,
    RiveMetadata metadata,
    RiveCodegenPlan plan,
  ) {
    _writeArtboards(buffer, rootClassName, metadata, plan);
    _writeStateMachines(buffer, rootClassName, metadata, plan);
    _writeAnimations(buffer, rootClassName, metadata, plan);
    _writeViewModelConstants(buffer, rootClassName, metadata, plan);
  }

  void _writeArtboards(
    StringBuffer buffer,
    String rootClassName,
    RiveMetadata metadata,
    RiveCodegenPlan plan,
  ) {
    buffer
      ..writeln('final class ${rootClassName}Artboards {')
      ..writeln('  const ${rootClassName}Artboards();');
    for (var index = 0; index < metadata.artboards.length; index++) {
      final symbol = plan.symbolFor(
        kind: RiveCodegenSymbolKind.artboard,
        path: 'artboards[$index]',
      );
      buffer.writeln(
        '  static const ${symbol?.identifier ?? 'artboard${index + 1}'} = '
        '${_dartString(metadata.artboards[index].name ?? '')};',
      );
    }
    buffer
      ..writeln('}')
      ..writeln();
  }

  void _writeStateMachines(
    StringBuffer buffer,
    String rootClassName,
    RiveMetadata metadata,
    RiveCodegenPlan plan,
  ) {
    buffer
      ..writeln('final class ${rootClassName}StateMachines {')
      ..writeln('  const ${rootClassName}StateMachines();');
    for (
      var artboardIndex = 0;
      artboardIndex < metadata.artboards.length;
      artboardIndex++
    ) {
      final artboardPath = 'artboards[$artboardIndex]';
      final artboardSymbol = plan.symbolFor(
        kind: RiveCodegenSymbolKind.artboard,
        path: artboardPath,
      );
      final artboard = metadata.artboards[artboardIndex];
      for (
        var stateMachineIndex = 0;
        stateMachineIndex < artboard.stateMachines.length;
        stateMachineIndex++
      ) {
        final stateMachineSymbol = plan.symbolFor(
          kind: RiveCodegenSymbolKind.stateMachine,
          path: '$artboardPath.stateMachines[$stateMachineIndex]',
        );
        final identifier = _joinIdentifiers(
          artboardSymbol?.identifier ?? 'artboard${artboardIndex + 1}',
          stateMachineSymbol?.identifier ??
              'stateMachine${stateMachineIndex + 1}',
        );
        buffer.writeln(
          '  static const $identifier = '
          '${_dartString(artboard.stateMachines[stateMachineIndex].name ?? '')};',
        );
      }
    }
    buffer
      ..writeln('}')
      ..writeln();
  }

  void _writeAnimations(
    StringBuffer buffer,
    String rootClassName,
    RiveMetadata metadata,
    RiveCodegenPlan plan,
  ) {
    buffer
      ..writeln('final class ${rootClassName}Animations {')
      ..writeln('  const ${rootClassName}Animations();');
    for (
      var artboardIndex = 0;
      artboardIndex < metadata.artboards.length;
      artboardIndex++
    ) {
      final artboardPath = 'artboards[$artboardIndex]';
      final artboardSymbol = plan.symbolFor(
        kind: RiveCodegenSymbolKind.artboard,
        path: artboardPath,
      );
      final artboard = metadata.artboards[artboardIndex];
      for (
        var animationIndex = 0;
        animationIndex < artboard.animations.length;
        animationIndex++
      ) {
        final animationSymbol = plan.symbolFor(
          kind: RiveCodegenSymbolKind.animation,
          path: '$artboardPath.animations[$animationIndex]',
        );
        final identifier = _joinIdentifiers(
          artboardSymbol?.identifier ?? 'artboard${artboardIndex + 1}',
          animationSymbol?.identifier ?? 'animation${animationIndex + 1}',
        );
        buffer.writeln(
          '  static const $identifier = '
          '${_dartString(artboard.animations[animationIndex].name ?? '')};',
        );
      }
    }
    buffer
      ..writeln('}')
      ..writeln();
  }

  void _writeViewModelConstants(
    StringBuffer buffer,
    String rootClassName,
    RiveMetadata metadata,
    RiveCodegenPlan plan,
  ) {
    buffer
      ..writeln('final class ${rootClassName}ViewModels {')
      ..writeln('  const ${rootClassName}ViewModels();');
    for (var index = 0; index < metadata.viewModels.length; index++) {
      final symbol = plan.symbolFor(
        kind: RiveCodegenSymbolKind.viewModel,
        path: 'viewModels[$index]',
      );
      buffer.writeln(
        '  static const ${symbol?.identifier ?? 'viewModel${index + 1}'} = '
        '${_dartString(metadata.viewModels[index].name ?? '')};',
      );
    }
    buffer
      ..writeln('}')
      ..writeln();
  }

  void _writeNestedViewModelBindings(
    StringBuffer buffer,
    String rootClassName,
    RiveMetadata metadata,
    RiveCodegenPlan plan,
    List<RiveCodegenDiagnostic> diagnostics,
  ) {
    if (metadata.viewModels.length < 2) {
      return;
    }

    for (
      var viewModelIndex = 0;
      viewModelIndex < metadata.viewModels.length;
      viewModelIndex++
    ) {
      final viewModel = metadata.viewModels[viewModelIndex];
      final viewModelPath = 'viewModels[$viewModelIndex]';
      final viewModelSymbol = plan.symbolFor(
        kind: RiveCodegenSymbolKind.viewModel,
        path: viewModelPath,
      );
      final identifier =
          viewModelSymbol?.identifier ?? 'viewModel${viewModelIndex + 1}';
      final className = _nestedViewModelClassName(rootClassName, identifier);
      buffer
        ..writeln('final class $className {')
        ..writeln('  const $className(this.instance);')
        ..writeln()
        ..writeln('  final rive.ViewModelInstance instance;')
        ..writeln();
      _writeViewModelStatics(buffer, viewModel, '  ');
      buffer.writeln();
      _writeViewModelProperties(
        buffer,
        viewModel,
        viewModelPath,
        'instance',
        plan,
        diagnostics,
        '  ',
      );
      buffer
        ..writeln()
        ..writeln('  RiveTelemetryBinding telemetry({')
        ..writeln('    String? artboardName,')
        ..writeln('    String? stateMachineName,')
        ..writeln('    rive.StateMachine? stateMachine,')
        ..writeln('  }) => RiveTelemetryBinding(')
        ..writeln('    artboardName: artboardName,')
        ..writeln('    stateMachineName: stateMachineName,')
        ..writeln('    stateMachine: stateMachine,')
        ..writeln('    viewModelName: viewModelName,')
        ..writeln('    viewModelInstance: instance,')
        ..writeln('  );');
      buffer
        ..writeln('}')
        ..writeln();
    }
  }

  void _writeViewModelStatics(
    StringBuffer buffer,
    RiveViewModelMetadata viewModel,
    String indent,
  ) {
    buffer.writeln(
      '${indent}static const viewModelName = ${_dartString(viewModel.name ?? '')};',
    );
    for (var index = 0; index < viewModel.instances.length; index++) {
      final instance = viewModel.instances[index];
      final identifier = sanitizeRiveIdentifier(
        instance.name,
        fallback: 'instance${index + 1}',
      );
      buffer.writeln(
        '${indent}static const ${_joinIdentifiers(identifier, 'Name')} = '
        '${_dartString(instance.name ?? '')};',
      );
    }
  }

  void _writeViewModelProperties(
    StringBuffer buffer,
    RiveViewModelMetadata viewModel,
    String viewModelPath,
    String instanceExpression,
    RiveCodegenPlan plan,
    List<RiveCodegenDiagnostic> diagnostics,
    String indent,
  ) {
    for (
      var propertyIndex = 0;
      propertyIndex < viewModel.properties.length;
      propertyIndex++
    ) {
      final property = viewModel.properties[propertyIndex];
      final propertyPath = '$viewModelPath.properties[$propertyIndex]';
      final propertySymbol = plan.symbolFor(
        kind: RiveCodegenSymbolKind.viewModelProperty,
        path: propertyPath,
      );
      final identifier =
          propertySymbol?.identifier ?? 'property${propertyIndex + 1}';
      final helperType = _flutterPropertyHelperType(property.type);
      if (helperType == 'RtUnsupported') {
        diagnostics.add(
          RiveCodegenDiagnostic(
            severity: RiveCodegenDiagnosticSeverity.warning,
            code: 'unsupportedFlutterViewModelProperty',
            message:
                'Generated metadata-only accessor for unsupported ViewModel property type ${property.type.name}.',
            path: propertyPath,
          ),
        );
      }
      buffer.writeln(
        '$indent$helperType get $identifier => '
        '$helperType($instanceExpression, ${_dartString(property.name ?? '')});',
      );
    }
  }
}

String _flutterPropertyHelperType(RiveViewModelPropertyType type) {
  return switch (type) {
    RiveViewModelPropertyType.number => 'RtNumber',
    RiveViewModelPropertyType.boolean => 'RtBool',
    RiveViewModelPropertyType.string => 'RtString',
    RiveViewModelPropertyType.color => 'RtColor',
    RiveViewModelPropertyType.trigger => 'RtTrigger',
    RiveViewModelPropertyType.enumType => 'RtEnum',
    RiveViewModelPropertyType.list ||
    RiveViewModelPropertyType.viewModel ||
    RiveViewModelPropertyType.unknown => 'RtUnsupported',
  };
}

String _defaultRootClassName(String source) {
  final fileName = _sourceFileName(source);
  final baseName = fileName.replaceFirst(RegExp(r'\.[^.]*$'), '');
  final pascal = _pascalIdentifier(baseName, 'RiveIntegration');
  return pascal.endsWith('Rive') ? pascal : '${pascal}Rive';
}

String _sourceFileName(String source) {
  final normalized = source.replaceAll(r'\', '/');
  final slash = normalized.lastIndexOf('/');
  return slash == -1 ? normalized : normalized.substring(slash + 1);
}

String _nestedViewModelClassName(String rootClassName, String identifier) =>
    '$rootClassName${_pascalIdentifier(identifier, 'ViewModel')}';

String _joinIdentifiers(String first, String second) =>
    first + second[0].toUpperCase() + second.substring(1);

String _pascalIdentifier(String sourceName, String fallback) {
  final lowerCamel = sanitizeRiveIdentifier(sourceName, fallback: fallback);
  return lowerCamel[0].toUpperCase() + lowerCamel.substring(1);
}

String _dartString(String value) {
  final escaped = value
      .replaceAll(r'\', r'\\')
      .replaceAll("'", r"\'")
      .replaceAll('\r', r'\r')
      .replaceAll('\n', r'\n');
  return "'$escaped'";
}
