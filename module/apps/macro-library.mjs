import { DRAG_TYPE, MACRO_LIBRARY, addToHotbar } from "../macros/library.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Окно «Библиотека макросов»: список быстрых действий, которые можно
 * положить на панель макросов кнопкой или перетаскиванием.
 *
 * Открывается кнопкой во вкладке «Макросы» боковой панели или
 * из консоли: `game.vitruvium.openMacroLibrary()`.
 */
export class MacroLibrary extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    id: "vitruvium-macro-library",
    classes: ["vitruvium", "macro-library"],
    window: {
      title: "VITRUVIUM.MacroLibrary.Title",
      icon: "fa-solid fa-book-bookmark",
      resizable: true
    },
    position: { width: 480, height: "auto" },
    actions: {
      addToHotbar: MacroLibrary.#onAddToHotbar
    }
  };

  /** @override */
  static PARTS = {
    list: { template: "systems/vitruvium/templates/apps/macro-library.hbs", scrollable: [""] }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const groups = [
      { id: "player", label: "VITRUVIUM.MacroLibrary.GroupPlayer", entries: [] },
      { id: "gm", label: "VITRUVIUM.MacroLibrary.GroupGM", entries: [] }
    ];
    for ( const entry of MACRO_LIBRARY ) {
      if ( entry.gmOnly && !game.user.isGM ) continue;
      const group = groups.find(g => g.id === entry.group);
      group?.entries.push({
        ...entry,
        label: game.i18n.localize(`VITRUVIUM.Macro.${entry.key}.label`),
        hint: game.i18n.localize(`VITRUVIUM.Macro.${entry.key}.hint`),
        available: Boolean(entry.call),
        pendingHint: entry.pending ? game.i18n.localize(entry.pending) : ""
      });
    }
    context.groups = groups.filter(group => group.entries.length);
    return context;
  }

  /** Перетаскивание записи на панель макросов. */
  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    for ( const row of this.element.querySelectorAll("[data-macro-key][draggable='true']") ) {
      row.addEventListener("dragstart", event => {
        event.dataTransfer.setData("text/plain", JSON.stringify({ type: DRAG_TYPE, key: row.dataset.macroKey }));
      });
    }
  }

  /**
   * Кнопка «На панель».
   * @this {MacroLibrary}
   */
  static async #onAddToHotbar(event, target) {
    const key = target.closest("[data-macro-key]")?.dataset.macroKey;
    if ( key ) await addToHotbar(key);
  }
}

/** Открыть библиотеку (одно окно на клиент). */
export function openMacroLibrary() {
  const existing = foundry.applications.instances.get("vitruvium-macro-library");
  if ( existing ) return existing.render({ force: true });
  return new MacroLibrary().render({ force: true });
}

/**
 * Хук `renderMacroDirectory`: кнопка библиотеки во вкладке «Макросы».
 * @param {Application} app
 * @param {HTMLElement} html
 */
export function addLibraryButton(app, html) {
  html = html instanceof HTMLElement ? html : html?.[0];
  if ( !html ) return;
  if ( html.querySelector(".vitruvium-open-library") ) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "vitruvium-open-library";
  button.innerHTML = `<i class="fa-solid fa-book-bookmark" inert></i> <span>${game.i18n.localize("VITRUVIUM.MacroLibrary.Open")}</span>`;
  button.addEventListener("click", () => openMacroLibrary());
  const actions = html.querySelector(".directory-header .header-actions") ?? html.querySelector(".directory-header");
  (actions ?? html).append(button);
}
