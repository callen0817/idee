import { describe, expect, test } from 'bun:test';
import { shouldExport } from './export-policy';

describe('public source-only export', () => {
  test('does not publish project conversation history', () => {
    expect(shouldExport('docs/history/full-history.md')).toBe(false);
  });
  test('does not publish saved credentials or environment files', () => {
    expect(shouldExport('.env')).toBe(false);
    expect(shouldExport('.env.production')).toBe(false);
    expect(shouldExport('secrets/github.key')).toBe(false);
  });
  test('excludes repository metadata at any depth', () => {
    expect(shouldExport('.git')).toBe(false);
    expect(shouldExport('nested/.git/config')).toBe(false);
  });
  test('excludes dependency and generated build output', () => {
    expect(shouldExport('node_modules/react/index.js')).toBe(false);
    expect(shouldExport('.output/server/index.js')).toBe(false);
  });
  test('retains source, migrations and safe environment template', () => {
    expect(shouldExport('src/routes/index.tsx')).toBe(true);
    expect(shouldExport('drizzle/migrations/0000_create_early_access_submissions.sql')).toBe(true);
    expect(shouldExport('.env.example')).toBe(true);
  });
});