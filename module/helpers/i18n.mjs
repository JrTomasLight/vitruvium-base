/**
 * Помощники локализации.
 */

const RU_PLURAL = new Intl.PluralRules("ru");

/**
 * Ключ локализации для числа по правилам русских склонений:
 * `one` (1, 21 кубик), `few` (2–4, 22 кубика), `many` (5–20 кубиков),
 * `other` (дробные). В ru.json у ключа должны быть все четыре формы.
 *
 * @param {string} base   Ключ без формы, например "VITRUVIUM.Check.Dice".
 * @param {number} count
 * @returns {string}      Например "VITRUVIUM.Check.Dice.few".
 */
export function pluralKey(base, count) {
  return `${base}.${RU_PLURAL.select(count)}`;
}

/**
 * Готовая строка с числом в нужной форме: «3 кубика».
 * @param {string} base
 * @param {number} count
 * @returns {string}
 */
export function formatCount(base, count) {
  return game.i18n.format(pluralKey(base, count), { count });
}
