const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

const TEMPLATES = "systems/vitruvium/templates/actor";

/**
 * Лист персонажа игрока (ApplicationV2).
 *
 * Состоит из шапки (портрет, имя, концепция, уровень, вдохновение,
 * кнопки «Проверка» и «Заявка») и вкладок «Характеристики» и «Биография».
 * Поля формы сохраняются сразу при изменении.
 */
export class VitruviumCharacterSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["vitruvium", "character-sheet"],
    position: { width: 640, height: 720 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      editPortrait: VitruviumCharacterSheet.#onEditPortrait,
      setCharacteristic: VitruviumCharacterSheet.#onSetCharacteristic,
      rollCharacteristic: VitruviumCharacterSheet.#onRollCharacteristic,
      rollCheck: VitruviumCharacterSheet.#onRollCheck,
      declare: VitruviumCharacterSheet.#onDeclare,
      setInspiration: VitruviumCharacterSheet.#onSetInspiration
    }
  };

  /** @override */
  static PARTS = {
    header: { template: `${TEMPLATES}/character-header.hbs` },
    tabs: { template: `${TEMPLATES}/tabs.hbs` },
    characteristics: { template: `${TEMPLATES}/character-characteristics.hbs`, scrollable: [""] },
    biography: { template: `${TEMPLATES}/character-biography.hbs`, scrollable: [""] }
  };

  /** Вкладки листа. `id` совпадает с именем части в PARTS. */
  static SHEET_TABS = [
    { id: "characteristics", icon: "fa-solid fa-circle-nodes", label: "VITRUVIUM.Tab.Characteristics" },
    { id: "biography", icon: "fa-solid fa-feather-pointed", label: "VITRUVIUM.Tab.Biography" }
  ];

  /** @override */
  tabGroups = { primary: "characteristics" };

  /* -------------------------------------------- */
  /*  Подготовка данных                           */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.document;
    const system = actor.system;
    const config = CONFIG.VITRUVIUM;

    const tierOptions = {};
    for ( const [key, tier] of Object.entries(config.tiers) ) {
      tierOptions[key] = game.i18n.format("VITRUVIUM.Tier.Option", {
        label: game.i18n.localize(tier.label),
        budget: tier.budget
      });
    }

    const inspirationPips = [];
    for ( let value = 1; value <= system.inspiration.max; value++ ) {
      inspirationPips.push({
        value,
        filled: value <= system.inspiration.value,
        label: game.i18n.format("VITRUVIUM.Sheet.SetInspiration", { value })
      });
    }

    return Object.assign(context, {
      actor,
      system,
      editable: this.isEditable,
      owner: actor.isOwner,
      tabs: this.#prepareTabs(),
      tierOptions,
      tierHint: game.i18n.localize(config.tiers[system.tier]?.hint ?? ""),
      inspirationPips
    });
  }

  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    context.tab = context.tabs[partId];

    switch ( partId ) {
      case "characteristics":
        context.characteristics = this.#prepareCharacteristics();
        context.budget = context.system.creation.characteristics;
        break;
      case "biography":
        context.biographyField = context.system.schema.fields.biography;
        context.enrichedBiography = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
          context.system.biography,
          { secrets: this.document.isOwner, relativeTo: this.document }
        );
        break;
    }
    return context;
  }

  /**
   * Состояние вкладок для шаблонов.
   * @returns {Record<string, object>}
   */
  #prepareTabs() {
    const group = "primary";
    const activeTab = this.tabGroups[group];
    return Object.fromEntries(VitruviumCharacterSheet.SHEET_TABS.map(tab => {
      const active = tab.id === activeTab;
      return [tab.id, { ...tab, group, active, cssClass: active ? "active" : "" }];
    }));
  }

  /**
   * Список характеристик с отметками уровня для шаблона.
   * @returns {object[]}
   */
  #prepareCharacteristics() {
    const config = CONFIG.VITRUVIUM;
    const { min, max } = config.characteristicRange;
    return Object.entries(config.characteristics).map(([key, characteristic]) => {
      const label = game.i18n.localize(characteristic.label);
      const value = this.document.system.characteristics[key].value;
      const pips = [];
      for ( let level = min; level <= max; level++ ) {
        pips.push({
          key,
          value: level,
          filled: level <= value,
          label: game.i18n.format("VITRUVIUM.Sheet.SetCharacteristic", { characteristic: label, value: level })
        });
      }
      return {
        key,
        label,
        rollLabel: game.i18n.format("VITRUVIUM.Check.RollCharacteristic", { characteristic: label }),
        hint: game.i18n.localize(characteristic.hint),
        icon: characteristic.icon,
        value,
        pips
      };
    });
  }

  /* -------------------------------------------- */
  /*  Действия                                    */
  /* -------------------------------------------- */

  /**
   * Выбрать новый портрет персонажа.
   * @this {VitruviumCharacterSheet}
   */
  static async #onEditPortrait(event, target) {
    if ( !this.isEditable ) return;
    const picker = new foundry.applications.apps.FilePicker.implementation({
      type: "image",
      current: this.document.img,
      callback: path => this.document.update({ img: path })
    });
    return picker.browse();
  }

  /**
   * Установить уровень характеристики по клику на отметку.
   * @this {VitruviumCharacterSheet}
   */
  static async #onSetCharacteristic(event, target) {
    if ( !this.isEditable ) return;
    const { characteristic, value } = target.dataset;
    return this.document.update({ [`system.characteristics.${characteristic}.value`]: Number(value) });
  }

  /**
   * Проверка характеристики по клику на её название или значок.
   * Бросать может только владелец персонажа.
   * @this {VitruviumCharacterSheet}
   */
  static async #onRollCharacteristic(event, target) {
    if ( !this.document.isOwner ) return;
    return this.document.rollCharacteristic(target.dataset.characteristic);
  }

  /**
   * Кнопка «Проверка» в шапке: окно проверки с выбором характеристики.
   * @this {VitruviumCharacterSheet}
   */
  static async #onRollCheck(event, target) {
    if ( !this.document.isOwner ) return;
    return this.document.rollCharacteristic();
  }

  /**
   * Кнопка «Заявка» в шапке: заявить действие и цель персонажа.
   * @this {VitruviumCharacterSheet}
   */
  static async #onDeclare(event, target) {
    if ( !this.document.isOwner ) return;
    return game.vitruvium.actions.declare({ actor: this.document });
  }

  /**
   * Установить вдохновение по клику на отметку.
   * Повторный клик по последней заполненной отметке уменьшает запас на 1,
   * поэтому вдохновение можно опустить до нуля.
   * @this {VitruviumCharacterSheet}
   */
  static async #onSetInspiration(event, target) {
    if ( !this.isEditable ) return;
    const clicked = Number(target.dataset.value);
    const current = this.document.system.inspiration.value;
    const value = clicked === current ? clicked - 1 : clicked;
    return this.document.update({ "system.inspiration.value": value });
  }
}
