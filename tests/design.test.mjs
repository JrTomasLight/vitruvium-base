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

/**
 * Токены одной темы: блок `:root, .theme-dark { ... }` или `.theme-light { ... }`.
 * @param {string} selector  Начало селектора блока.
 * @returns {(name: string) => string}  Значение цвета по имени без префикса --vit-.
 */
function theme(selector) {
  const start = tokensCss.indexOf(`${selector} {`);
  assert.ok(start >= 0, `нет блока темы ${selector}`);
  const block = tokensCss.slice(start, tokensCss.indexOf("}", start));
  return name => {
    const match = new RegExp(`--vit-${name}:\\s*(#[0-9a-f]{6})`, "i").exec(block);
    assert.ok(match, `${selector}: нет токена --vit-${name}`);
    return match[1];
  };
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

const THEMES = { "тёмная": theme(":root,\n.theme-dark"), "светлая": theme(".theme-light") };

describe("Контраст палитры (WCAG), обе темы", () => {
  for ( const [label, token] of Object.entries(THEMES) ) {
    const check = (fg, bg, min) => it(`${label}: ${fg} на ${bg} ≥ ${min}:1`, () => {
      const ratio = contrast(token(fg), token(bg));
      assert.ok(ratio >= min, `${ratio.toFixed(2)}:1`);
    });

    // Текст на основе и на подложках: не меньше 4.5:1.
    for ( const fg of ["color-text", "color-text-muted", "color-accent", "color-success", "color-failure"] ) {
      for ( const bg of ["color-bg", "color-bg-raised"] ) check(fg, bg, 4.5);
    }
    // Контуры кнопок и полей, набранные отметки, фокус: не меньше 3:1.
    for ( const fg of ["color-control", "color-mark", "color-focus"] ) check(fg, "color-bg", 3);
    // Текст на золотой кнопке.
    check("color-on-accent", "color-accent-fill", 4.5);
    // Шапка листа и карточек: текст и подписи, звёзды и их контуры.
    for ( const bg of ["band-from", "band-to"] ) {
      check("band-text", bg, 4.5);
      check("band-muted", bg, 4.5);
      check("color-accent-fill", bg, 3);
      check("band-line", bg, 3);
    }
    // Значок в кружке.
    check("chip-icon", "chip-bg", 3);
  }

  it("нет чисто чёрного и чисто белого", () => {
    assert.doesNotMatch(tokensCss, /#000000|#ffffff|#000\b|#fff\b/i);
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
