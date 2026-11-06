import { VITRUVIUM } from "../config.mjs";
import { abilityLimit } from "./creation.mjs";

const { ArrayField, NumberField, SchemaField, StringField } = foundry.data.fields;

/**
 * Данные домена (тип предмета `domain`).
 *
 * Домен — категория способностей персонажа: «Торговля», «Магия призыва».
 * Хранимые поля:
 * - `level`        — уровень домена от 1 до 3;
 * - `description`  — описание домена (обычный текст);
 * - `abilities`    — способности: `name` и `description`. Каждый уровень домена
 *                    открывает 2 способности; лишние не удаляются, а помечаются в листе.
 *
 * Вычисляемые поля: `abilityLimit` — сколько способностей открыто.
 */
export class DomainData extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    const { min, max } = VITRUVIUM.domains.levelRange;
    return {
      level: new NumberField({ required: true, nullable: false, integer: true, min, max, initial: min }),
      description: new StringField({ required: true, blank: true }),
      abilities: new ArrayField(new SchemaField({
        name: new StringField({ required: true, blank: true }),
        description: new StringField({ required: true, blank: true })
      }))
    };
  }

  /** @override */
  prepareDerivedData() {
    this.abilityLimit = abilityLimit(this.level);
  }
}
