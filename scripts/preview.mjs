/**
 * Превью оформления системы без Foundry: лист персонажа, окна и карточки чата
 * со стилями и шаблонами системы. Делает скриншоты и проверяет доступность (axe-core).
 *
 *   npm run preview                 — превью и скриншоты во временную папку
 *   npm run preview -- --out папка  — в указанную папку
 *   npm run preview -- --no-shots   — только страница index.html, без браузера
 *
 * Нужны пакеты (npm ci) и Chromium для Playwright (npx playwright install chromium).
 *
 * Данные для шаблонов готовит настоящий код системы: проверки, действия, лист и
 * библиотека макросов запускаются на заглушках Foundry (tests/helpers/foundry.mjs),
 * а шаблоны рендерит Handlebars с упрощёнными хелперами Foundry. Поэтому превью
 * показывает то же, что увидит игрок, кроме оформления самого Foundry: окна здесь —
 * упрощённая рамка, шрифты и стили ядра Foundry не подключены.
 *
 * Выход с ошибкой, если axe-core нашёл нарушения уровня serious или critical.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import Handlebars from "handlebars";
import { FakeActor, installFoundry, LANG } from "../tests/helpers/foundry.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "system.json"), "utf8"));

/** Font Awesome для значков: в Foundry он встроен, здесь подключается с CDN. */
const FONT_AWESOME = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css";

/** Портрет-заглушка: силуэт в тонах бумаги. */
const PORTRAIT = `data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='#e6d6b2'/>"
  + "<circle cx='50' cy='38' r='17' fill='#b9a37c'/><path d='M18 96c3-22 17-33 32-33s29 11 32 33z' fill='#b9a37c'/></svg>"
)}`;

function option(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index > 0 ? process.argv[index + 1] : undefined;
}

/* -------------------------------------------- */
/*  Handlebars с хелперами Foundry              */
/* -------------------------------------------- */

const lookup = key => key.split(".").reduce((node, part) => node?.[part], LANG);

/** Упрощённые хелперы Foundry v13, которые встречаются в шаблонах системы. */
function registerHelpers() {
  Handlebars.registerHelper("localize", (key, options) => {
    const text = lookup(key);
    if ( typeof text !== "string" ) return key;
    const data = options.hash ?? {};
    return text.replace(/\{(\w+)\}/g, (_, name) => String(data[name]));
  });
  Handlebars.registerHelper("selectOptions", (choices, options) => {
    const selected = String(options.hash.selected ?? "");
    const html = Object.entries(choices).map(([value, label]) => {
      const attr = value === selected ? " selected" : "";
      return `<option value="${Handlebars.escapeExpression(value)}"${attr}>${Handlebars.escapeExpression(label)}</option>`;
    }).join("");
    return new Handlebars.SafeString(html);
  });
  Handlebars.registerHelper("formInput", (field, options) => {
    const { name, enriched = "" } = options.hash;
    return new Handlebars.SafeString(
      `<prose-mirror name="${name}" toggled><div class="editor-content">${enriched}</div></prose-mirror>`
    );
  });
}

const templates = new Map();
function render(template, data) {
  if ( !templates.has(template) ) {
    const file = path.join(ROOT, template.replace("systems/vitruvium/", ""));
    templates.set(template, Handlebars.compile(fs.readFileSync(file, "utf8")));
  }
  return templates.get(template)(data);
}

/* -------------------------------------------- */
/*  Данные из кода системы                      */
/* -------------------------------------------- */

/**
 * Запустить код системы на заглушках и собрать готовые куски HTML.
 * @returns {Promise<{id: string, title: string, kind: string, html: string}[]>}
 */
async function collectSamples() {
  const env = await installFoundry({ seed: 7 });

  // Шаблоны рендерит настоящий Handlebars, а не заглушка тестов.
  foundry.applications.handlebars.renderTemplate = async (template, data) => render(template, data);

  // Окна DialogV2: запоминаем настройки и сразу «закрываем».
  const dialogs = [];
  foundry.applications.api.DialogV2.wait = async config => { dialogs.push(config); return null; };

  // Базовые классы ApplicationV2 для листа и библиотеки макросов.
  class ApplicationV2 {
    constructor(options = {}) { this.options = options; this.document = options.document; }
    get isEditable() { return true; }
    async _prepareContext() { return {}; }
    async _preparePartContext(partId, context) { return context; }
  }
  foundry.applications.api.ApplicationV2 = ApplicationV2;
  foundry.applications.api.HandlebarsApplicationMixin = Base => Base;
  foundry.applications.sheets = { ActorSheetV2: ApplicationV2 };
  foundry.applications.ux.TextEditor = { implementation: { enrichHTML: async html => html } };

  const samples = [];
  const actor = sampleActor();

  // Лист персонажа: шапка, вкладки и вкладка «Характеристики».
  const { VitruviumCharacterSheet } = await import("../module/sheets/character-sheet.mjs");
  const sheet = new VitruviumCharacterSheet({ document: actor });
  const context = await sheet._prepareContext({});
  const parts = [];
  for ( const [partId, part] of Object.entries(VitruviumCharacterSheet.PARTS) ) {
    const partContext = await sheet._preparePartContext(partId, { ...context }, {});
    parts.push(render(part.template, partContext));
  }
  samples.push(windowSample({
    id: "sheet", title: actor.name, icon: "fa-solid fa-user",
    classes: VitruviumCharacterSheet.DEFAULT_OPTIONS.classes, width: 640, html: parts.join("\n"), kind: "sheet"
  }));

  // Библиотека макросов: окно мастера, видны обе группы.
  game.user.isGM = true;
  const { MacroLibrary } = await import("../module/apps/macro-library.mjs");
  const library = new MacroLibrary();
  const libraryContext = await library._prepareContext({});
  for ( const group of libraryContext.groups ) {
    for ( const entry of group.entries ) entry.img = iconURL(entry.img);
  }
  samples.push(windowSample({
    id: "macro-library", title: lookup(MacroLibrary.DEFAULT_OPTIONS.window.title),
    icon: MacroLibrary.DEFAULT_OPTIONS.window.icon, classes: MacroLibrary.DEFAULT_OPTIONS.classes,
    width: 480, html: render(MacroLibrary.PARTS.list.template, libraryContext), kind: "app"
  }));
  game.user.isGM = false;

  // Окна: проверка, заявка, бросок кубиков.
  const { promptCheck } = await import("../module/dice/check-dialog.mjs");
  const { promptDeclaration } = await import("../module/actions/declaration.mjs");
  const { promptDice } = await import("../module/actions/dice.mjs");
  await promptCheck({ actor, characteristic: "will" });
  await promptDeclaration(actor);
  await promptDice();
  const dialogIds = ["check-dialog", "declaration-dialog", "dice-dialog"];
  dialogs.forEach((config, index) => samples.push(dialogSample(dialogIds[index], config)));

  // Карточки чата: настоящие броски с заданными гранями.
  const { rollCheck, rollDice } = await import("../module/dice/check.mjs");
  const { actions } = await import("../module/actions/index.mjs");
  const chat = [];
  const lastCard = () => env.messages.at(-1).content;

  env.queueFaces([6, 4, 2, 5, 4, 1]);
  await rollCheck({ actor, label: "Воля", dice: 3, difficulty: 3, advantages: 1 });
  chat.push({ id: "card-check-success", title: "Проверка с преимуществом: успех", html: lastCard() });

  env.queueFaces([1, 2, 4]);
  await rollCheck({ actor, label: "Внимание", dice: 3, difficulty: 4 });
  chat.push({ id: "card-check-failure", title: "Проверка: провал", html: lastCard() });

  env.queueFaces([6, 5, 1, 4]);
  await rollDice({ actor, label: "Бросок кубиков", dice: 4 });
  chat.push({ id: "card-dice", title: "Свободный бросок", html: lastCard() });

  await actions.declare({ actor, action: "Перелезаю через стену монастыря", goal: "Попасть во двор незамеченным" });
  chat.push({ id: "card-declaration", title: "Заявка", html: lastCard() });

  game.user.isGM = true;
  const full = new FakeActor({ name: "Марта", system: { inspiration: { value: 6, max: 6 } } });
  await actions.awardInspiration({ actors: [actor, full] });
  chat.push({ id: "card-inspiration", title: "Вдохновение", html: lastCard() });

  for ( const card of chat ) {
    samples.push({ ...card, kind: "chat", html: `<li class="chat-message message"><div class="message-content">${card.html}</div></li>` });
  }
  return samples;
}

/** Персонаж для превью: характеристики разных уровней, часть вдохновения. */
function sampleActor() {
  const { characteristics, tiers } = CONFIG.VITRUVIUM;
  const levels = [2, 1, 3, 2, 1, 2];
  const system = {
    concept: "Капитан «Эльскаринны», упрямый и честный",
    tier: Object.keys(tiers)[1],
    inspiration: { value: 2, max: 6 },
    characteristics: Object.fromEntries(Object.keys(characteristics).map((key, i) => [key, { value: levels[i] }])),
    biography: "<p>Тридцать лет водит торговые суда по северным морям.</p>",
    schema: { fields: { biography: {} } }
  };
  const spent = levels.reduce((sum, level) => sum + (level - 1), 0);
  const budget = Object.values(tiers)[1].budget;
  system.creation = { characteristics: { budget, spent, remaining: budget - spent, overspent: spent > budget } };
  const actor = new FakeActor({ name: "Отто Хорн", system });
  actor.img = PORTRAIT;
  return actor;
}

/** Путь systems/vitruvium/... → адрес файла на диске. */
function iconURL(src) {
  return pathToFileURL(path.join(ROOT, src.replace("systems/vitruvium/", ""))).href;
}

/** Рамка окна ApplicationV2 (упрощённая). */
function windowSample({ id, title, icon, classes, width, html, kind }) {
  return {
    id, title, kind,
    html: `<div class="application ${classes.join(" ")}" style="width:${width}px">
  <header class="window-header"><i class="window-icon ${icon}" inert></i><h1 class="window-title">${title}</h1></header>
  <section class="window-content">${html}</section>
</div>`
  };
}

/** Окно DialogV2 с кнопками из настроек окна. */
function dialogSample(id, config) {
  const buttons = config.buttons.map(button => `<button type="${button.default ? "submit" : "button"}" data-action="${button.action}"${button.default ? " autofocus" : ""}>
      <i class="${button.icon}" inert></i><span>${button.label}</span></button>`).join("\n");
  return {
    id, title: config.window.title, kind: "dialog",
    html: `<form class="application dialog ${config.classes.join(" ")}" style="width:${config.position.width}px">
  <header class="window-header"><i class="window-icon ${config.window.icon}" inert></i><h1 class="window-title">${config.window.title}</h1></header>
  <section class="window-content">
    <div class="dialog-content standard-form">${config.content}</div>
    <footer class="form-footer">${buttons}</footer>
  </section>
</form>`
  };
}

/* -------------------------------------------- */
/*  Страница превью                             */
/* -------------------------------------------- */

function page(samples, theme) {
  const styles = manifest.styles.map(file => `<link rel="stylesheet" href="${pathToFileURL(path.join(ROOT, file)).href}">`).join("\n");
  const groups = [
    ["sheet", "Лист персонажа"], ["dialog", "Окна"], ["app", "Библиотека макросов"], ["chat", "Карточки чата"]
  ];
  const sections = groups.map(([kind, heading]) => {
    const items = samples.filter(s => s.kind === kind).map(s => `<figure class="sample" id="${s.id}" data-title="${s.title}">
  <figcaption>${s.title}</figcaption>
  ${kind === "chat" ? `<ol class="chat-log">${s.html}</ol>` : s.html}
</figure>`).join("\n");
    return `<section class="group"><h2 class="group-title">${heading}</h2><div class="samples">${items}</div></section>`;
  }).join("\n");

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Витрувий — превью оформления</title>
<link rel="stylesheet" href="${FONT_AWESOME}">
${styles}
<style>
  /* Только для превью: фон и рамки окон вместо стилей ядра Foundry. */
  body { margin: 0; padding: 24px; font-family: sans-serif; }
  body.theme-dark { background: #23221f; color: #e7e1d4; }
  body.theme-light { background: #d9d4c7; color: #2a2620; }
  .group { margin-bottom: 32px; }
  .group-title { font-size: 18px; margin: 0 0 12px; }
  .samples { display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start; }
  .sample { margin: 0; }
  .sample > figcaption { font-size: 12px; opacity: 0.75; margin-bottom: 6px; }
  .application { display: flex; flex-direction: column; border: 1px solid #555; border-radius: 4px; overflow: hidden; }
  .application .window-header { display: flex; gap: 8px; align-items: center; padding: 6px 10px; background: #3a3833; color: #eee; }
  .application .window-title { font-size: 14px; margin: 0; font-weight: normal; }
  .chat-log { list-style: none; margin: 0; padding: 8px; width: 300px; background: #2f2d29; border-radius: 4px; }
  .chat-message { list-style: none; }
</style>
</head>
<body class="theme-${theme}">
<h1 style="font-size:20px;margin-top:0">Витрувий ${manifest.version}: превью оформления (${theme === "dark" ? "тёмная" : "светлая"} тема Foundry)</h1>
${sections}
</body>
</html>
`;
}

/* -------------------------------------------- */
/*  Скриншоты и доступность                     */
/* -------------------------------------------- */

async function shoot(out, samples) {
  const { chromium } = await import("playwright");
  const axeSource = fs.readFileSync(path.join(ROOT, "node_modules/axe-core/axe.min.js"), "utf8");
  const browser = await chromium.launch();
  const report = [];
  try {
    for ( const theme of ["dark", "light"] ) {
      const pageObj = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
      await pageObj.goto(pathToFileURL(path.join(out, `${theme}.html`)).href, { waitUntil: "load" });
      await pageObj.evaluate(() => document.fonts.ready);
      await pageObj.screenshot({ path: path.join(out, `${theme}.png`), fullPage: true });
      if ( theme === "dark" ) {
        for ( const sample of samples ) {
          await pageObj.locator(`#${sample.id}`).screenshot({ path: path.join(out, `${sample.id}.png`) });
        }
        await pageObj.addScriptTag({ content: axeSource });
        const results = await pageObj.evaluate(async () => {
          const res = await globalThis.axe.run(".sample", { resultTypes: ["violations"] });
          return res.violations.map(v => ({
            id: v.id, impact: v.impact, help: v.help,
            nodes: v.nodes.map(n => n.target.join(" ")).slice(0, 5)
          }));
        });
        report.push(...results);
      }
      await pageObj.close();
    }
  }
  finally {
    await browser.close();
  }
  return report;
}

async function main() {
  const out = path.resolve(option("out") ?? path.join(os.tmpdir(), "vitruvium-preview"));
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });

  registerHelpers();
  const samples = await collectSamples();
  for ( const theme of ["dark", "light"] ) fs.writeFileSync(path.join(out, `${theme}.html`), page(samples, theme));
  console.log(`Превью: ${pathToFileURL(path.join(out, "dark.html")).href}`);
  if ( process.argv.includes("--no-shots") ) return;

  const violations = await shoot(out, samples);
  const lines = violations.map(v => `- [${v.impact}] ${v.id}: ${v.help}\n  ${v.nodes.join("\n  ")}`);
  const summary = violations.length ? `Нарушения доступности (axe-core):\n${lines.join("\n")}` : "Нарушений доступности не найдено (axe-core).";
  fs.writeFileSync(path.join(out, "accessibility.txt"), `${summary}\n`);
  console.log(`Скриншоты: ${out}`);
  console.log(summary);
  if ( violations.some(v => ["serious", "critical"].includes(v.impact)) ) process.exitCode = 1;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
