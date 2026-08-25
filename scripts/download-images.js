/**
 * One-time script: downloads every image the frontend currently pulls from
 * external URLs (Unsplash stock placeholders + the client's real WordPress-
 * hosted specialist photos) and saves them locally under public/images/.
 *
 * The HTML files already reference the local paths — this script just needs
 * to actually populate those files. Run this once after cloning, and again
 * any time you add new entries to image-manifest.json.
 *
 * Usage:
 *   node scripts/download-images.js
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const manifest = require("./image-manifest.json");
const publicDir = path.join(__dirname, "..", "public");

function download(url, destPath) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(destPath);
    fs.mkdirSync(dir, { recursive: true });

    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          // Follow one redirect
          return download(res.headers.location, destPath).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        const file = fs.createWriteStream(destPath);
        res.pipe(file);
        file.on("finish", () => file.close(() => resolve(destPath)));
      })
      .on("error", reject);
  });
}

async function main() {
  console.log(`Downloading ${manifest.length} images...\n`);
  let ok = 0;
  let failed = [];

  for (const entry of manifest) {
    const destPath = path.join(publicDir, entry.localPath);
    try {
      await download(entry.url, destPath);
      console.log(`✓ ${entry.localPath}`);
      ok++;
    } catch (err) {
      console.error(`✗ ${entry.localPath} — ${err.message}`);
      failed.push(entry);
    }
  }

  console.log(`\nDone: ${ok}/${manifest.length} downloaded.`);
  if (failed.length) {
    console.log(`\n${failed.length} failed — likely the stock placeholder URLs (Unsplash) or the`);
    console.log(`real client photo URLs (wailamtech) have changed/expired. For "real-client-photo"`);
    console.log(`entries, ask the client to re-send those specific images instead of retrying.`);
    console.log(failed.map((f) => `  - ${f.localPath} (${f.url})`).join("\n"));
  }
}

main();
