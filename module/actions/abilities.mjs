/**
 * Способности и домены в чате: описание без броска.
 *
 * Механика способностей в проверке (кубики или успехи от уровня домена) ждёт
 * решения владельца (ROADMAP, «Открытые вопросы»). Пока способность просто
 * показывается в чате, а кнопка «Проверка» на карточке открывает обычное окно проверки.
 */
const CARD_TEMPLATE = "systems/vitruvium/templates/chat/ability-card.hbs";

/**
 * Данные карточки: домен целиком или одна его способность.
 * @param {Item} domain           Предмет типа `domain`.
 * @param {number} [abilityIndex]  Номер способности; без него — сам домен как способность.
 * @returns {{title: string, subtitle: string, description: string}|null}
 */
export function abilityCardData(domain, abilityIndex) {
  const level = domain.system.level;
  if ( abilityIndex === undefined ) {
    return {
      title: domain.name,
      subtitle: game.i18n.format("VITRUVIUM.Ability.DomainSubtitle", { level }),
      description: domain.system.description
    };
  }
  const ability = domain.system.abilities[abilityIndex];
  if ( !ability ) return null;
  return {
    title: ability.name || game.i18n.localize("VITRUVIUM.Ability.Unnamed"),
    subtitle: game.i18n.format("VITRUVIUM.Ability.Subtitle", { domain: domain.name, level }),
    description: ability.description
  };
}

/**
 * Показать способность или домен в чате.
 * @param {object} options
 * @param {Actor} options.actor
 * @param {Item} options.domain
 * @param {number} [options.abilityIndex]
 * @returns {Promise<ChatMessage|null>}
 */
export async function shareAbility({ actor, domain, abilityIndex } = {}) {
  const data = domain ? abilityCardData(domain, abilityIndex) : null;
  if ( !data ) {
    ui.notifications.warn(game.i18n.localize("VITRUVIUM.Ability.NotFound"));
    return null;
  }
  const content = await foundry.applications.handlebars.renderTemplate(CARD_TEMPLATE, {
    ...data,
    actorName: actor?.name ?? ""
  });
  return ChatMessage.implementation.create({
    speaker: ChatMessage.implementation.getSpeaker({ actor }),
    content,
    flags: { vitruvium: { ability: { actorUuid: actor?.uuid ?? null, domain: domain.name, abilityIndex: abilityIndex ?? null } } }
  });
}
