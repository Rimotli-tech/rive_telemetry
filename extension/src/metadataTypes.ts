export interface RiveMetadata {
  schemaVersion: 1;
  source: string;
  header: RiveHeaderMetadata;
  artboards: RiveArtboardMetadata[];
  viewModels: RiveViewModelMetadata[];
  recordCount: number;
  unknownRecordCount: number;
  warnings: RiveInspectionWarning[];
}

export interface RiveHeaderMetadata {
  majorVersion: number;
  minorVersion: number;
  fileId: number;
  propertyKeyCount: number;
}

export interface RiveInspectionWarning {
  code: string;
  message: string;
  offset?: number;
  propertyKey?: number;
}

export interface RiveArtboardMetadata {
  name: string | null;
  defaultStateMachineId: number | null;
  viewModelId: number | null;
  animations: RiveAnimationMetadata[];
  stateMachines: RiveStateMachineMetadata[];
  hierarchy: RiveComponentMetadata[];
}

export interface RiveAnimationMetadata {
  name: string | null;
  fps: number | null;
  durationFrames: number | null;
  durationSeconds: number | null;
  speed: number | null;
  loop: number | null;
}

export interface RiveStateMachineMetadata {
  name: string | null;
  inputs: RiveInputMetadata[];
}

export interface RiveInputMetadata {
  name: string | null;
  type: 'boolean' | 'number' | 'trigger';
  defaultValue?: boolean | number | string | null;
}

export interface RiveComponentMetadata {
  name: string | null;
  parentId: number | null;
  typeKey: number;
  typeName: string | null;
}

export interface RiveViewModelMetadata {
  name: string | null;
  typeKey: number;
}

export function isRiveMetadata(value: unknown): value is RiveMetadata {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.schemaVersion === 1 &&
    typeof value.source === 'string' &&
    isRecord(value.header) &&
    typeof value.header.majorVersion === 'number' &&
    typeof value.header.minorVersion === 'number' &&
    typeof value.header.fileId === 'number' &&
    typeof value.header.propertyKeyCount === 'number' &&
    Array.isArray(value.artboards) &&
    Array.isArray(value.viewModels) &&
    typeof value.recordCount === 'number' &&
    typeof value.unknownRecordCount === 'number' &&
    Array.isArray(value.warnings)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
