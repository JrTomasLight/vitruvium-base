/**
 * Кубик dv (module/dice/vitruvium-die.mjs) на заглушках Foundry.
 */
import { before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { installFoundry } from "./helpers/foundry.mjs";

let VitruviumDie;
before(async () => {
  await installFoundry();
  ({ VitruviumDie } = await import("../module/dice/vitruvium-die.mjs"));
});

const dieWith = (faces, { inactive = [] } = {}) => {
  const die = new VitruviumDie({ number: faces.length });
  die.results = faces.map((result, i) => ({ result, active: !inactive.includes(i) }));
  die._evaluated = true;
  return die;
};

describe("Кубик dv", () => {
  it("обозначается буквой v и имеет 6 граней", () => {
    assert.equal(VitruviumDie.DENOMINATION, "v");
    assert.equal(new VitruviumDie({ number: 2 }).faces, 6);
  });

  it("регистрируется в CONFIG.Dice.terms", () => {
    assert.equal(CONFIG.Dice.terms.v, VitruviumDie);
  });

  it("итог — сумма успехов, а не сумма граней", () => {
    assert.equal(dieWith([1, 2, 3, 4, 5, 6]).total, 4);
    assert.equal(dieWith([6, 6, 6]).total, 6);
    assert.equal(dieWith([1, 2, 3]).total, 0);
  });

  it("неактивные результаты (например, отброшенные) не считаются", () => {
    assert.equal(dieWith([6, 6, 4], { inactive: [0] }).total, 3);
  });

  it("до броска итога нет", () => {
    assert.equal(new VitruviumDie({ number: 3 }).total, undefined);
  });

  it("подписи граней: –, ✦, ✦✦", () => {
    const die = new VitruviumDie();
    assert.deepEqual([1, 4, 6].map(result => die.getResultLabel({ result })), ["–", "✦", "✦✦"]);
  });

  it("CSS: без отметок min/max d6, с числом успехов", () => {
    const die = new VitruviumDie();
    const css1 = die.getResultCSS({ result: 1 });
    const css6 = die.getResultCSS({ result: 6 });
    assert.ok(!css1.includes("min") && !css6.includes("max"));
    assert.ok(css1.includes("successes-0") && css6.includes("successes-2"));
    assert.ok(css6.includes("vitruvium-die"));
  });
});
