import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS = path.join(__dirname, "uploads");
const DB_FILE = path.join(__dirname, "data.json");

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

async function convertImage(filePath, targetPath) {
  const inputBuffer = fs.readFileSync(filePath);
  const oldSize = inputBuffer.length;

  await sharp(inputBuffer)
    .rotate()
    .resize({
      width: 2560,
      height: 2560,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82, effort: 4 })
    .toFile(targetPath);

  const newSize = fs.statSync(targetPath).size;
  return { oldSize, newSize };
}

async function main() {
  console.log("--- Meglévő képek konvertálása WebP formátumba ---");

  if (!fs.existsSync(UPLOADS)) {
    console.log('Nincs "uploads" mappa, nincs mit konvertálni.');
    return;
  }

  const hasDb = fs.existsSync(DB_FILE);
  const db = hasDb
    ? JSON.parse(fs.readFileSync(DB_FILE, "utf8"))
    : { users: [], images: [] };
  let convertedCount = 0;
  let totalSavedBytes = 0;

  if (db.images && db.images.length > 0) {
    for (let i = 0; i < db.images.length; i++) {
      const img = db.images[i];
      const oldFilename = img.file;
      const ext = path.extname(oldFilename).toLowerCase();
      const baseName = path.basename(oldFilename, ext);
      const oldFilePath = path.join(UPLOADS, oldFilename);

      if (!fs.existsSync(oldFilePath)) {
        console.warn(`[!] A fájl nem található a lemezen: ${oldFilename}`);
        continue;
      }

      if (ext !== ".webp") {
        const newFilename = `${baseName}.webp`;
        const newFilePath = path.join(UPLOADS, newFilename);

        try {
          console.log(
            `[${i + 1}/${db.images.length}] Konvertálás: ${oldFilename} -> ${newFilename}...`,
          );
          const { oldSize, newSize } = await convertImage(
            oldFilePath,
            newFilePath,
          );
          const saved = oldSize - newSize;
          totalSavedBytes += Math.max(0, saved);

          if (oldFilePath !== newFilePath) {
            fs.unlinkSync(oldFilePath);
          }

          img.file = newFilename;
          convertedCount++;
          console.log(
            `  ✓ Kész (${formatBytes(oldSize)} -> ${formatBytes(newSize)}, megtakarítás: ${formatBytes(saved)})`,
          );
        } catch (err) {
          console.error(
            `  ✗ Hiba a(z) ${oldFilename} konvertálásakor:`,
            err.message,
          );
        }
      }
    }

    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  }

  // Ellenőrizzük az uploads mappában lévő egyéb nem-webp képeket is (ha lennének)
  const files = fs.readdirSync(UPLOADS);
  for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    if ([".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff"].includes(ext)) {
      const baseName = path.basename(f, ext);
      const oldFilePath = path.join(UPLOADS, f);
      const newFilename = `${baseName}.webp`;
      const newFilePath = path.join(UPLOADS, newFilename);

      if (!fs.existsSync(newFilePath)) {
        try {
          console.log(`[Egyéb fájl] Konvertálás: ${f} -> ${newFilename}...`);
          const { oldSize, newSize } = await convertImage(
            oldFilePath,
            newFilePath,
          );
          fs.unlinkSync(oldFilePath);
          console.log(
            `  ✓ Kész (${formatBytes(oldSize)} -> ${formatBytes(newSize)})`,
          );
        } catch (err) {
          console.error(`  ✗ Hiba a(z) ${f} konvertálásakor:`, err.message);
        }
      }
    }
  }

  console.log("--------------------------------------------------");
  console.log(
    `Összesen ${convertedCount} adatbázis-kép sikeresen konvertálva.`,
  );
  if (totalSavedBytes > 0) {
    console.log(`Tárhely megtakarítás: ${formatBytes(totalSavedBytes)}`);
  }
}

main().catch((err) => {
  console.error("Kritikus hiba a futtatás során:", err);
  process.exit(1);
});
