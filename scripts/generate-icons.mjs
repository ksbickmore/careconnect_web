import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const iconDirectory = resolve('public/icons');
const source = await readFile(resolve(iconDirectory, 'app-icon.svg'));

await mkdir(iconDirectory, { recursive: true });
await Promise.all(
  [
    ['icon-192.png', 192],
    ['icon-512.png', 512],
    ['icon-maskable-512.png', 512],
    ['apple-touch-icon.png', 180],
  ].map(([name, size]) =>
    sharp(source).resize(Number(size), Number(size)).png().toFile(resolve(iconDirectory, String(name))),
  ),
);
