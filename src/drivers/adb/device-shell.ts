export function quoteForDeviceShell(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}
