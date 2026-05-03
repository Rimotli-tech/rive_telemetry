import { RiveViewModelTelemetry } from './types.js';
export declare function captureViewModelTelemetry(options: {
    instance: unknown;
    viewModelName?: string;
}): RiveViewModelTelemetry;
export declare function setViewModelProperty(options: {
    instance: unknown;
    instanceName?: string;
    propertyName: string;
    propertyType: string;
    value: unknown;
}): boolean;
