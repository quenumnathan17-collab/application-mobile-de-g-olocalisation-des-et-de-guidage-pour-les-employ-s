/**
 * Script de génération des icônes PWA YA CONSULTING
 * Génère toutes les tailles requises à partir de icon-512.png
 */
import sharp from 'sharp';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC  = join(__dirname, '../public/icons/icon-512.png');
const DEST = join(__dirname, '../public/icons');

if (!existsSync(DEST)) mkdirSync(DEST, { recursive: true });

const sizes = [72, 96, 128, 144, 152, 192, 384];

for (const size of sizes) {
  await sharp(SRC)
    .resize(size, size)
    .toFile(join(DEST, `icon-${size}.png`));
  console.log(`✅ icon-${size}.png`);
}

// Apple touch icon (180px)
await sharp(SRC).resize(180, 180).toFile(join(DEST, 'apple-touch-icon.png'));
console.log('✅ apple-touch-icon.png');

// Favicon (32px)
await sharp(SRC).resize(32, 32).toFile(join(DEST, 'favicon-32.png'));
console.log('✅ favicon-32.png');

console.log('\n🎉 Toutes les icônes PWA générées !');
