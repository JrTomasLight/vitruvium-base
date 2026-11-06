/**
 * Журналы системы: конвертер Markdown, журнал изменений, журнал правил.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./helpers/foundry.mjs";
import { hashText, markdownToPages, renderInline, renderMarkdown } from "../module/journals/markdown.mjs";
import { changelogPages, pageData, planJournal } from "../module/journals/sync.mjs";
import { rulesToPages, sentenceCase } from "../scripts/rules-html.mjs";

const read = file => fs.readFileSync(path.join(ROOT, file), "utf8");

describe("Markdown → HTML", () => {
  it("экранирует HTML", () => {
    assert.equal(renderInline("<script>&"), "&lt;script&gt;&amp;");
  });

  it("код, полужирный, курсив", () => {
    assert.equal(renderInline("**жирно** и *курсив* и _тоже_"), "<strong>жирно</strong> и <em>курсив</em> и <em>тоже</em>");
    assert.equal(renderInline("`3dv` и `a_b_c`"), "<code>3dv</code> и <code>a_b_c</code>");
  });

  it("подчёркивания внутри слова — не курсив", () => {
    assert.equal(renderInline("snake_case_name"), "snake_case_name");
  });

  it("ссылки только на веб-адреса", () => {
    assert.equal(renderInline("[Issues](https://github.com/x)"), '<a href="https://github.com/x">Issues</a>');
    assert.equal(renderInline("[план](ROADMAP.md)"), "план");
  });

  it("заголовки, абзацы и списки с продолжением строки", () => {
    const html = renderMarkdown("### Раздел\n\nабзац\nв две строки\n\n- один\n  продолжение\n- два");
    assert.equal(html, "<h3>Раздел</h3>\n<p>абзац в две строки</p>\n<ul><li>один продолжение</li><li>два</li></ul>");
  });

  it("страницы по заголовкам второго уровня", () => {
    const { title, intro, pages } = markdownToPages("# Журнал\n\nвступление\n\n## Первая\n\n### Раздел\n\n- а\n\n## Вторая\n\nб");
    assert.equal(title, "Журнал");
    assert.equal(intro, "<p>вступление</p>");
    assert.deepEqual(pages, [
      { name: "Первая", content: "<h2>Раздел</h2>\n<ul><li>а</li></ul>" },
      { name: "Вторая", content: "<p>б</p>" }
    ]);
  });

  it("отпечаток меняется вместе с текстом", () => {
    assert.equal(hashText("abc"), hashText("abc"));
    assert.notEqual(hashText("abc"), hashText("abd"));
    assert.match(hashText(""), /^[0-9a-f]{8}$/);
  });
});

describe("Журнал изменений (CHANGELOG.md)", () => {
  const markdown = read("CHANGELOG.md");
  const pages = changelogPages(markdown);
  const legend = ["✅", "🔧", "📄"];

  it("первая страница — легенда со вступлением", () => {
    assert.equal(pages[0].name, "Как читать");
    for ( const mark of legend ) assert.ok(pages[0].content.includes(mark), mark);
    assert.ok(pages[0].content.startsWith("<p>"), "вступление в начале страницы");
  });

  it("каждая запись начинается со знака из легенды", () => {
    for ( const page of pages.slice(1) ) {
      const items = [...page.content.matchAll(/<li>(.*?)<\/li>/g)].map(m => m[1]);
      assert.ok(items.length, `в разделе «${page.name}» нет записей`);
      for ( const item of items ) {
        assert.ok(legend.some(mark => item.startsWith(`${mark} `)), `${page.name}: «${item.slice(0, 60)}»`);
      }
    }
  });

  it("страницы для Foundry идут по порядку и в формате HTML", () => {
    const data = pageData(pages);
    assert.deepEqual(data.map(p => p.name), pages.map(p => p.name));
    assert.ok(data.every((p, i) => (p.type === "text") && (p.text.format === 1) && (i === 0 || p.sort > data[i - 1].sort)));
  });
});

describe("Обновление журналов", () => {
  const entry = hash => ({ getFlag: (scope, key) => (scope === "vitruvium" && key === "hash" ? hash : undefined) });

  it("нет журнала — создать, отпечаток другой — обновить, тот же — пропустить", () => {
    assert.equal(planJournal(undefined, "aaaa"), "create");
    assert.equal(planJournal(entry("bbbb"), "aaaa"), "update");
    assert.equal(planJournal(entry("aaaa"), "aaaa"), "skip");
  });
});

describe("Журнал правил (journals/rules.json)", () => {
  const journal = JSON.parse(read("journals/rules.json"));

  it("собран из текущего docx (иначе: npm run build:rules)", () => {
    const docx = fs.readFileSync(path.join(ROOT, journal.source));
    assert.equal(journal.sha256, crypto.createHash("sha256").update(docx).digest("hex"));
  });

  it("разделы правил на месте", () => {
    assert.deepEqual(journal.pages.map(p => p.name),
      ["О документе", "Игровые правила", "Персонаж", "Создание персонажа", "Ведение игры"]);
    assert.ok(journal.pages.every(p => p.content.length > 500));
  });

  it("на первой странице авторы правил и предупреждение о правах", () => {
    const about = journal.pages[0].content;
    for ( const text of ["Георгий Воронин", "Екатерина Ширманкина", "правообладателям", "Beta 3.1"] ) {
      assert.ok(about.includes(text), text);
    }
  });

  it("без картинок, якорей docx и заголовков ЗАГЛАВНЫМИ", () => {
    for ( const { name, content } of journal.pages ) {
      assert.ok(!/<img|href="#|\sstyle=|\sclass=/.test(content), name);
      for ( const [, heading] of content.matchAll(/<h\d>([^<]*)<\/h\d>/g) ) {
        assert.notEqual(heading, heading.toUpperCase(), `${name}: ${heading}`);
      }
    }
  });
});

describe("Сборка правил из HTML pandoc", () => {
  it("заголовки — обычным регистром, имена собственные — с заглавной", () => {
    assert.equal(sentenceCase("1. ПРИДУМАЙТЕ ПЕРСОНАЖА"), "1. Придумайте персонажа");
    assert.equal(sentenceCase("ОТТО ХОРН"), "Отто Хорн");
  });

  it("титул и оглавление отброшены, выходные данные — на первой странице", () => {
    const html = [
      '<p><img src="x.png" alt="Логотип" /></p>',
      '<p><a href="#a">ОГЛАВЛЕНИЕ 3</a></p>',
      '<h1 id="a">ИГРОВЫЕ ПРАВИЛА</h1>',
      '<h2 id="b">БРОСОК КУБИКОВ</h2>',
      '<p>Текст <a href="#b">ссылка</a>.</p>',
      '<p><img src="y.png" style="width:1in" alt="Пример листа" /></p>',
      "<p><strong>Версия:</strong> Beta 3.1</p>"
    ].join("\n");
    const pages = rulesToPages(html);
    assert.deepEqual(pages.map(p => p.name), ["О документе", "Игровые правила"]);
    assert.equal(pages[1].content,
      "<h2>Бросок кубиков</h2>\n<p>Текст ссылка.</p>\n<p><em>В документе правил здесь иллюстрация: Пример листа.</em></p>");
    assert.ok(pages[0].content.includes("<strong>Версия:</strong> Beta 3.1"));
    assert.ok(!pages[0].content.includes("Логотип"));
  });
});

describe("Релиз", () => {
  it("архив системы содержит источники журналов", () => {
    const zip = read(".github/workflows/release.yml").match(/zip -r vitruvium\.zip (.*)/)[1].split(/\s+/);
    for ( const file of ["CHANGELOG.md", "journals"] ) assert.ok(zip.includes(file), file);
  });
});

describe("Синхронизация журналов в мире (заглушки Foundry)", () => {
  /** Мир с журналами и папками; fetch отдаёт файлы из репозитория. */
  function installWorld({ gm = true, enabled = true } = {}) {
    const flagged = data => ({
      ...data,
      getFlag(scope, key) { return this.flags?.[scope]?.[key]; },
      async setFlag(scope, key, value) { this.flags[scope][key] = value; }
    });
    const world = { journals: [], folders: [], notices: [] };
    globalThis.game = {
      system: { id: "vitruvium" },
      users: { activeGM: { isSelf: gm } },
      settings: { get: () => enabled },
      i18n: { localize: key => key, format: (key, data) => `${key}:${data.name}` },
      journal: { find: fn => world.journals.find(fn) },
      folders: { find: fn => world.folders.find(fn) }
    };
    globalThis.ui = { notifications: { info: msg => world.notices.push(msg), warn: msg => world.notices.push(msg) } };
    globalThis.CONST = { DOCUMENT_OWNERSHIP_LEVELS: { OBSERVER: 2 } };
    globalThis.foundry = {
      utils: { getRoute: url => `/${url}` },
      documents: {
        Folder: { create: async data => { const f = flagged({ id: "folder1", ...data }); world.folders.push(f); return f; } },
        JournalEntry: {
          create: async data => {
            const entry = flagged({ ...data, pages: data.pages.map((p, i) => ({ ...p, id: `p${i}` })) });
            entry.deleteEmbeddedDocuments = async (_, ids) => { entry.pages = entry.pages.filter(p => !ids.includes(p.id)); };
            entry.createEmbeddedDocuments = async (_, pages) => { entry.pages.push(...pages); };
            world.journals.push(entry);
            return entry;
          }
        }
      }
    };
    globalThis.fetch = async url => {
      const file = url.replace("/systems/vitruvium/", "");
      return new Response(fs.readFileSync(path.join(ROOT, file)));
    };
    return world;
  }

  it("создаёт оба журнала в папке, видимых игрокам, второй раз ничего не делает", async () => {
    const { syncSystemJournals } = await import("../module/journals/sync.mjs");
    const world = installWorld();
    await syncSystemJournals();
    assert.deepEqual(world.journals.map(j => j.flags.vitruvium.journal), ["changelog", "rules"]);
    assert.ok(world.journals.every(j => (j.folder === "folder1") && (j.ownership.default === 2)));
    assert.equal(world.journals[1].pages[0].name, "О документе");
    assert.equal(world.notices.length, 2);

    await syncSystemJournals();
    assert.equal(world.journals.length, 2);
    assert.equal(world.folders.length, 1);
    assert.equal(world.notices.length, 2, "без изменений — без уведомлений");
  });

  it("переписывает страницы, если источник изменился", async () => {
    const { syncSystemJournals } = await import("../module/journals/sync.mjs");
    const world = installWorld();
    await syncSystemJournals();
    const changelog = world.journals[0];
    changelog.flags.vitruvium.hash = "old";
    changelog.pages = [{ id: "x", name: "Устаревшая" }];
    await syncSystemJournals();
    assert.equal(changelog.pages[0].name, "Как читать");
    assert.notEqual(changelog.flags.vitruvium.hash, "old");
  });

  it("не мастер или выключенная настройка — ничего не создаётся", async () => {
    const { syncSystemJournals } = await import("../module/journals/sync.mjs");
    for ( const options of [{ gm: false }, { enabled: false }] ) {
      const world = installWorld(options);
      await syncSystemJournals();
      assert.equal(world.journals.length, 0);
    }
  });
});
