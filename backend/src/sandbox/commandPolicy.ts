const ALLOWED_PATTERNS: RegExp[] = [
  /^node(\s+|$)/,
  /^npm(\s+|$)/,
  /^npx(\s+|$)/,
  /^cat\s+/,
  /^ls(\s+|$)/,
  /^pwd$/,
  /^echo\s+/,
  /^uname(\s+|$)/,
  /^test(\s+|$)/,
  /^mkdir(\s+|$)/,
  /^touch(\s+|$)/,
];

export class CommandNotAllowedError extends Error {
  constructor(command: string) {
    super(`Command not allowed: ${command}`);
    this.name = "CommandNotAllowedError";
  }
}

export class UnsafePathError extends Error {
  constructor(path: string) {
    super(`Unsafe path: ${path}`);
    this.name = "UnsafePathError";
  }
}

export function assertCommandAllowed(command: string): void {
  const trimmed = command.trim();

  if (!trimmed) {
    throw new CommandNotAllowedError(command);
  }

  if (trimmed.includes("&&") || trimmed.includes("||") || trimmed.includes(";")) {
    throw new CommandNotAllowedError(command);
  }

  const allowed = ALLOWED_PATTERNS.some((pattern) => pattern.test(trimmed));

  if (!allowed) {
    throw new CommandNotAllowedError(command);
  }
}

export function assertSafePath(path: string): void {
  const trimmed = path.trim();

  if (!trimmed.startsWith("/")) {
    throw new UnsafePathError(path);
  }

  if (trimmed.includes("..")) {
    throw new UnsafePathError(path);
  }

  if (/[\n\r\0$`]/.test(trimmed)) {
    throw new UnsafePathError(path);
  }
}

export function shellEscape(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function buildCatCommand(path: string): string {
  assertSafePath(path);
  return `cat ${shellEscape(path)}`;
}

export function getAllowedCommandPatterns(): string[] {
  return ALLOWED_PATTERNS.map((pattern) => pattern.source);
}
