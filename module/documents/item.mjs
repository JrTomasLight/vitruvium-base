/**
 * Класс предмета системы «Витрувий».
 * Пока у системы один тип предметов — домен (`domain`).
 */
export class VitruviumItem extends foundry.documents.Item {
  /** Картинка домена по умолчанию — значок способности системы. */
  static DEFAULT_ICONS = {
    domain: "systems/vitruvium/assets/icons/ability.svg"
  };

  /** @override */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if ( allowed === false ) return false;
    const icon = VitruviumItem.DEFAULT_ICONS[this.type];
    if ( icon && (!data.img || (data.img === foundry.documents.Item.DEFAULT_ICON)) ) {
      this.updateSource({ img: icon });
    }
  }
}
