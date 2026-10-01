import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// 原图永久保留；衍生资源以内容哈希命名，修改插画后不会命中旧缓存。
const source = resolve('assets/illustrations');
const output = resolve('public/media');
await mkdir(output, { recursive: true });
const manifest = {};
let originalBytes = 0;
for (const filename of (await readdir(source)).filter(name => name.endsWith('.png')).sort()) {
  const id = filename.slice(0, -4);
  const input = await readFile(resolve(source, filename));
  const { width, height } = await sharp(input).metadata();
  const widths = id.startsWith('career-') ? [256, 512, 768] : [384, 768, 1152];
  const thumbnail = await sharp(input).resize(24).webp({ quality: 35 }).toBuffer();
  const entry = { width, height, originalBytes: input.length, placeholder: `data:image/webp;base64,${thumbnail.toString('base64')}`, avif: [], webp: [] };
  originalBytes += input.length;
  for (const size of widths) {
    for (const format of ['avif', 'webp']) {
      const pipeline = sharp(input).resize({ width: size, withoutEnlargement: true });
      const buffer = await (format === 'avif'
        ? pipeline.avif({ quality: 55, effort: 6, chromaSubsampling: '4:4:4' })
        : pipeline.webp({ quality: 80, effort: 6, smartSubsample: true })).toBuffer();
      const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 12);
      const file = `${id}-${size}-${hash}.${format}`;
      await writeFile(resolve(output, file), buffer);
      entry[format].push({ width: size, src: `/media/${file}`, bytes: buffer.length });
    }
  }
  manifest[id] = entry;
  console.log(`${id}: ${Math.round(input.length / 1024)} KB → ${entry.avif.map(v => `${v.width}w ${Math.round(v.bytes / 1024)}KB`).join(', ')}`);
}
await writeFile('src/domain/image-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(`Original total: ${(originalBytes / 1024 / 1024).toFixed(2)} MiB; generated ${(await stat('src/domain/image-manifest.json')).size} byte manifest`);
