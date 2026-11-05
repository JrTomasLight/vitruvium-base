/**
 * Свободный бросок кубиков «Витрувия» без сложности.
 */
import { VITRUVIUM } from "../config.mjs";
import { rollDice as rollPool } from "../dice/check.mjs";
import { currentActors } from "./actors.mjs";
import { formatCount } from "../helpers/i18n.mjs";

const DIALOG_TEMPLATE = "systems/vitruvium/templates/dialog/dice-dialog.hbs";

/**
 * Окно выбора числа кубиков.
 * @returns {Promise<number|null>}
 */
export async function promptDice() {
  const { minPool, maxPool } = VITRUVIUM.dice;
  const diceOptions = {};
  for ( let count = minPool; count <= maxPool; count++ ) {
    diceOptions[count] = formatCount("VITRUVIUM.Check.Dice", count);
  }
  const content = await foundry.applications.handlebars.renderTemplate(DIALOG_TEMPLATE, {
    id: foundry.utils.randomID(),
    diceOptions,
    dice: String(minPool)
  });
  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: game.i18n.localize("VITRUVIUM.Dice.Title"), icon: "fa-solid fa-dice" },
    classes: ["vitruvium", "dice-dialog-window"],
    position: { width: 340 },
    content,
    buttons: [
      {
        action: "roll",
        label: game.i18n.localize("VITRUVIUM.Check.Roll"),
        icon: "fa-solid fa-dice",
        default: true,
        callback: (event, button) => new foundry.applications.ux.FormDataExtended(button.form).object
      },
      {
        action: "cancel",
        label: game.i18n.localize("VITRUVIUM.Check.Cancel"),
        icon: "fa-solid fa-xmark"
      }
    ],
    rejectClose: false
  });
  if ( !result || (typeof result !== "object") ) return null;
  return Number(result.dice);
}

/**
 * Бросить N кубиков. Без `dice` спрашивает число кубиков.
 * Бросок идёт от имени выбранного токена или своего персонажа, если они есть.
 *
 * @param {object} [options]
 * @param {Actor} [options.actor]
 * @param {number} [options.dice]
 * @param {string} [options.label]
 * @returns {Promise<object|null>}
 */
export async function rollDice({ actor, dice, label } = {}) {
  actor ??= currentActors(a => Boolean(a?.isOwner))[0];
  dice ??= await promptDice();
  if ( !dice ) return null;
  return rollPool({ actor, dice, label });
}
