export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function callMethod<T>(
  target: unknown,
  methodName: string,
  args: unknown[] = [],
): T | undefined {
  if (!isRecord(target)) {
    return undefined;
  }

  const method = target[methodName];
  if (typeof method !== 'function') {
    return undefined;
  }

  return method.apply(target, args) as T;
}
