const assert = require('node:assert/strict');
const Module = require('node:module');
const test = require('node:test');

const originalLoad = Module._load;

Module._load = function loadWithVscodeMock(request, parent, isMain) {
  if (request === 'vscode') {
    return {
      ProgressLocation: {
        Notification: 15,
      },
      window: {
        showOpenDialog: async () => undefined,
        withProgress: async (_options, task) => task(),
      },
    };
  }

  return originalLoad.call(this, request, parent, isMain);
};

const {
  inspectRivFileWithCore,
} = require('../out/rivLoader.js');

function createOutput() {
  const lines = [];
  return {
    lines,
    appendLine(line) {
      lines.push(line);
    },
  };
}

function metadata(overrides = {}) {
  return {
    schemaVersion: 1,
    source: 'demo.riv',
    header: {
      majorVersion: 7,
      minorVersion: 0,
      fileId: 1,
      propertyKeyCount: 0,
    },
    artboards: [],
    viewModels: [],
    recordCount: 0,
    unknownRecordCount: 0,
    warnings: [],
    ...overrides,
  };
}

test('inspectRivFileWithCore parses metadata JSON from Dart core', async () => {
  const output = createOutput();
  const execFile = (_command, args, options, callback) => {
    assert.equal(args[0], 'run');
    assert.match(args[1], /rive_metadata_inspect\.dart$/);
    assert.equal(args[2], 'demo.riv');
    assert.ok(options.cwd);
    callback(null, JSON.stringify(metadata()), '');
  };

  const result = await inspectRivFileWithCore(
    'demo.riv',
    'C:\\repo\\core\\bin\\rive_metadata_inspect.dart',
    output,
    execFile,
  );

  assert.equal(result.schemaVersion, 1);
  assert.equal(result.source, 'demo.riv');
});

test('inspectRivFileWithCore rejects parser errors with stderr details', async () => {
  const output = createOutput();
  const execFile = (_command, _args, _options, callback) => {
    callback(new Error('failed'), '', 'RiveInspectionException: invalid file');
  };

  await assert.rejects(
    inspectRivFileWithCore(
      'bad.riv',
      'C:\\repo\\core\\bin\\rive_metadata_inspect.dart',
      output,
      execFile,
    ),
    /RiveInspectionException: invalid file/,
  );
  assert.deepEqual(output.lines, ['RiveInspectionException: invalid file']);
});

test('inspectRivFileWithCore rejects invalid metadata JSON', async () => {
  const output = createOutput();
  const execFile = (_command, _args, _options, callback) => {
    callback(null, JSON.stringify(metadata({ schemaVersion: 999 })), '');
  };

  await assert.rejects(
    inspectRivFileWithCore(
      'demo.riv',
      'C:\\repo\\core\\bin\\rive_metadata_inspect.dart',
      output,
      execFile,
    ),
    /invalid JSON/,
  );
});
