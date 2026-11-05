import { VITRUVIUM } from "../config.mjs";

/**
 * Необязательная поддержка модуля Dice So Nice!
 *
 * Если модуль включён, кубик `dv` показывается в 3D с символами успехов
 * на гранях. Если модуля нет, хук `diceSoNiceReady` не вызывается
 * и этот код ничего не делает.
 */
export function registerDiceSoNice() {
  Hooks.once("diceSoNiceReady", dice3d => {
    const systemId = "vitruvium";
    const title = game.i18n.localize("VITRUVIUM.SystemTitle");

    dice3d.addSystem({ id: systemId, name: title }, "preferred");

    // Цвета в духе листа: пергамент и сангина.
    dice3d.addColorset({
      name: "vitruvium-parchment",
      description: game.i18n.localize("VITRUVIUM.DiceSoNice.Colorset"),
      category: title,
      foreground: "#a4442a",
      background: "#f3e9d2",
      outline: "#3b2a1a",
      edge: "#b08d3c",
      texture: "none",
      material: "plastic"
    }, "preferred");

    // Подпись грани: пустая грань — пробел, успехи — звёздочки.
    const labels = VITRUVIUM.dice.faces.map(successes => successes ? "✦".repeat(successes) : " ");
    dice3d.addDicePreset({
      type: `d${VITRUVIUM.dice.denomination}`,
      labels,
      system: systemId,
      colorset: "vitruvium-parchment"
    }, "d6");
  });
}
