/**
 * Таблица шансов успеха проверки «Витрувия».
 *
 *   npm run odds                       — все варианты преимуществ и помех
 *   npm run odds -- --bonus 2          — с +2 успехами к результату
 *
 * Строки — размер пула (1–6 кубиков), столбцы — сложность (1–6).
 * Удобно, чтобы оценить баланс, когда меняются правила или
 * появляются новые способности.
 */
import { chanceTable } from "../module/dice/probability.mjs";

const args = process.argv.slice(2);
const bonusIndex = args.indexOf("--bonus");
const bonusSuccesses = bonusIndex >= 0 ? Number(args[bonusIndex + 1]) || 0 : 0;

const variants = [
  ["Две помехи", { disadvantages: 2 }],
  ["Одна помеха", { disadvantages: 1 }],
  ["Обычная проверка", {}],
  ["Одно преимущество", { advantages: 1 }],
  ["Два преимущества", { advantages: 2 }]
];

const pct = p => `${(p * 100).toFixed(1)}%`.padStart(7);

for ( const [title, options] of variants ) {
  const suffix = bonusSuccesses ? ` (+${bonusSuccesses} усп.)` : "";
  console.log(`\n${title}${suffix}`);
  console.log(`Пул \\ Сл.${[1, 2, 3, 4, 5, 6].map(d => String(d).padStart(7)).join("")}`);
  for ( const { pool, chances } of chanceTable({ ...options, bonusSuccesses }) ) {
    console.log(`${String(pool).padStart(9)}${chances.map(pct).join("")}`);
  }
}
