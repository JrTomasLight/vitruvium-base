/**
 * Журналы системы в мире Foundry: «Изменения системы» и «Правила Beta 3.1».
 *
 * Источники лежат в папке системы:
 * - CHANGELOG.md — журнал изменений, его пишут руками;
 * - journals/rules.json — правила, собранные из docx (npm run build:rules).
 *
 * При загрузке мира активный мастер сверяет журналы с источниками: создаёт
 * недостающие и переписывает страницы, если источник изменился (сравнивается отпечаток).
 * Компендиум здесь не подходит: его база LevelDB лежала бы в папке системы, Foundry
 * пишет в неё при каждом запуске, и это ломало бы `git pull` у тех, кто ставит систему через git.
 */
import { hashText, markdownToPages } from "./markdown.mjs";

const SCOPE = "vitruvium";
const SETTING = "syncJournals";

/** Журналы системы: ключ, название, загрузчик страниц. */
export const SYSTEM_JOURNALS = [
  { key: "changelog", name: "VITRUVIUM.Journals.Changelog", load: loadChangelog },
  { key: "rules", name: "VITRUVIUM.Journals.Rules", load: loadRules }
];

/** Настройка мира: обновлять журналы системы или нет. */
export function registerJournalSettings() {
  game.settings.register(SCOPE, SETTING, {
    name: "VITRUVIUM.Journals.Setting.Name",
    hint: "VITRUVIUM.Journals.Setting.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
}

/**
 * Страницы журнала изменений из текста CHANGELOG.md.
 * Вступление до первого `##` идёт в начало первой страницы.
 * @param {string} markdown
 * @returns {{name: string, content: string}[]}
 */
export function changelogPages(markdown) {
  const { intro, pages } = markdownToPages(markdown);
  if ( intro && pages.length ) pages[0] = { ...pages[0], content: `${intro}\n${pages[0].content}` };
  return pages;
}

/**
 * Данные страниц для Foundry.
 * @param {{name: string, content: string}[]} pages
 * @returns {object[]}
 */
export function pageData(pages) {
  return pages.map((page, index) => ({
    name: page.name,
    type: "text",
    sort: (index + 1) * 1000,
    text: { content: page.content, format: 1 }  // CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML
  }));
}

/**
 * Что сделать с журналом.
 * @param {{getFlag: Function}|undefined} entry  Уже существующий журнал.
 * @param {string} hash  Отпечаток источника.
 * @returns {"create"|"update"|"skip"}
 */
export function planJournal(entry, hash) {
  if ( !entry ) return "create";
  return entry.getFlag(SCOPE, "hash") === hash ? "skip" : "update";
}

/** Прочитать файл из папки системы. Кэш браузера обходим: после `git pull` версия не меняется. */
async function fetchSystemFile(file) {
  const url = foundry.utils.getRoute(`systems/${game.system.id}/${file}`);
  const response = await fetch(url, { cache: "no-cache" });
  if ( !response.ok ) throw new Error(`${file}: ${response.status} ${response.statusText}`);
  return response;
}

async function loadChangelog() {
  const response = await fetchSystemFile("CHANGELOG.md");
  return changelogPages(await response.text());
}

async function loadRules() {
  const response = await fetchSystemFile("journals/rules.json");
  return (await response.json()).pages;
}

/** Папка «Витрувий» для журналов системы. */
async function systemFolder() {
  const existing = game.folders.find(f => (f.type === "JournalEntry") && f.getFlag(SCOPE, "systemFolder"));
  if ( existing ) return existing;
  return foundry.documents.Folder.create({
    name: game.i18n.localize("VITRUVIUM.SystemTitle"),
    type: "JournalEntry",
    flags: { [SCOPE]: { systemFolder: true } }
  });
}

/**
 * Создать или обновить один журнал.
 * @returns {Promise<boolean>}  true, если журнал создан или обновлён.
 */
async function syncJournal({ key, name, load }) {
  const pages = await load();
  const data = pageData(pages);
  const hash = hashText(JSON.stringify(data));
  const entry = game.journal.find(j => j.getFlag(SCOPE, "journal") === key);
  const action = planJournal(entry, hash);
  if ( action === "skip" ) return false;

  if ( action === "create" ) {
    const folder = await systemFolder();
    await foundry.documents.JournalEntry.create({
      name: game.i18n.localize(name),
      folder: folder?.id,
      ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER },
      flags: { [SCOPE]: { journal: key, hash } },
      pages: data
    });
  }
  else {
    await entry.deleteEmbeddedDocuments("JournalEntryPage", entry.pages.map(p => p.id));
    await entry.createEmbeddedDocuments("JournalEntryPage", data);
    await entry.setFlag(SCOPE, "hash", hash);
  }
  return true;
}

/** Сверить все журналы системы. Вызывается в хуке `ready`. */
export async function syncSystemJournals() {
  if ( !game.users.activeGM?.isSelf ) return;
  if ( !game.settings.get(SCOPE, SETTING) ) return;

  for ( const journal of SYSTEM_JOURNALS ) {
    try {
      if ( await syncJournal(journal) ) {
        const name = game.i18n.localize(journal.name);
        ui.notifications.info(game.i18n.format("VITRUVIUM.Journals.Updated", { name }));
      }
    }
    catch ( err ) {
      console.error(`Витрувий | Журнал ${journal.key} не обновлён`, err);
      const name = game.i18n.localize(journal.name);
      ui.notifications.warn(game.i18n.format("VITRUVIUM.Journals.Failed", { name }));
    }
  }
}
