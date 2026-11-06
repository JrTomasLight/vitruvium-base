/**
 * Бюджеты создания персонажа (правила, «Создание персонажа»).
 * Чистые функции без Foundry: их покрывают автотесты (tests/creation.test.mjs).
 */
import { VITRUVIUM } from "../config.mjs";

/**
 * Сколько способностей может быть в домене этого уровня: удвоенный уровень.
 * @param {number} level
 * @returns {number}
 */
export function abilityLimit(level) {
  return Math.max(0, Math.trunc(Number(level) || 0)) * VITRUVIUM.domains.abilitiesPerLevel;
}

/**
 * Очки доменов: сколько потрачено из бюджета уровня персонажа.
 *
 * Каждый уровень домена стоит одно очко: домен 2-го уровня — 2 очка.
 * Правила говорят «распределить 3/6/9/12 очков доменов» без уточнения,
 * бесплатен ли первый уровень; принято, что нет (см. ROADMAP, «Открытые вопросы»).
 *
 * @param {number[]} levels  Уровни доменов персонажа.
 * @param {number} budget    Очки по уровню персонажа.
 * @returns {{budget: number, spent: number, remaining: number, overspent: boolean, count: number, tooMany: boolean}}
 */
export function domainBudget(levels, budget) {
  const spent = levels.reduce((total, level) => total + (Number(level) || 0), 0);
  return {
    budget,
    spent,
    remaining: budget - spent,
    overspent: spent > budget,
    count: levels.length,
    tooMany: levels.length > VITRUVIUM.domains.maxCount
  };
}
