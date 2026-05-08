import 'metadata.dart';

enum RiveCodegenSymbolKind {
  artboard,
  animation,
  stateMachine,
  input,
  viewModel,
  viewModelProperty,
  viewModelInstance,
}

enum RiveCodegenDiagnosticSeverity { info, warning, error }

class RiveCodegenDiagnostic {
  const RiveCodegenDiagnostic({
    required this.severity,
    required this.code,
    required this.message,
    required this.path,
  });

  final RiveCodegenDiagnosticSeverity severity;
  final String code;
  final String message;
  final String path;
}

class RiveCodegenSymbol {
  const RiveCodegenSymbol({
    required this.kind,
    required this.path,
    required this.sourceName,
    required this.identifier,
  });

  final RiveCodegenSymbolKind kind;
  final String path;
  final String sourceName;
  final String identifier;
}

class RiveCodegenPlan {
  const RiveCodegenPlan({required this.symbols, required this.diagnostics});

  final List<RiveCodegenSymbol> symbols;
  final List<RiveCodegenDiagnostic> diagnostics;

  bool get hasErrors => diagnostics.any(
    (diagnostic) => diagnostic.severity == RiveCodegenDiagnosticSeverity.error,
  );

  Iterable<RiveCodegenSymbol> symbolsFor(RiveCodegenSymbolKind kind) =>
      symbols.where((symbol) => symbol.kind == kind);
}

class RiveCodegenPlanner {
  const RiveCodegenPlanner();

  RiveCodegenPlan build(RiveMetadata metadata) {
    final symbols = <RiveCodegenSymbol>[];
    final diagnostics = <RiveCodegenDiagnostic>[];
    final rootAllocator = _IdentifierAllocator(diagnostics);

    for (
      var artboardIndex = 0;
      artboardIndex < metadata.artboards.length;
      artboardIndex++
    ) {
      final artboard = metadata.artboards[artboardIndex];
      final artboardPath = 'artboards[$artboardIndex]';
      final artboardIdentifier = rootAllocator.allocate(
        sourceName: artboard.name,
        fallback: 'artboard${artboardIndex + 1}',
        path: artboardPath,
      );
      symbols.add(
        RiveCodegenSymbol(
          kind: RiveCodegenSymbolKind.artboard,
          path: artboardPath,
          sourceName: artboard.name ?? '',
          identifier: artboardIdentifier,
        ),
      );

      final animationAllocator = _IdentifierAllocator(diagnostics);
      for (
        var animationIndex = 0;
        animationIndex < artboard.animations.length;
        animationIndex++
      ) {
        final animation = artboard.animations[animationIndex];
        final path = '$artboardPath.animations[$animationIndex]';
        symbols.add(
          RiveCodegenSymbol(
            kind: RiveCodegenSymbolKind.animation,
            path: path,
            sourceName: animation.name ?? '',
            identifier: animationAllocator.allocate(
              sourceName: animation.name,
              fallback: 'animation${animationIndex + 1}',
              path: path,
            ),
          ),
        );
      }

      final stateMachineAllocator = _IdentifierAllocator(diagnostics);
      for (
        var stateMachineIndex = 0;
        stateMachineIndex < artboard.stateMachines.length;
        stateMachineIndex++
      ) {
        final stateMachine = artboard.stateMachines[stateMachineIndex];
        final path = '$artboardPath.stateMachines[$stateMachineIndex]';
        symbols.add(
          RiveCodegenSymbol(
            kind: RiveCodegenSymbolKind.stateMachine,
            path: path,
            sourceName: stateMachine.name ?? '',
            identifier: stateMachineAllocator.allocate(
              sourceName: stateMachine.name,
              fallback: 'stateMachine${stateMachineIndex + 1}',
              path: path,
            ),
          ),
        );

        final inputAllocator = _IdentifierAllocator(diagnostics);
        for (
          var inputIndex = 0;
          inputIndex < stateMachine.inputs.length;
          inputIndex++
        ) {
          final input = stateMachine.inputs[inputIndex];
          final inputPath = '$path.inputs[$inputIndex]';
          symbols.add(
            RiveCodegenSymbol(
              kind: RiveCodegenSymbolKind.input,
              path: inputPath,
              sourceName: input.name ?? '',
              identifier: inputAllocator.allocate(
                sourceName: input.name,
                fallback: 'input${inputIndex + 1}',
                path: inputPath,
              ),
            ),
          );
        }
      }
    }

    final viewModelAllocator = _IdentifierAllocator(diagnostics);
    for (
      var viewModelIndex = 0;
      viewModelIndex < metadata.viewModels.length;
      viewModelIndex++
    ) {
      final viewModel = metadata.viewModels[viewModelIndex];
      final viewModelPath = 'viewModels[$viewModelIndex]';
      symbols.add(
        RiveCodegenSymbol(
          kind: RiveCodegenSymbolKind.viewModel,
          path: viewModelPath,
          sourceName: viewModel.name ?? '',
          identifier: viewModelAllocator.allocate(
            sourceName: viewModel.name,
            fallback: 'viewModel${viewModelIndex + 1}',
            path: viewModelPath,
          ),
        ),
      );

      final propertyAllocator = _IdentifierAllocator(diagnostics);
      for (
        var propertyIndex = 0;
        propertyIndex < viewModel.properties.length;
        propertyIndex++
      ) {
        final property = viewModel.properties[propertyIndex];
        final path = '$viewModelPath.properties[$propertyIndex]';
        symbols.add(
          RiveCodegenSymbol(
            kind: RiveCodegenSymbolKind.viewModelProperty,
            path: path,
            sourceName: property.name ?? '',
            identifier: propertyAllocator.allocate(
              sourceName: property.name,
              fallback: 'property${propertyIndex + 1}',
              path: path,
            ),
          ),
        );
      }

      final instanceAllocator = _IdentifierAllocator(diagnostics);
      for (
        var instanceIndex = 0;
        instanceIndex < viewModel.instances.length;
        instanceIndex++
      ) {
        final instance = viewModel.instances[instanceIndex];
        final path = '$viewModelPath.instances[$instanceIndex]';
        symbols.add(
          RiveCodegenSymbol(
            kind: RiveCodegenSymbolKind.viewModelInstance,
            path: path,
            sourceName: instance.name ?? '',
            identifier: instanceAllocator.allocate(
              sourceName: instance.name,
              fallback: 'instance${instanceIndex + 1}',
              path: path,
            ),
          ),
        );
      }
    }

    return RiveCodegenPlan(
      symbols: List.unmodifiable(symbols),
      diagnostics: List.unmodifiable(diagnostics),
    );
  }
}

String sanitizeRiveIdentifier(String? sourceName, {required String fallback}) {
  final words = _identifierWords(sourceName);
  final identifier = words.isEmpty
      ? fallback
      : words.first + words.skip(1).map(_capitalize).join();
  final safe = identifier.isEmpty ? fallback : identifier;
  if (_startsWithDigit(safe)) {
    return 'rive$safe';
  }
  if (_reservedWords.contains(safe)) {
    return '${safe}Value';
  }
  return safe;
}

class _IdentifierAllocator {
  _IdentifierAllocator(this.diagnostics);

  final List<RiveCodegenDiagnostic> diagnostics;
  final _seen = <String, int>{};

  String allocate({
    required String? sourceName,
    required String fallback,
    required String path,
  }) {
    final base = sanitizeRiveIdentifier(sourceName, fallback: fallback);
    if ((sourceName == null || sourceName.trim().isEmpty) && base == fallback) {
      diagnostics.add(
        RiveCodegenDiagnostic(
          severity: RiveCodegenDiagnosticSeverity.warning,
          code: 'generatedFallbackName',
          message: 'Generated fallback identifier "$base".',
          path: path,
        ),
      );
    } else if (base != sourceName) {
      diagnostics.add(
        RiveCodegenDiagnostic(
          severity: RiveCodegenDiagnosticSeverity.info,
          code: 'sanitizedName',
          message: 'Sanitized "${sourceName ?? ''}" to "$base".',
          path: path,
        ),
      );
    }

    final count = _seen.update(base, (value) => value + 1, ifAbsent: () => 1);
    if (count == 1) {
      return base;
    }

    final identifier = '$base$count';
    diagnostics.add(
      RiveCodegenDiagnostic(
        severity: RiveCodegenDiagnosticSeverity.warning,
        code: 'duplicateName',
        message: 'Resolved duplicate identifier "$base" as "$identifier".',
        path: path,
      ),
    );
    return identifier;
  }
}

List<String> _identifierWords(String? sourceName) {
  final normalized = (sourceName ?? '').trim();
  if (normalized.isEmpty) {
    return const [];
  }
  return normalized
      .split(RegExp(r'[^A-Za-z0-9]+'))
      .where((part) => part.isNotEmpty)
      .expand(
        (part) => RegExp(
          r'[A-Z]?[a-z]+|[A-Z]+(?![a-z])|\d+',
        ).allMatches(part).map((match) => match.group(0)!.toLowerCase()),
      )
      .toList();
}

String _capitalize(String value) {
  if (value.isEmpty) {
    return value;
  }
  return value[0].toUpperCase() + value.substring(1);
}

bool _startsWithDigit(String value) =>
    value.isNotEmpty && value.codeUnitAt(0) >= 48 && value.codeUnitAt(0) <= 57;

const _reservedWords = {
  'abstract',
  'as',
  'assert',
  'async',
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'default',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'final',
  'finally',
  'for',
  'function',
  'if',
  'import',
  'in',
  'interface',
  'is',
  'let',
  'new',
  'null',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'var',
  'void',
  'while',
  'with',
};
