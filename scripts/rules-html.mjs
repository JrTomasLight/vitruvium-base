/**
 * Превращает HTML правил, полученный из docx через pandoc, в страницы журнала Foundry.
 *
 * Чистые функции без Foundry и без pandoc, их покрывают автотесты.
 * Сборку журнала запускает scripts/build-rules.mjs.
 */

/** Имена собственные в заголовках: их нельзя приводить к обычному регистру целиком. */
const PROPER_NAMES = ["Отто Хорн"];

/**
 * Заголовок из ЗАГЛАВНЫХ букв → обычный регистр: «1. ПРИДУМАЙТЕ ПЕРСОНАЖА» → «1. Придумайте персонажа».
 * @param {string} text
 * @returns {string}
 */
export function sentenceCase(text) {
  const name = PROPER_NAMES.find(n => n.toUpperCase() === text.trim().toUpperCase());
  if ( name ) return name;
  const lower = text.trim().toLowerCase();
  return lower.replace(/\p{L}/u, letter => letter.toUpperCase());
}

/** Убрать теги, оставить текст. */
function stripTags(html) {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Почистить HTML от служебной разметки pandoc.
 * @param {string} html
 * @returns {string}
 */
export function cleanHTML(html) {
  return html
    // Иллюстрации не переносим: это графика правообладателей (логотип, интерфейс их приложения).
    .replace(/<p>\s*<img[^>]*alt="([^"]*)"[^>]*\/?>\s*<\/p>/g,
      (_, alt) => `<p><em>В документе правил здесь иллюстрация: ${alt}.</em></p>`)
    .replace(/<img[^>]*>/g, "")
    .replace(/<colgroup>[\s\S]*?<\/colgroup>\s*/g, "")
    .replace(/\s(?:id|class|style)="[^"]*"/g, "")
    // Ссылки оглавления docx на якоря внутри документа в журнале не работают.
    .replace(/<a href="#[^"]*">([\s\S]*?)<\/a>/g, "$1")
    .replace(/<(h[1-6])>([\s\S]*?)<\/\1>/g, (_, tag, inner) => `<${tag}>${sentenceCase(stripTags(inner))}</${tag}>`)
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/**
 * Разбить правила на страницы журнала.
 *
 * - Всё до первого заголовка первого уровня (логотип, титул, оглавление docx) отбрасывается:
 *   у журнала Foundry своё оглавление.
 * - Каждый раздел первого уровня («Игровые правила», «Персонаж»…) становится страницей.
 * - Выходные данные в конце документа (версия, авторы) уходят на первую страницу «О документе».
 *
 * @param {string} html  Вывод `pandoc -t html --wrap=none`.
 * @returns {{name: string, content: string}[]}
 */
export function rulesToPages(html) {
  const start = html.indexOf("<h1");
  if ( start < 0 ) throw new Error("В правилах не найдено ни одного раздела первого уровня");
  let body = html.slice(start);

  const creditsAt = body.search(/<p><strong>Версия:<\/strong>/);
  let credits = "";
  if ( creditsAt >= 0 ) {
    credits = body.slice(creditsAt);
    body = body.slice(0, creditsAt);
  }

  const pages = [];
  for ( const part of body.split(/(?=<h1)/) ) {
    const match = part.match(/^<h1[^>]*>([\s\S]*?)<\/h1>([\s\S]*)$/);
    if ( !match ) continue;
    pages.push({ name: sentenceCase(stripTags(match[1])), content: cleanHTML(match[2]) });
  }

  pages.unshift({ name: "О документе", content: aboutPage(cleanHTML(credits)) });
  return pages;
}

/**
 * Первая страница: что это за журнал, откуда он и чьи права.
 * @param {string} credits  Выходные данные из конца документа правил.
 * @returns {string}
 */
function aboutPage(credits) {
  return [
    "<p>Это копия правил настольной ролевой игры «Витрувий», версия <strong>Beta 3.1</strong>. "
      + "Текст перенесён из документа <code>docs/Vitruvium Beta 3.1.docx</code> без изменений. "
      + "Поменялось только оформление: заголовки написаны обычным регистром, оглавление заменено оглавлением журнала, "
      + "а иллюстрации не перенесены.</p>",
    "<p>Если что-то в системе расходится с этим текстом, правы правила. Журнал обновляет система, "
      + "поэтому правки в нём перезапишутся при следующем обновлении.</p>",
    "<p><em>Чёткой лицензии на использование правил «Витрувия» пока нет. Все права на правила, название "
      + "и материалы «Витрувия» принадлежат их правообладателям. Реализация для Foundry VTT — фанатская "
      + "и некоммерческая.</em></p>",
    "<h2>Авторы правил</h2>",
    credits
  ].join("\n");
}
