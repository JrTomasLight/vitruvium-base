/**
 * Мастер выдаёт вдохновение.
 * По правилам вдохновение — награда мастера за достижение игровых целей,
 * запас не больше 6.
 */
import { addInspiration } from "../dice/rules.mjs";
import { currentActors } from "./actors.mjs";

const CARD_TEMPLATE = "systems/vitruvium/templates/chat/inspiration-card.hbs";

/** Есть ли у актёра запас вдохновения. */
const hasInspiration = actor => Boolean(actor?.system?.inspiration);

/**
 * Выдать вдохновение выбранным персонажам. Только для мастера.
 *
 * @param {object} [options]
 * @param {Actor[]} [options.actors]  По умолчанию — актёры выбранных токенов.
 * @param {number} [options.amount=1]
 * @returns {Promise<ChatMessage|null>}
 */
export async function awardInspiration({ actors, amount = 1 } = {}) {
  if ( !game.user.isGM ) {
    ui.notifications.warn(game.i18n.localize("VITRUVIUM.Inspiration.GMOnly"));
    return null;
  }
  actors = (actors ?? currentActors(hasInspiration)).filter(hasInspiration);
  if ( !actors.length ) {
    ui.notifications.warn(game.i18n.localize("VITRUVIUM.Inspiration.NoTargets"));
    return null;
  }

  const rows = [];
  for ( const actor of actors ) {
    const { value, max } = actor.system.inspiration;
    const next = addInspiration(value, amount, max);
    if ( next !== value ) await actor.update({ "system.inspiration.value": next });
    rows.push({ name: actor.name, value: next, max, capped: next === value });
  }

  const content = await foundry.applications.handlebars.renderTemplate(CARD_TEMPLATE, { rows });
  return ChatMessage.implementation.create({
    speaker: ChatMessage.implementation.getSpeaker({ alias: game.i18n.localize("VITRUVIUM.Inspiration.Speaker") }),
    content,
    flags: { vitruvium: { inspiration: { amount, rows } } }
  });
}
