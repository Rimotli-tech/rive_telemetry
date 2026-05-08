import 'metadata.dart';

class RiveValidationIssue {
  const RiveValidationIssue({
    required this.code,
    required this.severity,
    required this.path,
    required this.message,
  });

  final String code;
  final RiveWarningSeverity severity;
  final String path;
  final String message;

  Map<String, Object?> toJson() => {
    'code': code,
    'severity': severity.name,
    'path': path,
    'message': message,
  };
}

class RiveValidationResult {
  const RiveValidationResult({required this.issues});

  final List<RiveValidationIssue> issues;

  bool get hasIssues => issues.isNotEmpty;

  bool get hasIntegrationRisk => issues.any(
    (issue) =>
        issue.severity == RiveWarningSeverity.integrationRisk ||
        issue.severity == RiveWarningSeverity.fatal,
  );

  bool get hasFatal =>
      issues.any((issue) => issue.severity == RiveWarningSeverity.fatal);

  Map<String, Object?> toJson() => {
    'hasIssues': hasIssues,
    'hasIntegrationRisk': hasIntegrationRisk,
    'hasFatal': hasFatal,
    'issues': issues.map((issue) => issue.toJson()).toList(),
  };
}

class RiveMetadataValidator {
  const RiveMetadataValidator();

  RiveValidationResult validate(RiveMetadata metadata) {
    final issues = <RiveValidationIssue>[];

    _validateNamedCollection(
      issues: issues,
      items: metadata.artboards,
      pathPrefix: 'artboards',
      label: 'artboard',
      nameOf: (artboard) => artboard.name,
      unnamedSeverity: RiveWarningSeverity.integrationRisk,
      duplicateSeverity: RiveWarningSeverity.integrationRisk,
    );

    for (
      var artboardIndex = 0;
      artboardIndex < metadata.artboards.length;
      artboardIndex++
    ) {
      final artboard = metadata.artboards[artboardIndex];
      final artboardPath = 'artboards[$artboardIndex]';

      _validateNamedCollection(
        issues: issues,
        items: artboard.stateMachines,
        pathPrefix: '$artboardPath.stateMachines',
        label: 'state machine',
        nameOf: (stateMachine) => stateMachine.name,
        unnamedSeverity: RiveWarningSeverity.integrationRisk,
        duplicateSeverity: RiveWarningSeverity.integrationRisk,
      );

      _validateNamedCollection(
        issues: issues,
        items: artboard.animations,
        pathPrefix: '$artboardPath.animations',
        label: 'animation',
        nameOf: (animation) => animation.name,
        unnamedSeverity: RiveWarningSeverity.warning,
        duplicateSeverity: RiveWarningSeverity.integrationRisk,
      );

      for (
        var stateMachineIndex = 0;
        stateMachineIndex < artboard.stateMachines.length;
        stateMachineIndex++
      ) {
        final stateMachine = artboard.stateMachines[stateMachineIndex];
        _validateNamedCollection(
          issues: issues,
          items: stateMachine.inputs,
          pathPrefix: '$artboardPath.stateMachines[$stateMachineIndex].inputs',
          label: 'input',
          nameOf: (input) => input.name,
          unnamedSeverity: RiveWarningSeverity.integrationRisk,
          duplicateSeverity: RiveWarningSeverity.integrationRisk,
        );
      }
    }

    _validateNamedCollection(
      issues: issues,
      items: metadata.viewModels,
      pathPrefix: 'viewModels',
      label: 'ViewModel',
      nameOf: (viewModel) => viewModel.name,
      unnamedSeverity: RiveWarningSeverity.integrationRisk,
      duplicateSeverity: RiveWarningSeverity.integrationRisk,
    );

    for (
      var viewModelIndex = 0;
      viewModelIndex < metadata.viewModels.length;
      viewModelIndex++
    ) {
      final viewModel = metadata.viewModels[viewModelIndex];
      final viewModelPath = 'viewModels[$viewModelIndex]';
      _validateNamedCollection(
        issues: issues,
        items: viewModel.properties,
        pathPrefix: '$viewModelPath.properties',
        label: 'ViewModel property',
        nameOf: (property) => property.name,
        unnamedSeverity: RiveWarningSeverity.integrationRisk,
        duplicateSeverity: RiveWarningSeverity.integrationRisk,
      );
      _validateNamedCollection(
        issues: issues,
        items: viewModel.instances,
        pathPrefix: '$viewModelPath.instances',
        label: 'ViewModel instance',
        nameOf: (instance) => instance.name,
        unnamedSeverity: RiveWarningSeverity.warning,
        duplicateSeverity: RiveWarningSeverity.integrationRisk,
      );

      for (
        var propertyIndex = 0;
        propertyIndex < viewModel.properties.length;
        propertyIndex++
      ) {
        final property = viewModel.properties[propertyIndex];
        if (_isUnsupportedPropertyType(property.type)) {
          issues.add(
            RiveValidationIssue(
              code: 'unsupportedViewModelPropertyType',
              severity: RiveWarningSeverity.integrationRisk,
              path: '$viewModelPath.properties[$propertyIndex]',
              message:
                  'ViewModel property "${_displayName(property.name)}" has unsupported type ${property.type.name}.',
            ),
          );
        }
      }
    }

    return RiveValidationResult(issues: List.unmodifiable(issues));
  }

  void _validateNamedCollection<T>({
    required List<RiveValidationIssue> issues,
    required List<T> items,
    required String pathPrefix,
    required String label,
    required String? Function(T item) nameOf,
    required RiveWarningSeverity unnamedSeverity,
    required RiveWarningSeverity duplicateSeverity,
  }) {
    final names = <String, List<int>>{};
    for (var index = 0; index < items.length; index++) {
      final name = nameOf(items[index]);
      if (name == null || name.trim().isEmpty) {
        issues.add(
          RiveValidationIssue(
            code: 'unnamed${_pascalLabel(label)}',
            severity: unnamedSeverity,
            path: '$pathPrefix[$index]',
            message: 'Unnamed $label may make generated integration unstable.',
          ),
        );
        continue;
      }

      names.putIfAbsent(name, () => []).add(index);
    }

    for (final entry in names.entries) {
      if (entry.value.length < 2) {
        continue;
      }

      for (final index in entry.value) {
        issues.add(
          RiveValidationIssue(
            code: 'duplicate${_pascalLabel(label)}Name',
            severity: duplicateSeverity,
            path: '$pathPrefix[$index]',
            message:
                'Duplicate $label name "${entry.key}" can make runtime lookup ambiguous.',
          ),
        );
      }
    }
  }
}

bool _isUnsupportedPropertyType(RiveViewModelPropertyType type) {
  return switch (type) {
    RiveViewModelPropertyType.boolean ||
    RiveViewModelPropertyType.number ||
    RiveViewModelPropertyType.string ||
    RiveViewModelPropertyType.color ||
    RiveViewModelPropertyType.trigger ||
    RiveViewModelPropertyType.enumType => false,
    RiveViewModelPropertyType.list ||
    RiveViewModelPropertyType.viewModel ||
    RiveViewModelPropertyType.unknown => true,
  };
}

String _displayName(String? name) {
  if (name == null || name.trim().isEmpty) {
    return '<unnamed>';
  }
  return name;
}

String _pascalLabel(String value) {
  final words = value
      .split(RegExp(r'[^A-Za-z0-9]+'))
      .where((part) => part.isNotEmpty)
      .toList();
  return words.map((word) => word[0].toUpperCase() + word.substring(1)).join();
}
