/**
 * Чей это ход: для какого персонажа выполнять быстрое действие.
 */

/**
 * Выбрать актёров для быстрого действия (чистая функция, без Foundry).
 *
 * Порядок: актёры выбранных токенов (без повторов), а если токены не
 * выбраны — назначенный пользователю персонаж.
 *
 * @param {object} options
 * @param {object[]} [options.controlled]  Выбранные токены (у каждого есть `actor`).
 * @param {object|null} [options.character]  Персонаж пользователя.
 * @param {(actor: object) => boolean} [options.filter]  Каких актёров оставить.
 * @returns {object[]}
 */
export function pickActors({ controlled = [], character = null, filter = () => true } = {}) {
  const fromTokens = [];
  for ( const token of controlled ) {
    const actor = token?.actor;
    if ( actor && !fromTokens.includes(actor) && filter(actor) ) fromTokens.push(actor);
  }
  if ( fromTokens.length ) return fromTokens;
  return (character && filter(character)) ? [character] : [];
}

/** Подходит ли актёр для проверок: у него есть характеристики и он ваш. */
export function canAct(actor) {
  return Boolean(actor?.system?.characteristics) && Boolean(actor.isOwner);
}

/**
 * Актёры текущего пользователя для быстрого действия.
 * @param {(actor: object) => boolean} [filter]
 * @returns {Actor[]}
 */
export function currentActors(filter = canAct) {
  return pickActors({
    controlled: canvas?.ready ? canvas.tokens.controlled : [],
    character: game.user.character,
    filter
  });
}

/**
 * Один актёр для действия или `null` с подсказкой, что сделать.
 * @param {Actor} [actor]  Если передан явно, используется он.
 * @returns {Actor|null}
 */
export function resolveActor(actor) {
  if ( actor ) return actor;
  const [found] = currentActors();
  if ( !found ) ui.notifications.warn(game.i18n.localize("VITRUVIUM.Actions.NoActor"));
  return found ?? null;
}
