const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

/**
 * Лист домена: название, уровень, описание и способности.
 * Поля сохраняются сразу при изменении.
 */
export class VitruviumDomainSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["vitruvium", "domain-sheet"],
    position: { width: 520, height: "auto" },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      editIcon: VitruviumDomainSheet.#onEditIcon,
      setLevel: VitruviumDomainSheet.#onSetLevel,
      addAbility: VitruviumDomainSheet.#onAddAbility,
      removeAbility: VitruviumDomainSheet.#onRemoveAbility,
      share: VitruviumDomainSheet.#onShare
    }
  };

  /** @override */
  static PARTS = {
    form: { template: "systems/vitruvium/templates/item/domain-sheet.hbs", scrollable: [".abilities"] }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const item = this.document;
    const { min, max } = CONFIG.VITRUVIUM.domains.levelRange;
    const levelPips = [];
    for ( let value = min; value <= max; value++ ) {
      levelPips.push({
        value,
        filled: value <= item.system.level,
        label: game.i18n.format("VITRUVIUM.Domain.SetLevel", { value })
      });
    }
    const limit = item.system.abilityLimit;
    return Object.assign(context, {
      item,
      system: item.system,
      editable: this.isEditable,
      levelPips,
      abilities: item.system.abilities.map((ability, index) => ({ ...ability, index, locked: index >= limit })),
      abilityCount: game.i18n.format("VITRUVIUM.Domain.AbilityCount", { count: item.system.abilities.length, limit }),
      canAdd: this.isEditable && (item.system.abilities.length < limit)
    });
  }

  /**
   * Поля способностей приходят из формы объектом { "0": {...}, "1": {...} }:
   * превращаем его в массив, как хранит ArrayField.
   * @override
   */
  _processFormData(event, form, formData) {
    const data = super._processFormData(event, form, formData);
    const abilities = data.system?.abilities;
    if ( abilities && !Array.isArray(abilities) ) {
      data.system.abilities = Object.entries(abilities)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([, ability]) => ability);
    }
    return data;
  }

  /** @this {VitruviumDomainSheet} */
  static async #onEditIcon() {
    if ( !this.isEditable ) return;
    const picker = new foundry.applications.apps.FilePicker.implementation({
      type: "image",
      current: this.document.img,
      callback: path => this.document.update({ img: path })
    });
    return picker.browse();
  }

  /** @this {VitruviumDomainSheet} */
  static async #onSetLevel(event, target) {
    if ( !this.isEditable ) return;
    return this.document.update({ "system.level": Number(target.dataset.value) });
  }

  /** @this {VitruviumDomainSheet} */
  static async #onAddAbility() {
    if ( !this.isEditable ) return;
    const abilities = [...this.document.system.toObject().abilities, { name: "", description: "" }];
    return this.document.update({ "system.abilities": abilities });
  }

  /** @this {VitruviumDomainSheet} */
  static async #onRemoveAbility(event, target) {
    if ( !this.isEditable ) return;
    const index = Number(target.dataset.index);
    const abilities = this.document.system.toObject().abilities.filter((_, i) => i !== index);
    return this.document.update({ "system.abilities": abilities });
  }

  /** @this {VitruviumDomainSheet} */
  static async #onShare(event, target) {
    const index = target.dataset.index;
    return game.vitruvium.actions.shareAbility({
      actor: this.document.actor,
      domain: this.document,
      abilityIndex: index === undefined ? undefined : Number(index)
    });
  }
}
