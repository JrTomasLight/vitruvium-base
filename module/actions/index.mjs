/**
 * Быстрые действия «Витрувия».
 *
 * Их вызывают кнопки листа и HUD токена, карточки в чате и макросы
 * из библиотеки: `game.vitruvium.actions.check()` и т. д. Вся логика
 * живёт здесь, а макросы — одна строка. Поэтому обновление системы
 * сразу доходит и до уже созданных макросов.
 */
import { shareAbility } from "./abilities.mjs";
import { resolveActor } from "./actors.mjs";
import { declare } from "./declaration.mjs";
import { rollDice } from "./dice.mjs";
import { awardInspiration } from "./inspiration.mjs";

/**
 * Проверка характеристики выбранного токена или своего персонажа.
 * @param {object} [options]
 * @param {Actor} [options.actor]
 * @param {string} [options.characteristic]  Характеристика, выбранная в окне изначально.
 * @returns {Promise<object|null>}
 */
async function check({ actor, characteristic } = {}) {
  actor = resolveActor(actor);
  if ( !actor ) return null;
  return actor.rollCharacteristic(characteristic);
}

export const actions = { check, declare, rollDice, awardInspiration, shareAbility };
