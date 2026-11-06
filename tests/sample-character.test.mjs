/**
 * Пример персонажа (рыцарь Георг Лиззул): данные укладываются в правила,
 * и при загрузке мира он создаётся один раз.
 */
import { before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { installFoundry } from "./helpers/foundry.mjs";
import { VITRUVIUM } from "../module/config.mjs";
import { abilityLimit, domainBudget } from "../module/data/creation.mjs";

let sample;
before(async () => {
  await installFoundry();
  sample = await import("../module/world/sample-character.mjs");
});

describe("Данные примера", () => {
  it("характеристики — в бюджете уровня и в пределах 1–3", () => {
    const { tier, characteristics } = sample.SAMPLE_CHARACTER.system;
    const { min, max } = VITRUVIUM.characteristicRange;
    assert.deepEqual(Object.keys(characteristics).sort(), Object.keys(VITRUVIUM.characteristics).sort());
    const values = Object.values(characteristics).map(c => c.value);
    assert.ok(values.every(v => (v >= min) && (v <= max)));
    const spent = values.reduce((sum, v) => sum + (v - min), 0);
    assert.ok(spent <= VITRUVIUM.tiers[tier].budget, `потрачено ${spent}`);
  });

  it("домены — в бюджете, способностей не больше, чем открывает уровень", () => {
    const { tier } = sample.SAMPLE_CHARACTER.system;
    const domains = sample.SAMPLE_CHARACTER.items.filter(i => i.type === "domain");
    const budget = domainBudget(domains.map(d => d.system.level), VITRUVIUM.tiers[tier].budget);
    assert.equal(budget.overspent, false);
    assert.equal(budget.tooMany, false);
    for ( const domain of domains ) {
      assert.ok(domain.system.abilities.length <= abilityLimit(domain.system.level), domain.name);
      assert.ok(domain.system.abilities.every(a => a.name && a.description), domain.name);
    }
  });

  it("вдохновение не больше максимума", () => {
    const { inspiration } = sample.SAMPLE_CHARACTER.system;
    assert.ok(inspiration.value <= VITRUVIUM.inspiration.max);
  });
});

describe("Создание при загрузке мира", () => {
  function world({ gm = true, created = false } = {}) {
    const state = { actors: [], folders: [], settings: { sampleCharacterCreated: created }, notices: [] };
    const flagged = data => ({ ...data, getFlag(scope, key) { return this.flags?.[scope]?.[key]; } });
    game.users = { activeGM: { isSelf: gm } };
    game.settings.get = (scope, key) => state.settings[key];
    game.settings.set = async (scope, key, value) => { state.settings[key] = value; };
    game.folders = { find: fn => state.folders.find(fn) };
    ui.notifications.info = message => state.notices.push(message);
    foundry.utils.deepClone = value => structuredClone(value);
    foundry.documents.Folder = { create: async data => { const f = flagged({ id: "f1", ...data }); state.folders.push(f); return f; } };
    foundry.documents.Actor = { create: async data => { state.actors.push(data); return data; } };
    return state;
  }

  it("мастер создаёт персонажа один раз, в папке «Витрувий»", async () => {
    const state = world();
    await sample.ensureSampleCharacter();
    await sample.ensureSampleCharacter();
    assert.equal(state.actors.length, 1);
    assert.equal(state.actors[0].name, "Георг Лиззул");
    assert.equal(state.actors[0].folder, "f1");
    assert.equal(state.actors[0].items.length, 3);
    assert.equal(state.settings.sampleCharacterCreated, true);
    assert.equal(state.notices.length, 1);
  });

  it("не мастер или уже создан — ничего не происходит", async () => {
    for ( const options of [{ gm: false }, { created: true }] ) {
      const state = world(options);
      await sample.ensureSampleCharacter();
      assert.equal(state.actors.length, 0);
    }
  });
});
