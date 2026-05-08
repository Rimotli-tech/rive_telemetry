import 'dart:convert';

import 'metadata.dart';
import 'validation.dart';

List<int> buildRiveMetadataPdf(
  RiveMetadata metadata, {
  required RiveValidationResult validation,
  required DateTime generatedAt,
}) {
  final lines = _buildDocumentLines(metadata, validation, generatedAt.toUtc());
  return _SimplePdfDocument(title: 'Rive Metadata').build(lines);
}

List<String> _buildDocumentLines(
  RiveMetadata metadata,
  RiveValidationResult validation,
  DateTime generatedAt,
) {
  final stateMachineCount = metadata.artboards.fold<int>(
    0,
    (count, artboard) => count + artboard.stateMachines.length,
  );
  final inputCount = metadata.artboards.fold<int>(
    0,
    (count, artboard) =>
        count +
        artboard.stateMachines.fold<int>(
          0,
          (inner, stateMachine) => inner + stateMachine.inputs.length,
        ),
  );
  final animationCount = metadata.artboards.fold<int>(
    0,
    (count, artboard) => count + artboard.animations.length,
  );
  final viewModelPropertyCount = metadata.viewModels.fold<int>(
    0,
    (count, viewModel) => count + viewModel.properties.length,
  );

  final lines = <String>[
    'Rive Metadata Document',
    '',
    'Source: ${metadata.source}',
    'Generated: ${generatedAt.toIso8601String()}',
    'Schema version: ${metadata.schemaVersion}',
    'Inspection status: ${metadata.status.name}',
    'Runtime version: ${metadata.header.majorVersion}.${metadata.header.minorVersion}',
    'Records: ${metadata.recordCount}',
    'Unknown records: ${metadata.unknownRecordCount}',
    '',
    'Summary',
    '- Artboards: ${metadata.artboards.length}',
    '- State machines: $stateMachineCount',
    '- Inputs: $inputCount',
    '- ViewModels: ${metadata.viewModels.length}',
    '- ViewModel properties: $viewModelPropertyCount',
    '- Animations: $animationCount',
    '',
    'Code generation',
    '- Flutter: ${metadata.codegen.canGenerateFlutter ? 'available' : 'blocked'}',
    '- TypeScript: ${metadata.codegen.canGenerateTypeScript ? 'available' : 'blocked'}',
  ];

  if (metadata.codegen.blockedReasons.isNotEmpty) {
    lines.add(
      '- Blocked reasons: ${metadata.codegen.blockedReasons.join('; ')}',
    );
  }
  if (metadata.codegen.warnings.isNotEmpty) {
    lines.add('- Warnings: ${metadata.codegen.warnings.join('; ')}');
  }

  lines
    ..add('')
    ..add('Validation');
  if (validation.issues.isEmpty) {
    lines.add('- No validation issues found.');
  } else {
    for (final issue in validation.issues) {
      lines.add(
        '- ${issue.severity.name} ${issue.code} at ${issue.path}: ${issue.message}',
      );
    }
  }

  lines
    ..add('')
    ..add('Parser warnings');
  if (metadata.warnings.isEmpty) {
    lines.add('- No parser warnings found.');
  } else {
    for (final warning in metadata.warnings) {
      lines.add(
        '- ${warning.severity.name} ${warning.code}: ${warning.message}',
      );
    }
  }

  lines
    ..add('')
    ..add('Artboards');
  for (
    var artboardIndex = 0;
    artboardIndex < metadata.artboards.length;
    artboardIndex++
  ) {
    final artboard = metadata.artboards[artboardIndex];
    lines.add('${artboardIndex + 1}. ${_name(artboard.name)}');
    if (artboard.viewModelId != null) {
      lines.add('   ViewModel id: ${artboard.viewModelId}');
    }
    if (artboard.defaultStateMachineId != null) {
      lines.add(
        '   Default state machine id: ${artboard.defaultStateMachineId}',
      );
    }

    if (artboard.stateMachines.isNotEmpty) {
      lines.add('   State machines');
      for (final stateMachine in artboard.stateMachines) {
        lines.add('   - ${_name(stateMachine.name)}');
        for (final input in stateMachine.inputs) {
          lines.add(
            '     input ${_name(input.name)}: ${input.type.name}${input.defaultValue == null ? '' : ' = ${input.defaultValue}'}',
          );
        }
      }
    }

    if (artboard.animations.isNotEmpty) {
      lines.add('   Animations');
      for (final animation in artboard.animations) {
        lines.add('   - ${_name(animation.name)}');
      }
    }
  }

  lines
    ..add('')
    ..add('ViewModels');
  if (metadata.viewModels.isEmpty) {
    lines.add('- No ViewModels found.');
  }
  for (final viewModel in metadata.viewModels) {
    lines.add('- ${_name(viewModel.name)}');
    lines.add('  id: ${viewModel.id}');
    if (viewModel.defaultInstanceId != null) {
      lines.add('  default instance id: ${viewModel.defaultInstanceId}');
    }
    if (viewModel.properties.isNotEmpty) {
      lines.add('  Properties');
      for (final property in viewModel.properties) {
        lines.add(
          '  - ${_name(property.name)}: ${property.type.name} (id ${property.id})',
        );
      }
    }
    if (viewModel.instances.isNotEmpty) {
      lines.add('  Instances');
      for (final instance in viewModel.instances) {
        lines.add('  - ${_name(instance.name)}');
        for (final value in instance.values) {
          lines.add('    ${_name(value.propertyName)}: ${value.value ?? '-'}');
        }
      }
    }
  }

  return lines.expand(_wrapLine).toList();
}

Iterable<String> _wrapLine(String line) sync* {
  const maxLength = 100;
  if (line.length <= maxLength) {
    yield line;
    return;
  }

  var remaining = line;
  while (remaining.length > maxLength) {
    final splitAt = remaining.lastIndexOf(' ', maxLength);
    final index = splitAt <= 0 ? maxLength : splitAt;
    yield remaining.substring(0, index);
    remaining = '  ${remaining.substring(index).trimLeft()}';
  }
  yield remaining;
}

String _name(String? value) {
  if (value == null || value.trim().isEmpty) {
    return '<unnamed>';
  }
  return value;
}

class _SimplePdfDocument {
  const _SimplePdfDocument({required this.title});

  final String title;

  List<int> build(List<String> lines) {
    final pages = <List<String>>[];
    const linesPerPage = 52;
    for (var index = 0; index < lines.length; index += linesPerPage) {
      final end = (index + linesPerPage).clamp(0, lines.length);
      pages.add(lines.sublist(index, end));
    }
    if (pages.isEmpty) {
      pages.add(const ['Rive Metadata Document']);
    }

    final objects = <String>[];
    objects.add('<< /Type /Catalog /Pages 2 0 R >>');
    objects.add(''); // filled after page ids are known.
    objects.add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

    final pageIds = <int>[];
    for (final pageLines in pages) {
      final pageObjectId = objects.length + 1;
      final contentObjectId = pageObjectId + 1;
      pageIds.add(pageObjectId);
      objects.add(
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] '
        '/Resources << /Font << /F1 3 0 R >> >> '
        '/Contents $contentObjectId 0 R >>',
      );
      final stream = _contentStream(pageLines);
      objects.add(
        '<< /Length ${latin1.encode(stream).length} >>\n'
        'stream\n'
        '$stream\n'
        'endstream',
      );
    }

    objects[1] =
        '<< /Type /Pages /Kids [${pageIds.map((id) => '$id 0 R').join(' ')}] /Count ${pageIds.length} >>';

    final buffer = StringBuffer('%PDF-1.4\n');
    final offsets = <int>[];
    for (var index = 0; index < objects.length; index++) {
      offsets.add(latin1.encode(buffer.toString()).length);
      buffer
        ..writeln('${index + 1} 0 obj')
        ..writeln(objects[index])
        ..writeln('endobj');
    }

    final xrefOffset = latin1.encode(buffer.toString()).length;
    buffer
      ..writeln('xref')
      ..writeln('0 ${objects.length + 1}')
      ..writeln('0000000000 65535 f ');
    for (final offset in offsets) {
      buffer.writeln('${offset.toString().padLeft(10, '0')} 00000 n ');
    }
    buffer
      ..writeln('trailer')
      ..writeln(
        '<< /Size ${objects.length + 1} /Root 1 0 R /Info << /Title (${_pdfText(title)}) >> >>',
      )
      ..writeln('startxref')
      ..writeln(xrefOffset)
      ..writeln('%%EOF');

    return latin1.encode(buffer.toString());
  }

  String _contentStream(List<String> lines) {
    final buffer = StringBuffer()
      ..writeln('BT')
      ..writeln('/F1 11 Tf')
      ..writeln('14 TL')
      ..writeln('50 742 Td');
    for (final line in lines) {
      buffer.writeln('(${_pdfText(line)}) Tj');
      buffer.writeln('T*');
    }
    buffer.writeln('ET');
    return buffer.toString();
  }
}

String _pdfText(String value) =>
    value.replaceAll(r'\', r'\\').replaceAll('(', r'\(').replaceAll(')', r'\)');
