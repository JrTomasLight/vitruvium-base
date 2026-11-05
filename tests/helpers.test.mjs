/**
 * Чистые помощники без Foundry: склонения, вдохновение, выбор актёра,
 * свободная ячейка панели макросов.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pluralKey } from "../module/helpers/i18n.mjs";
import { addInspiration } from "../module/dice/rules.mjs";
import { pickActors } from "../module/actions/actors.mjs";
import { firstFreeSlot, HOTBAR_SLOTS } from "../module/macros/hotbar.mjs";

describe("Склонения: pluralKey", () => {
  const cases = [[1, "one"], [2, "few"], [4, "few"], [5, "many"], [6, "many"], [11, "many"], [21, "one"], [22, "few"], [0, "many"]];
  for ( const [count, form] of cases ) {
    it(`${count} → ${form}`, () => assert.equal(pluralKey("VITRUVIUM.Check.Dice", count), `VITRUVIUM.Check.Dice.${form}`));
  }
});

describe("Вдохновение: addInspiration", () => {
  it("+1 к запасу", () => assert.equal(addInspiration(3, 1), 4));
  it("не больше максимума 6", () => assert.equal(addInspiration(6, 1), 6));
  it("не меньше 0", () => assert.equal(addInspiration(0, -1), 0));
  it("свой максимум", () => assert.equal(addInspiration(2, 5, 4), 4));
  it("мусор во вводе считается нулём", () => assert.equal(addInspiration(undefined, "x"), 0));
});

describe("Выбор актёра: pickActors", () => {
  const a = { name: "A", ok: true };
  const b = { name: "B", ok: true };
  const npc = { name: "C", ok: false };
  const token = actor => ({ actor });

  it("актёры выбранных токенов, без повторов", () => {
    assert.deepEqual(pickActors({ controlled: [token(a), token(b), token(a)] }), [a, b]);
  });

  it("выбранные токены важнее своего персонажа", () => {
    assert.deepEqual(pickActors({ controlled: [token(b)], character: a }), [b]);
  });

  it("без выбранных токенов — свой персонаж", () => {
    assert.deepEqual(pickActors({ controlled: [], character: a }), [a]);
  });

  it("фильтр отсекает неподходящих; если никто не подошёл — свой персонаж", () => {
    const filter = actor => actor.ok;
    assert.deepEqual(pickActors({ controlled: [token(npc)], character: a, filter }), [a]);
    assert.deepEqual(pickActors({ controlled: [token(npc)], filter }), []);
  });

  it("токен без актёра пропускается", () => {
    assert.deepEqual(pickActors({ controlled: [{ actor: null }, token(a)] }), [a]);
  });
});

describe("Панель макросов: firstFreeSlot", () => {
  it("пустая панель — ячейка 1", () => assert.equal(firstFreeSlot({}), 1));
  it("пропускает занятые", () => assert.equal(firstFreeSlot({ 1: "a", 2: "b" }), 3));
  it("ячейка с удалённым макросом свободна", () => {
    assert.equal(firstFreeSlot({ 1: "a", 2: "gone" }, id => id !== "gone"), 2);
  });
  it("заполненная панель — null", () => {
    const full = Object.fromEntries(Array.from({ length: HOTBAR_SLOTS }, (_, i) => [i + 1, `m${i}`]));
    assert.equal(firstFreeSlot(full), null);
  });
});
