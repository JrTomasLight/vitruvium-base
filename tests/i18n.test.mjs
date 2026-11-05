/**
 * Локализация: каждый ключ VITRUVIUM.*, упомянутый в коде и шаблонах,
 * есть в lang/ru.json. Ловит опечатки и забытые строки до запуска Foundry.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { LANG, ROOT, lookup } from "./helpers/foundry.mjs";
import { VITRUVIUM } from "../module/config.mjs";

function filesIn(dir, ext) {
  return fs.readdirSync(path.join(ROOT, dir), { recursive: true })
    .filter(file => file.endsWith(ext))
    .map(file => path.join(ROOT, dir, file));
}

/**
 * Ключи в кавычках: "VITRUVIUM.Sheet.Budget". После VITRUVIUM. ключ идёт с заглавной
 * буквы, так он не путается с объектами конфига (VITRUVIUM.dice.faces).
 * Шаблонные строки с ${} пропускаются.
 */
function keysIn(file) {
  const text = fs.readFileSync(file, "utf8");
  return [...text.matchAll(/["'`](VITRUVIUM\.[A-Z][A-Za-z0-9_.]*)["'`]/g)].map(m => m[1]);
}

describe("Локализация", () => {
  const files = [...filesIn("module", ".mjs"), ...filesIn("templates", ".hbs")];

  for ( const file of files ) {
    const keys = keysIn(file);
    if ( !keys.length ) continue;
    it(path.relative(ROOT, file), () => {
      const missing = keys.filter(key => typeof lookup(key) !== "string");
      assert.deepEqual(missing, [], `нет в ru.json: ${missing.join(", ")}`);
    });
  }

  it("подписи всех граней кубика (VITRUVIUM.Die.FaceN)", () => {
    for ( const successes of new Set(VITRUVIUM.dice.faces) ) {
      assert.equal(typeof lookup(`VITRUVIUM.Die.Face${successes}`), "string", `Face${successes}`);
    }
  });

  it("названия типов документов", () => {
    assert.equal(typeof LANG.TYPES?.Actor?.character, "string");
  });

  it("в ru.json нет пустых строк", () => {
    const empty = [];
    const walk = (node, prefix) => {
      for ( const [key, value] of Object.entries(node) ) {
        const full = prefix ? `${prefix}.${key}` : key;
        if ( typeof value === "string" ) { if ( !value.trim() ) empty.push(full); }
        else walk(value, full);
      }
    };
    walk(LANG, "");
    assert.deepEqual(empty, []);
  });
});
