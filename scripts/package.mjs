/**
 * Сборка архива системы vitruvium.zip — того, что ставится в Foundry.
 *
 *   npm run package                              — собрать архив с версией из system.json
 *   node scripts/package.mjs --version 0.2.0 --out . — версия 0.2.0, архив в текущую папку
 *                                                    (так делает workflow релиза)
 *
 * Без --out архив кладётся во временную папку системы: внутри проекта папки
 * для сборки нет в .gitignore, и собранный архив не должен попасть в git.
 * Рядом с vitruvium.zip ложится system.json с той же версией.
 *
 * Список файлов архива задан здесь, в PACKAGE_FILES. Его же проверяет автотест
 * tests/package.test.mjs: всё, на что ссылаются system.json и код, должно попасть в архив.
 * Нужна программа zip (на GitHub она есть; в Windows — через Git Bash или WSL).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Файлы и папки системы, которые попадают в архив. Всё остальное — для разработки. */
export const PACKAGE_FILES = [
  "system.json",
  "module",
  "lang",
  "styles",
  "templates",
  "fonts",
  "assets",
  "journals",
  "README.md",
  "CHANGELOG.md"
];

/**
 * Манифест для архива: версия и ссылка на архив именно этого релиза.
 * @param {object} manifest  Содержимое system.json.
 * @param {string} [version]  Версия без «v». Без неё манифест не меняется.
 * @returns {object}
 */
export function releaseManifest(manifest, version) {
  if ( !version ) return manifest;
  const repo = manifest.url.replace("https://github.com/", "");
  return {
    ...manifest,
    version,
    download: `https://github.com/${repo}/releases/download/v${version}/vitruvium.zip`
  };
}

/** Значение ключа командной строки: `--out папка`. */
function option(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index > 0 ? process.argv[index + 1] : undefined;
}

function main() {
  const version = option("version")?.replace(/^v/, "");
  const dist = path.resolve(option("out") ?? path.join(os.tmpdir(), "vitruvium-package"));
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), "vitruvium-stage-"));
  fs.mkdirSync(dist, { recursive: true });
  fs.rmSync(path.join(dist, "vitruvium.zip"), { force: true });

  for ( const file of PACKAGE_FILES ) {
    fs.cpSync(path.join(ROOT, file), path.join(stage, file), { recursive: true });
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "system.json"), "utf8"));
  const released = releaseManifest(manifest, version);
  const json = `${JSON.stringify(released, null, 2)}\n`;
  fs.writeFileSync(path.join(stage, "system.json"), json);
  fs.writeFileSync(path.join(dist, "system.json"), json);

  // Файлы лежат в корне архива: Foundry сам распакует их в папку systems/vitruvium.
  const zip = path.join(dist, "vitruvium.zip");
  execFileSync("zip", ["-r", "-q", "-X", zip, "."], { cwd: stage, stdio: "inherit" });
  fs.rmSync(stage, { recursive: true });
  const size = (fs.statSync(zip).size / 1024).toFixed(0);
  console.log(`${zip} (${size} КБ), версия ${released.version}`);
}

if ( process.argv[1] === fileURLToPath(import.meta.url) ) main();
