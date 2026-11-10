const excludedSegments = new Set([
  '.git', 'node_modules', 'dist', 'dist-ssr', '.output', '.tanstack', '.nitro',
  '.wrangler', '.vinxi', '.lovable', '.workspace', '.agents', '.claude', 'history',
]);

export function shouldExport(path: string): boolean {
  const segments = path.replaceAll('\\', '/').split('/');
  const name = segments.at(-1) ?? '';
  if (segments.some((segment) => excludedSegments.has(segment))) return false;
  if (name === '.env.example') return true;
  if (name === '.env' || name.startsWith('.env.') || name === '.dev.vars') return false;
  if (name.endsWith('.log') || name.endsWith('.tsbuildinfo') || name.endsWith('.local')) return false;
  if (path === 'src/routeTree.gen.ts' || name === 'MIGRATION_REPORT.md') return false;
  if (/\.(pem|key|p12|pfx)$/.test(name)) return false;
  return true;
}