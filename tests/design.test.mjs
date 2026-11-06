/**
 * Дизайн-система: контраст палитры по WCAG и наличие файлов
 * (стили из system.json, шрифты, иконки). Правила — в CLAUDE.md,
 * раздел «Принципы дизайна».
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./helpers/foundry.mjs";
import { PACKAGE_FILES } from "../scripts/package.mjs";

const tokensCss = fs.readFileSync(path.join(ROOT, "styles/tokens.css"), "utf8");

/** Значение токена-цвета из tokens.css. */
function token(name) {
  const match = new RegExp(`--vit-${name}:\\s*(#[0-9a-f]{6})`, "i").exec(tokensCss);
  assert.ok(match, `нет токена --vit-${name}`);
  return match[1];
}

/** Относительная яркость и контраст по WCAG 2.x. */
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("Контраст палитры (WCAG)", () => {
  const papers = ["parchment", "parchment-deep"];

  // Цвета, которыми пишут текст: не меньше 4.5:1 на обоих тонах бумаги.
  for ( const ink of ["ink", "ink-soft", "sanguine", "terre-verte", "azure"] ) {
    for ( const paper of papers ) {
      it(`текст ${ink} на ${paper} ≥ 4.5:1`, () => {
        const ratio = contrast(token(ink), token(paper));
        assert.ok(ratio >= 4.5, `${ratio.toFixed(2)}:1`);
      });
    }
  }

  // Фокус и контуры элементов управления: не меньше 3:1.
  for ( const paper of papers ) {
    it(`фокус (azure) на ${paper} ≥ 3:1`, () => assert.ok(contrast(token("azure"), token(paper)) >= 3));
  }

  it("сангина отличается от «глиняного» оранжевого: заметно темнее", () => {
    assert.ok(luminance(token("sanguine")) < luminance("#d97757") / 2);
  });
});

describe("Файлы дизайна на месте", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "system.json"), "utf8"));

  it("все стили из system.json существуют", () => {
    for ( const file of manifest.styles ) assert.ok(fs.existsSync(path.join(ROOT, file)), file);
  });

  it("токены подключаются раньше компонентов", () => {
    const order = manifest.styles;
    assert.ok(order.indexOf("styles/tokens.css") < order.indexOf("styles/components.css"));
  });

  it("все шрифты из fonts.css существуют, лицензия рядом", () => {
    const css = fs.readFileSync(path.join(ROOT, "styles/fonts.css"), "utf8");
    const urls = [...css.matchAll(/url\("\.\.\/(fonts\/[^"]+)"\)/g)].map(m => m[1]);
    assert.ok(urls.length > 0);
    for ( const url of urls ) assert.ok(fs.existsSync(path.join(ROOT, url)), url);
    assert.ok(fs.existsSync(path.join(ROOT, "fonts/OFL.txt")));
  });

  it("релиз включает шрифты и иконки", () => {
    assert.ok(PACKAGE_FILES.includes("fonts"));
    assert.ok(PACKAGE_FILES.includes("assets"));
  });
});
