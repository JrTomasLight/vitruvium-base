/**
 * Локальная резервная копия репозитория одним файлом.
 *
 *   npm run backup                         — в папку ../vitruvium-backups рядом с проектом
 *   npm run backup -- "D:\Backups\Vitruvium" — в указанную папку
 *
 * Копия — git bundle со всеми ветками и тегами (локальными и полученными с GitHub).
 * Незакоммиченные изменения в копию не попадают: сначала коммит, потом копия.
 * Папку с копиями держите вне проекта и лучше на облачном диске.
 * Восстановление описано в docs/BACKUP.md.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const git = (...args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();

const target = path.resolve(process.argv[2] ?? path.join(ROOT, "..", "vitruvium-backups"));
if ( target === ROOT || target.startsWith(ROOT + path.sep) ) {
  console.error("Папка для копий не должна быть внутри проекта: копия попадёт в git.");
  process.exit(1);
}

const dirty = git("status", "--porcelain");
if ( dirty ) console.warn("Внимание: есть незакоммиченные изменения, в копию они не попадут.\n");

const stamp = new Date().toISOString().slice(0, 16).replace("T", "-").replace(":", "");
const file = path.join(target, `vitruvium-backup-${stamp}-${git("rev-parse", "--short", "HEAD")}.bundle`);

fs.mkdirSync(target, { recursive: true });
git("bundle", "create", file, "--all");
git("bundle", "verify", file);

const size = (fs.statSync(file).size / 1024 / 1024).toFixed(1);
console.log(`Копия готова: ${file} (${size} МБ)`);
