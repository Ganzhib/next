import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { packageRelease, root } from './package-release.mjs';

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`${command} 执行失败`);
}
const configFile = resolve(root, 'deploy/deploy.config.json');
const local = existsSync(configFile) ? JSON.parse(readFileSync(configFile, 'utf8')) : {};
const host = process.env.DEPLOY_HOST || local.host;
const user = process.env.DEPLOY_USER || local.user || 'next-deploy';
const port = String(process.env.DEPLOY_PORT || local.port || 22);
const domain = process.env.DEPLOY_DOMAIN || local.domain;
const key = process.env.DEPLOY_IDENTITY_FILE || local.identityFile;
const releaseIndex = process.argv.indexOf('--release');
const release = releaseIndex >= 0 ? process.argv[releaseIndex + 1] :
  spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim();
if (!/^[a-f0-9]{40}$/.test(release)) throw new Error('无效发布版本');
if (!/^[a-zA-Z0-9][a-zA-Z0-9.-]*$/.test(host || '')) throw new Error('缺少或无效的服务器地址');
if (user !== 'next-deploy') throw new Error('请使用独立 next-deploy 账号，不使用 root 部署');
if (!/^\d+$/.test(port) || +port < 1 || +port > 65535) throw new Error('无效 SSH 端口');
if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(domain || '')) throw new Error('请填写完整域名');
if (!process.argv.includes('--skip-build')) {
  // 防止未提交改动以已有版本号发布，无法复现或回滚。
  const status = spawnSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' });
  if (status.status !== 0 || status.stdout.trim()) throw new Error('请先提交代码，再执行正式发布');
  if (process.platform === 'win32') run('cmd.exe', ['/d', '/s', '/c', 'npm run build']);
  else run('npm', ['run', 'build']);
  if (process.platform === 'win32') run('cmd.exe', ['/d', '/s', '/c', 'npm run build:server']);
  else run('npm', ['run', 'build:server']);
  packageRelease(release);
}
const archive = resolve(root, `deploy/dist/release-${release}.tar.gz`);
if (!existsSync(archive)) throw new Error('找不到此版本的发布包');
const common = ['-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o', 'ConnectTimeout=15'];
if (key) common.push('-i', key, '-o', 'IdentitiesOnly=yes');
const destination = `${user}@${host}`;
console.log(`发布 ${release.slice(0, 12)} → https://${domain}`);
if (process.argv.includes('--sync')) {
  // CI 复用线上未变化的插画，只传输校验和不同的文件。current 在校验前保持不变。
  const unpack = resolve(root, `deploy/dist/unpacked-${release}`);
  mkdirSync(unpack, { recursive: true });
  run('tar', ['-xzf', archive, '-C', unpack]);
  run('ssh', ['-p', port, ...common, destination, `mkdir -p /opt/next/incoming/${release}/dist`]);
  const transport = ['ssh', '-p', port, ...common].map(value => `'${value.replaceAll("'", "'\\''")}'`).join(' ');
  run('rsync', ['-rcz', '--safe-links', '--link-dest=/opt/next/current', '-e', transport,
    `${unpack}/dist/`, `${destination}:/opt/next/incoming/${release}/dist/`]);
  run('rsync', ['-rcz', '--safe-links', '-e', transport,
    `${unpack}/backend/`, `${destination}:/opt/next/incoming/${release}/backend/`]);
  run('ssh', ['-p', port, ...common, destination, `/usr/local/bin/next-activate ${release} --directory`]);
} else {
  run('scp', ['-P', port, ...common, archive, `${destination}:/opt/next/incoming/${release}.tar.gz`]);
  run('ssh', ['-p', port, ...common, destination, `/usr/local/bin/next-activate ${release}`]);
}
// 外网证书和版本必须都正确；失败不误报发布成功。
const response = await fetch(`https://${domain}/version.json?t=${Date.now()}`, { signal: AbortSignal.timeout(20000) });
if (!response.ok || (await response.json()).release !== release) throw new Error('公网 HTTPS 版本校验失败，请检查 DNS 和证书');
const health=await fetch(`https://${domain}/api/health`,{signal:AbortSignal.timeout(20000)});
if(!health.ok || !(await health.json()).ok) throw new Error('公网 API 健康检查失败');
console.log('发布完成，HTTPS 和线上版本校验通过。');
