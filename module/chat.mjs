/**
 * Кнопки в карточках чата «Витрувия».
 *
 * Кнопка помечается атрибутом `data-vitruvium-action`. Кому кнопка
 * недоступна (не владелец персонажа и не мастер), тот её не видит.
 */

/** Обработчики кнопок: имя действия → функция (message, button). */
const CHAT_ACTIONS = {
  /** Карточка заявки: открыть окно проверки для заявившего персонажа. */
  declarationCheck: {
    actor: message => fromUuidSync(message.getFlag("vitruvium", "declaration")?.actorUuid ?? ""),
    run: actor => actor.rollCharacteristic()
  },
  /** Карточка способности: открыть окно проверки для её владельца. */
  abilityCheck: {
    actor: message => fromUuidSync(message.getFlag("vitruvium", "ability")?.actorUuid ?? ""),
    run: actor => actor.rollCharacteristic()
  }
};

/**
 * Подключить кнопки в отрисованном сообщении.
 * Вызывается хуком `renderChatMessageHTML`.
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 */
export function activateChatCard(message, html) {
  html = html instanceof HTMLElement ? html : html?.[0];
  if ( !html ) return;
  for ( const button of html.querySelectorAll("[data-vitruvium-action]") ) {
    const action = CHAT_ACTIONS[button.dataset.vitruviumAction];
    const actor = action?.actor(message);
    if ( !action || !actor?.isOwner ) {
      button.remove();
      continue;
    }
    button.addEventListener("click", event => {
      event.preventDefault();
      action.run(actor);
    });
  }
  // Пустой подвал не нужен, если кнопок не осталось.
  for ( const footer of html.querySelectorAll(".vitruvium.chat-card .card-actions") ) {
    if ( !footer.children.length ) footer.remove();
  }
}
