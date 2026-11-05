/**
 * Заявка: игрок говорит, что делает персонаж и какой результат ему нужен.
 *
 * По правилам («Ведение игры», шаги 2–3) мастер выслушивает заявку
 * и выясняет цель: успех или неудача действия определяются только
 * относительно цели. Поэтому у заявки два поля — действие и цель.
 * Карточка в чате содержит кнопку проверки для владельца персонажа
 * и мастера.
 */
import { resolveActor } from "./actors.mjs";

const DIALOG_TEMPLATE = "systems/vitruvium/templates/dialog/declaration-dialog.hbs";
const CARD_TEMPLATE = "systems/vitruvium/templates/chat/declaration-card.hbs";

/**
 * Окно заявки.
 * @param {Actor} actor
 * @returns {Promise<{action: string, goal: string}|null>}
 */
export async function promptDeclaration(actor) {
  const content = await foundry.applications.handlebars.renderTemplate(DIALOG_TEMPLATE, {
    id: foundry.utils.randomID()
  });
  const result = await foundry.applications.api.DialogV2.wait({
    window: {
      title: game.i18n.format("VITRUVIUM.Declaration.DialogTitle", { name: actor.name }),
      icon: "fa-solid fa-hand"
    },
    classes: ["vitruvium", "declaration-dialog-window"],
    position: { width: 440 },
    content,
    buttons: [
      {
        action: "declare",
        label: game.i18n.localize("VITRUVIUM.Declaration.Submit"),
        icon: "fa-solid fa-hand",
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
  return { action: String(result.action ?? "").trim(), goal: String(result.goal ?? "").trim() };
}

/**
 * Сделать заявку от имени персонажа и отправить карточку в чат.
 *
 * @param {object} [options]
 * @param {Actor} [options.actor]   По умолчанию — выбранный токен или свой персонаж.
 * @param {string} [options.action] Что делает персонаж. Без него откроется окно.
 * @param {string} [options.goal]   Какой результат нужен.
 * @returns {Promise<ChatMessage|null>}
 */
export async function declare({ actor, action, goal = "" } = {}) {
  actor = resolveActor(actor);
  if ( !actor ) return null;

  if ( action === undefined ) {
    const input = await promptDeclaration(actor);
    if ( !input ) return null;
    ({ action, goal } = input);
  }
  if ( !action ) {
    ui.notifications.warn(game.i18n.localize("VITRUVIUM.Declaration.Empty"));
    return null;
  }

  const content = await foundry.applications.handlebars.renderTemplate(CARD_TEMPLATE, { action, goal });
  return ChatMessage.implementation.create({
    speaker: ChatMessage.implementation.getSpeaker({ actor }),
    content,
    flags: { vitruvium: { declaration: { actorUuid: actor.uuid, action, goal } } }
  });
}
