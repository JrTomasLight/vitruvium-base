/**
 * Точные вероятности проверок «Витрувия».
 *
 * Расчёт без бросков: распределение успехов получается сверткой граней
 * кубика, а преимущество и помеха — через максимум или минимум нескольких
 * независимых бросков. Модуль не зависит от Foundry.
 *
 * Нужен, чтобы:
 * - тестами сверять настоящие броски с теорией (см. `tests/`);
 * - оценивать баланс при изменении правил и будущих способностей
 *   (`npm run odds` печатает таблицу шансов);
 * - при желании показывать шанс успеха в окне проверки.
 *
 * Распределение — массив, где индекс — число успехов, значение — вероятность.
 */
import { VITRUVIUM } from "../config.mjs";
import { attemptCount, clampDifficulty, clampPool, netAdvantage } from "./rules.mjs";

/**
 * Распределение успехов на одном кубике. Для граней 0/0/0/1/1/2 это
 * [1/2, 1/3, 1/6].
 * @returns {number[]}
 */
export function dieDistribution() {
  const faces = VITRUVIUM.dice.faces;
  const dist = Array(Math.max(...faces) + 1).fill(0);
  for ( const successes of faces ) dist[successes] += 1 / faces.length;
  return dist;
}

/**
 * Свертка двух распределений: распределение суммы.
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number[]}
 */
function convolve(a, b) {
  const out = Array(a.length + b.length - 1).fill(0);
  a.forEach((pa, i) => b.forEach((pb, j) => { out[i + j] += pa * pb; }));
  return out;
}

/**
 * Распределение суммы успехов для пула из `pool` кубиков.
 * Размер пула не ограничивается правилами: так удобнее исследовать
 * «что если». Для проверок используйте `checkDistribution`.
 * @param {number} pool  Число кубиков, целое ≥ 0.
 * @returns {number[]}
 */
export function poolDistribution(pool) {
  const die = dieDistribution();
  let dist = [1];
  for ( let i = 0; i < pool; i++ ) dist = convolve(dist, die);
  return dist;
}

/**
 * Вероятность получить не меньше `k` успехов.
 * @param {number[]} dist
 * @param {number} k
 * @returns {number}
 */
export function chanceAtLeast(dist, k) {
  return dist.reduce((sum, p, successes) => (successes >= k ? sum + p : sum), 0);
}

/**
 * Математическое ожидание числа успехов.
 * @param {number[]} dist
 * @returns {number}
 */
export function expectedValue(dist) {
  return dist.reduce((sum, p, successes) => sum + (p * successes), 0);
}

/**
 * Распределение засчитанного результата с учётом преимуществ и помех.
 *
 * Бросается `n = 1 + |net|` независимых пулов.
 * - Преимущество (лучший из n): P(max ≤ k) = F(k)^n.
 * - Помеха (худший из n):       P(min ≥ k) = S(k)^n.
 * Здесь F — функция распределения одного пула, S(k) = P(X ≥ k).
 *
 * @param {number[]} dist  Распределение одного пула.
 * @param {number} net     Итог преимуществ и помех.
 * @returns {number[]}
 */
export function withAdvantage(dist, net) {
  const n = attemptCount(net);
  if ( n === 1 ) return dist.slice();

  const out = Array(dist.length).fill(0);
  if ( net > 0 ) {
    let cdfPrev = 0;
    let cdf = 0;
    dist.forEach((p, k) => {
      cdf += p;
      out[k] = (cdf ** n) - (cdfPrev ** n);
      cdfPrev = cdf;
    });
  } else {
    for ( let k = 0; k < dist.length; k++ ) {
      out[k] = (chanceAtLeast(dist, k) ** n) - (chanceAtLeast(dist, k + 1) ** n);
    }
  }
  return out;
}

/**
 * Сдвинуть распределение на фиксированное число успехов.
 * Пригодится для будущих механик, которые добавляют успехи к результату
 * (например, вдохновение при использовании способности, этап 4 ROADMAP).
 * @param {number[]} dist
 * @param {number} bonus  Целое ≥ 0.
 * @returns {number[]}
 */
export function addSuccesses(dist, bonus) {
  return Array(bonus).fill(0).concat(dist);
}

/**
 * Распределение засчитанных успехов в проверке — с теми же ограничениями,
 * что и настоящий бросок `rollCheck`: пул 1–6, не больше двух
 * преимуществ или помех, взаимное гашение.
 *
 * @param {object} options
 * @param {number} options.dice                Размер пула до ограничения.
 * @param {number} [options.advantages=0]
 * @param {number} [options.disadvantages=0]
 * @param {number} [options.bonusSuccesses=0]  Успехи, добавленные к засчитанному результату.
 * @returns {number[]}
 */
export function checkDistribution({ dice, advantages = 0, disadvantages = 0, bonusSuccesses = 0 }) {
  const net = netAdvantage(advantages, disadvantages);
  const dist = withAdvantage(poolDistribution(clampPool(dice)), net);
  return addSuccesses(dist, Math.max(0, Math.floor(bonusSuccesses)));
}

/**
 * Шанс успеха проверки.
 * @param {object} options  Как у `checkDistribution`, плюс `difficulty` (1–6).
 * @returns {number}
 */
export function checkChance({ difficulty, ...options }) {
  return chanceAtLeast(checkDistribution(options), clampDifficulty(difficulty));
}

/**
 * Таблица шансов: строки — размер пула 1–6, столбцы — сложность 1–6.
 * @param {object} [options]  `advantages`, `disadvantages`, `bonusSuccesses`.
 * @returns {{pool: number, chances: number[]}[]}
 */
export function chanceTable(options = {}) {
  const { minPool, maxPool } = VITRUVIUM.dice;
  const { min, max } = VITRUVIUM.difficulty;
  const rows = [];
  for ( let pool = minPool; pool <= maxPool; pool++ ) {
    const chances = [];
    for ( let difficulty = min; difficulty <= max; difficulty++ ) {
      chances.push(checkChance({ ...options, dice: pool, difficulty }));
    }
    rows.push({ pool, chances });
  }
  return rows;
}
