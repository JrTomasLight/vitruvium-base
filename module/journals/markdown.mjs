/**
 * Маленький конвертер Markdown → HTML для журналов системы.
 *
 * Без Foundry: чистые функции, их покрывают автотесты. Поддерживает ровно то,
 * что встречается в CHANGELOG.md: заголовки `#`–`####`, абзацы, маркированные
 * списки `- ` (с продолжением строки отступом), **полужирный**, *курсив* или _курсив_,
 * `код` и [ссылки](адрес). Весь текст экранируется, сырой HTML не пропускается.
 */

/**
 * Экранировать спецсимволы HTML.
 * @param {string} text
 * @returns {string}
 */
export function escapeHTML(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Строчная разметка: код, ссылки, полужирный, курсив.
 * @param {string} text  Строка Markdown без переводов строк.
 * @returns {string}  HTML.
 */
export function renderInline(text) {
  // Код вынимаем первым, чтобы звёздочки и подчёркивания внутри него не трогать.
  const codes = [];
  let html = text.replace(/`([^`]+)`/g, (_, code) => {
    codes.push(`<code>${escapeHTML(code)}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });
  html = escapeHTML(html);
  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    // Ссылки только на веб-адреса: относительные пути в Foundry никуда не ведут.
    if ( !/^https?:\/\//.test(href) ) return label;
    return `<a href="${href}">${label}</a>`;
  });
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(^|[^*\w])\*(?!\s)(.+?)\*(?![*\w])/g, "$1<em>$2</em>");
  html = html.replace(/(^|[^_\p{L}\d])_(?!\s)(.+?)_(?![_\p{L}\d])/gu, "$1<em>$2</em>");
  return html.replace(/\u0000(\d+)\u0000/g, (_, index) => codes[Number(index)]);
}

/**
 * Блочная разметка.
 * @param {string} markdown
 * @param {object} [options]
 * @param {number} [options.shift=0]  На сколько уровней поднять заголовки: `###` при shift 1 станет `<h2>`.
 * @returns {string}  HTML.
 */
export function renderMarkdown(markdown, { shift = 0 } = {}) {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const out = [];
  let paragraph = [];
  let list = null;

  const flushParagraph = () => {
    if ( paragraph.length ) out.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if ( list ) out.push(`<ul>${list.map(item => `<li>${renderInline(item)}</li>`).join("")}</ul>`);
    list = null;
  };

  for ( const line of lines ) {
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    const item = line.match(/^[-*]\s+(.*)$/);
    if ( heading ) {
      flushParagraph();
      flushList();
      const level = Math.max(1, heading[1].length - shift);
      out.push(`<h${level}>${renderInline(heading[2].trim())}</h${level}>`);
    }
    else if ( item ) {
      flushParagraph();
      list ??= [];
      list.push(item[1].trim());
    }
    else if ( !line.trim() ) {
      flushParagraph();
      flushList();
    }
    else if ( list && /^\s+/.test(line) ) list[list.length - 1] += ` ${line.trim()}`;
    else {
      flushList();
      paragraph.push(line.trim());
    }
  }
  flushParagraph();
  flushList();
  return out.join("\n");
}

/**
 * Разбить Markdown на страницы журнала по заголовкам второго уровня.
 * Заголовок первого уровня — название журнала, текст до первого `##` — вступление.
 * Название страницы Foundry показывает как главный заголовок, поэтому `###` внутри
 * страницы становится `<h2>`, `####` — `<h3>`.
 * @param {string} markdown
 * @returns {{title: string|null, intro: string, pages: {name: string, content: string}[]}}
 */
export function markdownToPages(markdown) {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  let title = null;
  const intro = [];
  const pages = [];

  for ( const line of lines ) {
    const h1 = line.match(/^#\s+(.*)$/);
    const h2 = line.match(/^##\s+(.*)$/);
    if ( h1 && title === null && !pages.length ) title = h1[1].trim();
    else if ( h2 ) pages.push({ name: h2[1].trim(), lines: [] });
    else if ( pages.length ) pages.at(-1).lines.push(line);
    else intro.push(line);
  }

  return {
    title,
    intro: renderMarkdown(intro.join("\n")),
    pages: pages.map(({ name, lines }) => ({
      name: name.replace(/[*_`]/g, ""),
      content: renderMarkdown(lines.join("\n"), { shift: 1 })
    }))
  };
}

/**
 * Короткий отпечаток строки (FNV-1a, 32 бита). По нему журнал понимает,
 * изменился ли источник с прошлого обновления.
 * @param {string} text
 * @returns {string}
 */
export function hashText(text) {
  let hash = 0x811c9dc5;
  for ( let i = 0; i < text.length; i++ ) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}
