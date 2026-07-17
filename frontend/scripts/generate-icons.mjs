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

// Parallélisation des opérations pour éliminer io-in-loop
await Promise.all(
  sizes.map((size) =>
    sharp(SRC)
      .resize(size, size)
      .toFile(join(DEST, `icon-${size}.png`))
      .then(() => {
        process.stdout.write(`✅ icon-${size}.png\n`);
      })
  )
);

// Apple touch icon (180px)
await sharp(SRC).resize(180, 180).toFile(join(DEST, 'apple-touch-icon.png'));
process.stdout.write('✅ apple-touch-icon.png\n');

// Favicon (32px)
await sharp(SRC).resize(32, 32).toFile(join(DEST, 'favicon-32.png'));
process.stdout.write('✅ favicon-32.png\n');

process.stdout.write('\n🎉 Toutes les icônes PWA générées !\n');
