import { existsSync, mkdirSync, writeFileSync, cpSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));
export function packageRelease(release) {
  if (!/^[a-f0-9]{40}$/.test(release)) throw new Error('发布版本必须是完整 Git commit SHA');
  if (!existsSync(resolve(root, 'dist/index.html'))) throw new Error('请先构建网站');
  mkdirSync(resolve(root, 'deploy/dist'), { recursive: true });
  writeFileSync(resolve(root, 'dist/version.json'), JSON.stringify({ release }) + '\n');
  const archive = resolve(root, `deploy/dist/release-${release}.tar.gz`);
  if (!existsSync(resolve(root, 'backend-dist/index.cjs'))) throw new Error('请先 npm run build:server');
  const staging=resolve(root,`deploy/dist/package-${release}`);
  mkdirSync(staging,{recursive:true});
  cpSync(resolve(root,'dist'),resolve(staging,'dist'),{recursive:true});
  cpSync(resolve(root,'backend-dist'),resolve(staging,'backend'),{recursive:true});
  const result = spawnSync('tar', ['-czf', archive, 'dist', 'backend'], { cwd: staging, stdio: 'inherit' });
  if (result.status !== 0) throw new Error('发布包生成失败');
  return archive;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  packageRelease(process.argv[2]);
}
