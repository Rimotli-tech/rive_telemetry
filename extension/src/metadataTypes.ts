export interface RiveMetadata {
  schemaVersion: 1;
  source: string;
  status: RiveInspectionStatus;
  completeness: RiveMetadataCompleteness;
  codegen: RiveCodegenEligibility;
  header: RiveHeaderMetadata;
  artboards: RiveArtboardMetadata[];
  viewModels: RiveViewModelMetadata[];
  recordCount: number;
  unknownRecordCount: number;
  warnings: RiveInspectionWarning[];
}

export type RiveInspectionStatus =
  | 'complete'
  | 'partialUsable'
  | 'partialWithIntegrationRisk'
  | 'failed';

export interface RiveMetadataCompleteness {
  artboardsComplete: boolean;
  stateMachinesComplete: boolean;
  inputsComplete: boolean;
  viewModelsComplete: boolean;
  viewModelInstancesComplete: boolean;
  animationsComplete: boolean;
}

export interface RiveCodegenEligibility {
  canGenerateFlutter: boolean;
  canGenerateTypeScript: boolean;
  blockedReasons: string[];
  warnings: string[];
}

export interface RiveHeaderMetadata {
  majorVersion: number;
  minorVersion: number;
  fileId: number;
  propertyKeyCount: number;
}

export interface RiveInspectionWarning {
  code: string;
  severity: 'info' | 'warning' | 'integrationRisk' | 'fatal';
  message: string;
  offset?: number;
  propertyKey?: number;
  objectTypeKey?: number;
  objectTypeName?: string | null;
  objectName?: string | null;
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
  id: number;
  name: string | null;
  typeKey: number;
  defaultInstanceId: number | null;
  properties: RiveViewModelPropertyMetadata[];
  instances: RiveViewModelInstanceMetadata[];
}

export type RiveViewModelPropertyType =
  | 'boolean'
  | 'number'
  | 'string'
  | 'color'
  | 'enumType'
  | 'list'
  | 'viewModel'
  | 'unknown';

export interface RiveViewModelPropertyMetadata {
  id: number;
  name: string | null;
  type: RiveViewModelPropertyType;
  typeKey: number;
  enumId?: number;
  viewModelReferenceId?: number;
}

export interface RiveViewModelInstanceMetadata {
  id: number;
  name: string | null;
  viewModelId: number | null;
  values: RiveViewModelInstanceValueMetadata[];
}

export interface RiveViewModelInstanceValueMetadata {
  id: number;
  propertyId: number | null;
  propertyName: string | null;
  type: RiveViewModelPropertyType;
  value: boolean | number | string | null;
}

export function isRiveMetadata(value: unknown): value is RiveMetadata {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.schemaVersion === 1 &&
    typeof value.source === 'string' &&
    typeof value.status === 'string' &&
    isRecord(value.completeness) &&
    isRecord(value.codegen) &&
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
