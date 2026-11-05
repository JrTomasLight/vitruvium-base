import { VITRUVIUM } from "../config.mjs";

const DIALOG_TEMPLATE = "systems/vitruvium/templates/dialog/check-dialog.hbs";

/**
 * @typedef {object} CheckDialogResult
 * @property {string} characteristic  Ключ характеристики.
 * @property {number} difficulty      Сложность (1–6).
 * @property {number} advantages      Преимущества (0–2).
 * @property {number} disadvantages   Помехи (0–2).
 */

/**
 * Окно настройки проверки характеристики.
 * Игрок выбирает характеристику, сложность, которую назвал мастер,
 * и число преимуществ и помех.
 *
 * @param {object} options
 * @param {Actor} options.actor              Персонаж, который проходит проверку.
 * @param {string} [options.characteristic]  Характеристика, выбранная изначально.
 * @returns {Promise<CheckDialogResult|null>}  `null`, если окно закрыли без броска.
 */
export async function promptCheck({ actor, characteristic } = {}) {
  const characteristics = actor.system.characteristics;
  characteristic ??= Object.keys(VITRUVIUM.characteristics)[0];

  const characteristicOptions = {};
  for ( const [key, config] of Object.entries(VITRUVIUM.characteristics) ) {
    characteristicOptions[key] = game.i18n.format("VITRUVIUM.Check.CharacteristicOption", {
      label: game.i18n.localize(config.label),
      value: characteristics[key].value
    });
  }

  const { min, max } = VITRUVIUM.difficulty;
  const difficultyOptions = {};
  for ( let value = min; value <= max; value++ ) difficultyOptions[value] = String(value);

  const countOptions = {};
  for ( let value = 0; value <= VITRUVIUM.maxAdvantages; value++ ) countOptions[value] = String(value);

  const content = await foundry.applications.handlebars.renderTemplate(DIALOG_TEMPLATE, {
    id: foundry.utils.randomID(),
    characteristic,
    characteristicOptions,
    difficulty: String(VITRUVIUM.difficulty.default),
    difficultyOptions,
    countOptions
  });

  const result = await foundry.applications.api.DialogV2.wait({
    window: {
      title: game.i18n.format("VITRUVIUM.Check.DialogTitle", { name: actor.name }),
      icon: "fa-solid fa-dice-six"
    },
    classes: ["vitruvium", "check-dialog-window"],
    position: { width: 400 },
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

  // Кнопка «Отмена» возвращает имя действия, закрытие окна — null.
  if ( !result || (typeof result !== "object") ) return null;
  return {
    characteristic: result.characteristic,
    difficulty: Number(result.difficulty),
    advantages: Number(result.advantages),
    disadvantages: Number(result.disadvantages)
  };
}
