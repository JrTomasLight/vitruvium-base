/**
 * Собрать журнал правил для Foundry из docs/Vitruvium Beta 3.1.docx.
 *
 *   npm run build:rules
 *
 * Нужен pandoc (https://pandoc.org). Результат — journals/rules.json:
 * страницы журнала и отпечаток sha256 документа. Автотест сверяет отпечаток
 * с docx, поэтому если поменять правила и забыть пересобрать журнал, тесты упадут.
 */
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rulesToPages } from "./rules-html.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = "docs/Vitruvium Beta 3.1.docx";
const TARGET = "journals/rules.json";

const docx = path.join(ROOT, SOURCE);
let html;
try {
  html = execFileSync("pandoc", [docx, "-t", "html", "--wrap=none"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}
catch ( err ) {
  console.error("Не удалось запустить pandoc. Установите его: https://pandoc.org/installing.html");
  console.error(err.message);
  process.exit(1);
}

const journal = {
  source: SOURCE,
  sha256: crypto.createHash("sha256").update(fs.readFileSync(docx)).digest("hex"),
  pages: rulesToPages(html)
};

fs.mkdirSync(path.join(ROOT, path.dirname(TARGET)), { recursive: true });
fs.writeFileSync(path.join(ROOT, TARGET), `${JSON.stringify(journal, null, 2)}\n`);
console.log(`${TARGET}: ${journal.pages.length} страниц`);
for ( const page of journal.pages ) console.log(`  ${page.name}`);
