/**
 * Проверка Handlebars-шаблонов (часть npm run lint).
 *
 * - Каждый шаблон разбирается Handlebars: незакрытый {{#if}} или лишняя скобка
 *   ломают лист или карточку только в Foundry, а здесь видны сразу.
 * - Хелперы с аргументами ({{localize "..."}}, {{selectOptions ...}}) должны быть
 *   из списка ниже: встроенные в Handlebars или зарегистрированные Foundry v13.
 *   Опечатка в имени хелпера в Foundry превращается в пустое место без ошибки.
 *
 * Нужен пакет handlebars: npm ci.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Handlebars from "handlebars";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Хелперы Handlebars и Foundry v13, которыми можно пользоваться в шаблонах. */
export const KNOWN_HELPERS = new Set([
  // Handlebars
  "if", "unless", "each", "with", "lookup", "log",
  // Foundry v13 (foundry.applications.handlebars)
  "localize", "selectOptions", "formInput", "formGroup", "formField", "editor", "numberFormat",
  "numberInput", "rangePicker", "radioBoxes", "checked", "disabled", "concat", "eq", "ne", "lt",
  "lte", "gt", "gte", "and", "or", "not", "ifThen", "object", "timeSince", "dataset", "colorPicker"
]);

/**
 * Найти ошибки в одном шаблоне.
 * @param {string} source  Текст шаблона.
 * @returns {string[]}  Описания ошибок.
 */
export function lintTemplate(source) {
  let ast;
  try {
    ast = Handlebars.parse(source);
  }
  catch ( err ) {
    return [`шаблон не разбирается: ${err.message.replace(/\s*\n\s*/g, " ")}`];
  }

  const errors = [];
  const visit = node => {
    if ( !node || (typeof node !== "object") ) return;
    if ( Array.isArray(node) ) return node.forEach(visit);
    const isCall = ["MustacheStatement", "BlockStatement", "SubExpression"].includes(node.type);
    const hasArgs = node.params?.length || node.hash?.pairs?.length;
    if ( isCall && (hasArgs || (node.type === "BlockStatement")) && (node.path?.type === "PathExpression") ) {
      const name = node.path.original;
      if ( !KNOWN_HELPERS.has(name) ) errors.push(`строка ${node.loc.start.line}: неизвестный хелпер «${name}»`);
    }
    if ( node.type === "PartialStatement" ) {
      errors.push(`строка ${node.loc.start.line}: частичные шаблоны ({{> ...}}) система пока не регистрирует`);
    }
    for ( const [key, value] of Object.entries(node) ) {
      if ( key !== "loc" ) visit(value);
    }
  };
  visit(ast);
  return errors;
}

function main() {
  const files = fs.readdirSync(path.join(ROOT, "templates"), { recursive: true }).filter(f => f.endsWith(".hbs"));
  let failed = 0;
  for ( const file of files ) {
    const errors = lintTemplate(fs.readFileSync(path.join(ROOT, "templates", file), "utf8"));
    for ( const error of errors ) console.error(`templates/${file}: ${error}`);
    if ( errors.length ) failed++;
  }
  if ( failed ) {
    console.error(`\nОшибки в шаблонах: ${failed} из ${files.length}`);
    process.exit(1);
  }
  console.log(`Шаблоны в порядке: ${files.length}`);
}

if ( process.argv[1] === fileURLToPath(import.meta.url) ) main();
