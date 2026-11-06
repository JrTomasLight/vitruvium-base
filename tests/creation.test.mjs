/**
 * Бюджеты создания персонажа: способности по уровню домена, очки доменов.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { abilityLimit, domainBudget } from "../module/data/creation.mjs";
import { VITRUVIUM } from "../module/config.mjs";

describe("Способности в домене", () => {
  it("каждый уровень домена открывает 2 способности", () => {
    assert.deepEqual([1, 2, 3].map(abilityLimit), [2, 4, 6]);
  });

  it("неверный уровень — ноль способностей", () => {
    assert.equal(abilityLimit(undefined), 0);
    assert.equal(abilityLimit(-1), 0);
  });
});

describe("Очки доменов", () => {
  it("каждый уровень домена стоит одно очко", () => {
    assert.deepEqual(domainBudget([2, 2, 1], 6),
      { budget: 6, spent: 5, remaining: 1, overspent: false, count: 3, tooMany: false });
  });

  it("перерасход и слишком много доменов", () => {
    const budget = domainBudget([1, 1, 1, 1, 1, 1, 1], 3);
    assert.equal(budget.overspent, true);
    assert.equal(budget.tooMany, true);
    assert.equal(budget.remaining, -4);
  });

  it("без доменов ничего не потрачено", () => {
    assert.equal(domainBudget([], 12).spent, 0);
  });

  it("константы правил: до 6 доменов, уровень 1–3", () => {
    assert.equal(VITRUVIUM.domains.maxCount, 6);
    assert.deepEqual(VITRUVIUM.domains.levelRange, { min: 1, max: 3 });
  });
});
