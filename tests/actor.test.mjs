/**
 * actor.rollCharacteristic (module/documents/actor.mjs) на заглушках Foundry.
 */
import { before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { installFoundry } from "./helpers/foundry.mjs";

let env;
let VitruviumActor;
before(async () => {
  env = await installFoundry();
  ({ VitruviumActor } = await import("../module/documents/actor.mjs"));
});
beforeEach(() => env.reset());

function makeActor(levels = {}) {
  const actor = new VitruviumActor();
  actor.name = "Отто Хорн";
  actor.system = { characteristics: {} };
  for ( const key of Object.keys(CONFIG.VITRUVIUM.characteristics) ) {
    actor.system.characteristics[key] = { value: levels[key] ?? 1 };
  }
  return actor;
}

describe("rollCharacteristic", () => {
  it("с переданной сложностью бросает сразу, без окна", async () => {
    const actor = makeActor({ will: 3 });
    const result = await actor.rollCharacteristic("will", { difficulty: 2 });
    assert.equal(result.rolls[0].formula, "3dv");
    assert.equal(result.difficulty, 2);
  });

  it("пул равен уровню характеристики", async () => {
    const actor = makeActor({ physique: 2, attention: 1 });
    assert.equal((await actor.rollCharacteristic("physique", { difficulty: 1 })).rolls[0].formula, "2dv");
    assert.equal((await actor.rollCharacteristic("attention", { difficulty: 1 })).rolls[0].formula, "1dv");
  });

  it("передаёт преимущества, помехи и режим броска", async () => {
    const actor = makeActor({ movement: 2 });
    const result = await actor.rollCharacteristic("movement", {
      difficulty: 1, advantages: 2, disadvantages: 1, rollMode: "selfroll"
    });
    assert.equal(result.rolls.length, 2);
    assert.equal(env.messages[0].rollMode, "selfroll");
  });

  it("подпись в чате — название характеристики из локализации", async () => {
    const actor = makeActor();
    await actor.rollCharacteristic("thinking", { difficulty: 1 });
    assert.equal(env.messages[0].flags.vitruvium.check.label, "Мышление");
    assert.deepEqual(env.messages[0].speaker, { alias: "Отто Хорн" });
  });

  it("неизвестная характеристика — ошибка", async () => {
    await assert.rejects(makeActor().rollCharacteristic("luck", { difficulty: 1 }), /luck/);
  });

  it("у актёра без характеристик ничего не происходит", async () => {
    const actor = new VitruviumActor();
    actor.system = {};
    assert.equal(await actor.rollCharacteristic("will", { difficulty: 1 }), null);
  });
});
