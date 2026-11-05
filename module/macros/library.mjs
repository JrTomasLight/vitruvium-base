/**
 * Библиотека макросов «Витрувия»: готовые быстрые действия для панели
 * макросов Foundry.
 *
 * Макрос — одна строка, которая вызывает действие системы
 * (`game.vitruvium.actions.*`). Логика остаётся в коде системы,
 * поэтому её обновления сразу доходят до уже созданных макросов.
 *
 * Чтобы добавить макрос, допишите запись в MACRO_LIBRARY, строки
 * в lang/ru.json (VITRUVIUM.Macro.<key>) и иконку в assets/icons.
 */
import { firstFreeSlot } from "./hotbar.mjs";

const ICONS = "systems/vitruvium/assets/icons";

/**
 * @typedef {object} LibraryMacro
 * @property {string} key        Уникальный ключ; хранится во флаге макроса.
 * @property {"player"|"gm"} group  Кому макрос в первую очередь: игроку или мастеру.
 * @property {string} img        Иконка макроса.
 * @property {string} [call]     Вызов действия системы (без `game.vitruvium.actions.`).
 * @property {boolean} [gmOnly]  Видят только мастера.
 * @property {string} [pending]  Ключ локализации: почему макрос пока недоступен.
 */

/** @type {LibraryMacro[]} */
export const MACRO_LIBRARY = [
  { key: "check", group: "player", img: `${ICONS}/check.svg`, call: "check" },
  { key: "declare", group: "player", img: `${ICONS}/declaration.svg`, call: "declare" },
  { key: "dice", group: "player", img: `${ICONS}/dice.svg`, call: "rollDice" },
  {
    key: "ability", group: "player", img: `${ICONS}/ability.svg`,
    pending: "VITRUVIUM.Macro.ability.pending"
  },
  { key: "inspiration", group: "gm", img: `${ICONS}/inspiration.svg`, call: "awardInspiration", gmOnly: true }
];

/** Тип данных при перетаскивании записи библиотеки на панель макросов. */
export const DRAG_TYPE = "VitruviumMacro";

/**
 * Найти запись библиотеки.
 * @param {string} key
 * @returns {LibraryMacro|undefined}
 */
export function getLibraryMacro(key) {
  return MACRO_LIBRARY.find(entry => entry.key === key);
}

/**
 * Текст скрипта макроса для записи библиотеки.
 * @param {LibraryMacro} entry
 * @param {string} [title]  Название для комментария в первой строке.
 * @returns {string}
 */
export function macroCommand(entry, title = entry.key) {
  return [
    `// «Витрувий»: ${title}.`,
    "// Макрос из библиотеки системы. Действие выполняется для выбранного токена",
    "// или вашего персонажа. Логика — в системе, поэтому макрос обновляется вместе с ней.",
    `game.vitruvium.actions.${entry.call}();`
  ].join("\n");
}

/**
 * Взять макрос из мира или создать его.
 * Если у пользователя уже есть макрос из библиотеки с этим ключом, он
 * используется повторно, чтобы не плодить копии.
 * @param {string} key
 * @returns {Promise<Macro|null>}
 */
export async function ensureMacro(key) {
  const entry = getLibraryMacro(key);
  if ( !entry?.call ) return null;
  if ( entry.gmOnly && !game.user.isGM ) return null;

  const existing = game.macros.find(macro => (macro.getFlag("vitruvium", "library") === key) && macro.isOwner);
  if ( existing ) return existing;

  const name = game.i18n.localize(`VITRUVIUM.Macro.${key}.label`);
  try {
    return await Macro.implementation.create({
      name,
      type: "script",
      img: entry.img,
      command: macroCommand(entry, name),
      flags: { vitruvium: { library: key } }
    });
  } catch ( error ) {
    console.error(error);
    ui.notifications.error(game.i18n.localize("VITRUVIUM.MacroLibrary.CreateFailed"));
    return null;
  }
}

/**
 * Положить макрос из библиотеки на панель.
 * @param {string} key
 * @param {number} [slot]  Ячейка; по умолчанию первая свободная.
 * @returns {Promise<Macro|null>}
 */
export async function addToHotbar(key, slot) {
  const macro = await ensureMacro(key);
  if ( !macro ) return null;

  slot ??= firstFreeSlot(game.user.hotbar, id => game.macros.has(id));
  if ( !slot ) {
    ui.notifications.warn(game.i18n.localize("VITRUVIUM.MacroLibrary.HotbarFull"));
    return macro;
  }
  await game.user.assignHotbarMacro(macro, slot);
  ui.notifications.info(game.i18n.format("VITRUVIUM.MacroLibrary.Added", { name: macro.name, slot }));
  return macro;
}

/**
 * Хук `hotbarDrop`: запись библиотеки, перетащенная на панель.
 * Возвращает false, чтобы Foundry не обрабатывал её сам.
 */
export function onHotbarDrop(bar, data, slot) {
  if ( data?.type !== DRAG_TYPE ) return;
  addToHotbar(data.key, slot);
  return false;
}
