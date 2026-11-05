/**
 * Класс актёра системы «Витрувий».
 */
export class VitruviumActor extends foundry.documents.Actor {
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
