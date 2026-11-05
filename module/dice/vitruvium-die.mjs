import { VITRUVIUM } from "../config.mjs";
import { successesOnFace } from "./rules.mjs";

/**
 * Кубик «Витрувия»: особый шестигранник.
 *
 * Грани: три пустые, две с одним успехом, одна с двумя
 * (см. `VITRUVIUM.dice.faces`). Внутри Foundry кубик бросается как обычный
 * d6, а в итог броска идёт не номер грани, а число успехов на ней.
 * Поэтому `Roll#total` формулы `3dv` — это сумма успехов.
 *
 * В формулах кубик обозначается `dv`: `/r 3dv`.
 */
export class VitruviumDie extends foundry.dice.terms.Die {
  constructor(termData = {}) {
    termData.faces = VITRUVIUM.dice.faces.length;
    super(termData);
  }

  /** @override */
  static DENOMINATION = VITRUVIUM.dice.denomination;

  /**
   * Сколько успехов на грани кубика.
   * @param {number} face  Номер грани, от 1 до 6.
   * @returns {number}
   */
  static successesOn(face) {
    return successesOnFace(face);
  }

  /**
   * Сумма успехов по активным результатам броска.
   * @override
   */
  get total() {
    if ( !this._evaluated ) return undefined;
    return this.results.reduce((total, result) => {
      if ( !result.active ) return total;
      return total + VitruviumDie.successesOn(result.result);
    }, 0);
  }

  /**
   * Подпись грани в стандартной подсказке броска Foundry.
   * @override
   */
  getResultLabel(result) {
    const successes = VitruviumDie.successesOn(result.result);
    return successes ? "✦".repeat(successes) : "–";
  }

  /**
   * CSS-классы грани в стандартной подсказке броска Foundry.
   * @override
   */
  getResultCSS(result) {
    const css = super.getResultCSS(result);
    const successes = VitruviumDie.successesOn(result.result);
    // Стандартные отметки «минимум» и «максимум» для наших граней бессмысленны.
    return css
      .filter(cls => (cls !== "min") && (cls !== "max"))
      .concat("vitruvium-die", `successes-${successes}`);
  }
}
