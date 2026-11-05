/**
 * Чистые правила проверки «Витрувия» (Beta 3.1).
 *
 * Здесь только расчёты: ни Foundry, ни чата, ни документов. Поэтому модуль
 * можно проверять автоматическими тестами в Node (см. `tests/`).
 * Броски, окна и карточки в чате — в `check.mjs` и `check-dialog.mjs`.
 */
import { VITRUVIUM } from "../config.mjs";

/**
 * Ограничить число диапазоном. Своя функция, чтобы не зависеть от
 * `Math.clamp`, который добавляет Foundry.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Сколько успехов на грани кубика.
 * @param {number} face  Номер грани, от 1 до 6.
 * @returns {number}     Число успехов; 0 для несуществующей грани.
 */
export function successesOnFace(face) {
  return VITRUVIUM.dice.faces[face - 1] ?? 0;
}

/**
 * Итог преимуществ и помех.
 * Каждое преимущество гасит одну помеху. Остаток — от −2 (две помехи)
 * до +2 (два преимущества). Больше двух каждого не бывает.
 * @param {number} [advantages=0]
 * @param {number} [disadvantages=0]
 * @returns {number}
 */
export function netAdvantage(advantages = 0, disadvantages = 0) {
  const max = VITRUVIUM.maxAdvantages;
  const adv = clamp(Math.floor(Number(advantages) || 0), 0, max);
  const dis = clamp(Math.floor(Number(disadvantages) || 0), 0, max);
  return adv - dis;
}

/**
 * Размер пула с учётом ограничений правил: от 1 до 6 кубиков.
 * @param {number} dice
 * @returns {number}
 */
export function clampPool(dice) {
  const { minPool, maxPool } = VITRUVIUM.dice;
  return clamp(Math.floor(Number(dice) || 0), minPool, maxPool);
}

/**
 * Сложность в пределах правил: от 1 до 6. Нечисло — минимальная сложность.
 * @param {number} difficulty
 * @returns {number}
 */
export function clampDifficulty(difficulty) {
  const { min, max } = VITRUVIUM.difficulty;
  return clamp(Math.floor(Number(difficulty) || min), min, max);
}

/**
 * Сколько раз бросать пул: основной бросок и по одному дополнительному
 * на каждое оставшееся преимущество или помеху.
 * @param {number} net  Итог из `netAdvantage`.
 * @returns {number}
 */
export function attemptCount(net) {
  return 1 + Math.abs(net);
}

/**
 * Какой бросок засчитать.
 * С преимуществом — лучший, с помехой — худший, без них — единственный.
 * При равенстве засчитывается более ранний бросок.
 * @param {number[]} totals  Успехи в каждом броске, по порядку.
 * @param {number} net       Итог из `netAdvantage`.
 * @returns {number}         Индекс засчитанного броска.
 */
export function chooseAttempt(totals, net) {
  let chosen = 0;
  totals.forEach((total, index) => {
    if ( (net > 0) && (total > totals[chosen]) ) chosen = index;
    if ( (net < 0) && (total < totals[chosen]) ) chosen = index;
  });
  return chosen;
}

/**
 * Успешна ли проверка: успехов не меньше сложности.
 * @param {number} successes
 * @param {number} difficulty
 * @returns {boolean}
 */
export function isSuccess(successes, difficulty) {
  return successes >= difficulty;
}
