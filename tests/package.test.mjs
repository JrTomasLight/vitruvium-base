/**
 * Манифест и архив системы: всё, на что ссылаются system.json и код,
 * существует и попадает в vitruvium.zip (scripts/package.mjs).
 * Ловит ошибки, из-за которых система не загрузится в Foundry вовсе.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./helpers/foundry.mjs";
import { PACKAGE_FILES, releaseManifest } from "../scripts/package.mjs";

const read = file => fs.readFileSync(path.join(ROOT, file), "utf8");
const manifest = JSON.parse(read("system.json"));

/** Все файлы папки (рекурсивно) с нужным расширением, пути от корня проекта. */
function filesIn(dir, ext) {
  return fs.readdirSync(path.join(ROOT, dir), { recursive: true })
    .filter(file => file.endsWith(ext))
    .map(file => path.join(dir, file).split(path.sep).join("/"));
}

/** Путь попадает в архив: лежит в одной из папок PACKAGE_FILES или совпадает с файлом оттуда. */
function packaged(file) {
  return PACKAGE_FILES.some(entry => (file === entry) || file.startsWith(`${entry}/`));
}

/** Путь существует и попадает в архив. */
function assertShipped(file, from) {
  assert.ok(fs.existsSync(path.join(ROOT, file)), `${from}: нет файла ${file}`);
  assert.ok(packaged(file), `${from}: ${file} не попадает в архив (scripts/package.mjs, PACKAGE_FILES)`);
}

/**
 * Пути `systems/vitruvium/...` в файле. Понимает константы вида
 * `const TEMPLATES = "systems/vitruvium/templates/actor"` и их подстановку `${TEMPLATES}/x.hbs`.
 */
function systemPathsIn(file) {
  const text = read(file);
  const constants = Object.fromEntries(
    [...text.matchAll(/const (\w+) = "(systems\/vitruvium\/[^"]+)"/g)].map(m => [m[1], m[2]])
  );
  const literal = [...text.matchAll(/["'`](systems\/vitruvium\/[^"'`$]+)["'`]/g)].map(m => m[1]);
  const substituted = [...text.matchAll(/`\$\{(\w+)\}\/([^`$]+)`/g)]
    .filter(m => constants[m[1]])
    .map(m => `${constants[m[1]]}/${m[2]}`);
  return [...literal, ...substituted].map(p => p.replace("systems/vitruvium/", ""));
}

describe("Манифест system.json", () => {
  it("id и совместимость: только Foundry v13", () => {
    assert.equal(manifest.id, "vitruvium");
    assert.deepEqual(manifest.compatibility, { minimum: "13", verified: "13.351", maximum: "13" });
  });

  it("в описании: разработка, фанатский проект, предупреждение о правах, авторы правил", () => {
    for ( const text of ["в разработке", "Фанатская некоммерческая", "правообладателям", "Георгий Воронин"] ) {
      assert.ok(manifest.description.includes(text), text);
    }
  });

  it("ссылки на репозиторий и релизы", () => {
    const repo = "https://github.com/JrTomasLight/vitruvium-base";
    assert.equal(manifest.url, repo);
    assert.equal(manifest.manifest, `${repo}/releases/latest/download/system.json`);
  });

  it("модули, стили и переводы существуют и попадают в архив", () => {
    const files = [...manifest.esmodules, ...manifest.styles, ...manifest.languages.map(l => l.path)];
    for ( const file of files ) assertShipped(file, "system.json");
  });

  it("каждый файл стилей подключён в system.json", () => {
    for ( const file of filesIn("styles", ".css") ) assert.ok(manifest.styles.includes(file), file);
  });
});

describe("Ссылки из кода", () => {
  const sources = [...filesIn("module", ".mjs"), ...filesIn("templates", ".hbs")];

  it("пути systems/vitruvium/... ведут к файлам из архива", () => {
    let count = 0;
    for ( const file of sources ) {
      for ( const target of systemPathsIn(file) ) {
        assertShipped(target, file);
        count++;
      }
    }
    assert.ok(count >= 10, `найдено слишком мало путей (${count}) — сломался поиск`);
  });

  it("файлы, которые система читает при загрузке мира, попадают в архив", () => {
    const fetched = [...read("module/journals/sync.mjs").matchAll(/fetchSystemFile\("([^"]+)"\)/g)].map(m => m[1]);
    assert.ok(fetched.length >= 2);
    for ( const file of fetched ) assertShipped(file, "module/journals/sync.mjs");
  });

  it("относительные импорты в module/ ведут к существующим файлам", () => {
    for ( const file of filesIn("module", ".mjs") ) {
      for ( const [, spec] of read(file).matchAll(/(?:import|export)[^"']*?from\s+["'](\.[^"']+)["']/g) ) {
        const target = path.join(path.dirname(file), spec).split(path.sep).join("/");
        assertShipped(target, file);
      }
    }
  });

  it("url(...) в стилях ведут к файлам из архива", () => {
    for ( const file of filesIn("styles", ".css") ) {
      for ( const [, url] of read(file).matchAll(/url\(["']?([^"')]+)["']?\)/g) ) {
        if ( /^(data:|https?:|#)/.test(url) ) continue;
        const target = path.join(path.dirname(file), url).split(path.sep).join("/");
        assertShipped(target, file);
      }
    }
  });
});

describe("Архив релиза", () => {
  it("содержит источники журналов и README", () => {
    for ( const file of ["CHANGELOG.md", "journals", "README.md"] ) assert.ok(PACKAGE_FILES.includes(file), file);
  });

  it("не содержит файлов для разработки", () => {
    for ( const file of ["tests", "scripts", "package.json", "docs", ".github"] ) {
      assert.ok(!PACKAGE_FILES.includes(file), file);
    }
  });

  it("версия из тега и ссылка на архив этого релиза", () => {
    const released = releaseManifest(manifest, "1.2.3");
    assert.equal(released.version, "1.2.3");
    assert.equal(released.download, "https://github.com/JrTomasLight/vitruvium-base/releases/download/v1.2.3/vitruvium.zip");
    assert.equal(released.manifest, manifest.manifest, "manifest остаётся ссылкой на последний релиз");
    assert.deepEqual(releaseManifest(manifest), manifest, "без версии манифест не меняется");
  });

  it("workflow релиза собирает архив этим же скриптом", () => {
    assert.match(read(".github/workflows/release.yml"), /node scripts\/package\.mjs --version/);
  });
});
