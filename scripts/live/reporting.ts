import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import type { LiveRunManifest, PreflightReport } from './contracts';
import { reportDirectory } from './run-context';

const SENSITIVE_KEYS = /(authorization|token|secret|password|private.?key|cookie)/i;
const TOKEN_PATTERNS = [
  /xox[baprs]-[A-Za-z0-9-]+/g,
  /gh[psuor]_[A-Za-z0-9_]+/g,
  /Bearer\s+[A-Za-z0-9._~-]+/gi,
  /-----BEGIN [^-]+ PRIVATE KEY-----[\s\S]*?-----END [^-]+ PRIVATE KEY-----/g,
];

export function redactForReport(value: unknown, key = ''): unknown {
  if (SENSITIVE_KEYS.test(key)) return '[REDACTED]';
  if (typeof value === 'string') {
    return TOKEN_PATTERNS.reduce((text, pattern) => text.replace(pattern, '[REDACTED]'), value);
  }
  if (Array.isArray(value)) return value.map(item => redactForReport(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [childKey, redactForReport(childValue, childKey)]));
  }
  return value;
}

export async function writeJsonReport(runId: string, fileName: string, value: unknown): Promise<void> {
  const directory = reportDirectory(runId);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, fileName), `${JSON.stringify(redactForReport(value), null, 2)}\n`, 'utf8');
}

export async function writePreflightMarkdown(report: PreflightReport): Promise<void> {
  const lines = [
    '# Sarvenix Live Preflight',
    '',
    `- Run: \`${report.runId}\``,
    `- Generated: ${report.generatedAt}`,
    `- Result: **${report.passed ? 'PASS' : 'FAIL'}**`,
    '',
    '| Check | Provider | Result | Detail |',
    '|---|---|---|---|',
    ...report.checks.map(check => `| ${check.id} | ${check.provider} | ${check.passed ? 'PASS' : 'FAIL'} | ${check.detail.replace(/\|/g, '\\|')} |`),
    '',
  ];
  const directory = reportDirectory(report.runId);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, 'preflight.md'), lines.join('\n'), 'utf8');
}

export function summarizeCleanup(manifest: LiveRunManifest): string {
  const cleaned = manifest.resources.filter(resource => resource.cleanedAt).length;
  return `${cleaned}/${manifest.resources.length} manifest-owned resources cleaned; verified=${manifest.cleanup.verified}`;
}
