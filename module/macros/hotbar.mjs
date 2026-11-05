/**
 * Панель макросов Foundry: поиск свободной ячейки (чистая функция).
 */

/** Ячеек на панели: 5 страниц по 10. */
export const HOTBAR_SLOTS = 50;

/**
 * Первая свободная ячейка панели.
 * Ячейка занята, если в ней лежит существующий макрос.
 *
 * @param {Record<string, string>} hotbar  `game.user.hotbar`: номер ячейки → id макроса.
 * @param {(id: string) => boolean} [exists]  Существует ли макрос с таким id.
 * @returns {number|null}  Номер ячейки (1–50) или `null`, если всё занято.
 */
export function firstFreeSlot(hotbar = {}, exists = () => true) {
  for ( let slot = 1; slot <= HOTBAR_SLOTS; slot++ ) {
    const id = hotbar[slot] ?? hotbar[String(slot)];
    if ( !id || !exists(id) ) return slot;
  }
  return null;
}
