import { rollCheck } from "../dice/check.mjs";
import { promptCheck } from "../dice/check-dialog.mjs";

/**
 * Класс актёра системы «Витрувий».
 */
export class VitruviumActor extends foundry.documents.Actor {
  /**
   * Проверка характеристики.
   *
   * Без параметров открывает окно проверки, где игрок выбирает сложность,
   * преимущества и помехи. Если передать `difficulty`, бросок делается сразу,
   * без окна (удобно для макросов):
   * `actor.rollCharacteristic("physique", { difficulty: 2, advantages: 1 })`.
   *
   * @param {string} characteristic  Ключ характеристики из `CONFIG.VITRUVIUM.characteristics`.
   * @param {object} [options]
   * @param {number} [options.difficulty]     Сложность (1–6).
   * @param {number} [options.advantages]     Преимущества (0–2).
   * @param {number} [options.disadvantages]  Помехи (0–2).
   * @param {string} [options.rollMode]       Режим броска.
   * @returns {Promise<object|null>}  Результат проверки или `null`, если бросок отменён.
   */
  async rollCharacteristic(characteristic, options = {}) {
    if ( !this.system.characteristics ) return null;

    let check = { characteristic, ...options };
    if ( check.difficulty === undefined ) {
      check = await promptCheck({ actor: this, characteristic });
      if ( !check ) return null;
    }

    const config = CONFIG.VITRUVIUM.characteristics[check.characteristic];
    const value = this.system.characteristics[check.characteristic]?.value;
    if ( !config || (value === undefined) ) {
      throw new Error(`Витрувий | Неизвестная характеристика: ${check.characteristic}`);
    }

    return rollCheck({
      actor: this,
      label: game.i18n.localize(config.label),
      dice: value,
      difficulty: check.difficulty,
      advantages: check.advantages,
      disadvantages: check.disadvantages,
      rollMode: options.rollMode
    });
  }

  /**
   * Настройки токена по умолчанию для нового персонажа игрока.
   * Персонаж — уникальный герой, поэтому токен связан с актёром:
   * изменения на сцене попадают в лист. Ещё токен дружелюбен и видит.
   * Если при создании настройки токена переданы явно
   * (импорт, дублирование), они имеют приоритет.
   * @override
   */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if ( allowed === false ) return false;

    if ( this.type === "character" ) {
      const defaults = {
        actorLink: true,
        disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
        sight: { enabled: true }
      };
      const prototypeToken = foundry.utils.mergeObject(defaults, data.prototypeToken ?? {}, { inplace: false });
      this.updateSource({ prototypeToken });
    }
  }
}
