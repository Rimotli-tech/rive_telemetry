export declare function isRecord(value: unknown): value is Record<string, unknown>;
export declare function readString(value: unknown): string | undefined;
export declare function readArray(value: unknown): unknown[];
export declare function callMethod<T>(target: unknown, methodName: string, args?: unknown[]): T | undefined;
