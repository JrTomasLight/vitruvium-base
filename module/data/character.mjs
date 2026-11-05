import { VITRUVIUM } from "../config.mjs";

const { HTMLField, NumberField, SchemaField, StringField } = foundry.data.fields;

/**
 * Данные персонажа игрока (тип актёра `character`).
 *
 * Хранимые поля:
 * - `tier`             — уровень персонажа (обычный, редкий, выдающийся, легендарный);
 * - `concept`          — краткая концепция героя;
 * - `characteristics`  — шесть характеристик, у каждой `value` от 1 до 3;
 * - `inspiration`      — вдохновение, `value` от 0 до `max` (6);
 * - `biography`        — свободное описание персонажа (HTML).
 *
 * Вычисляемые поля (не сохраняются):
 * - `creation.characteristics` — бюджет очков характеристик по уровню
 *   персонажа и сколько из него потрачено.
 */
export class CharacterData extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    const { min, max } = VITRUVIUM.characteristicRange;
    const characteristics = {};
    for ( const key of Object.keys(VITRUVIUM.characteristics) ) {
      characteristics[key] = new SchemaField({
        value: new NumberField({ required: true, nullable: false, integer: true, min, max, initial: min })
      });
    }

    const inspirationMax = VITRUVIUM.inspiration.max;

    return {
      tier: new StringField({
        required: true,
        blank: false,
        initial: "common",
        choices: Object.keys(VITRUVIUM.tiers)
      }),
      concept: new StringField({ required: true, blank: true }),
      characteristics: new SchemaField(characteristics),
      inspiration: new SchemaField({
        value: new NumberField({
          required: true, nullable: false, integer: true, min: 0, max: inspirationMax, initial: 0
        }),
        max: new NumberField({
          required: true, nullable: false, integer: true, min: 0, max: inspirationMax, initial: inspirationMax
        })
      }),
      biography: new HTMLField({ required: true, blank: true })
    };
  }

  /** @override */
  prepareDerivedData() {
    const budget = VITRUVIUM.tiers[this.tier]?.budget ?? 0;
    const base = VITRUVIUM.characteristicRange.min;
    const spent = Object.values(this.characteristics)
      .reduce((total, characteristic) => total + (characteristic.value - base), 0);

    this.creation = {
      characteristics: {
        budget,
        spent,
        remaining: budget - spent,
        overspent: spent > budget
      }
    };
  }
}
