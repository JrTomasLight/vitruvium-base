/**
 * Чистые правила проверки (module/dice/rules.mjs). Foundry не нужен.
 * Источник: Beta 3.1, «Проверка характеристики», «Преимущества и помехи».
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { VITRUVIUM } from "../module/config.mjs";
import {
  attemptCount, chooseAttempt, clampDifficulty, clampPool, isSuccess, netAdvantage, successesOnFace
} from "../module/dice/rules.mjs";

describe("Кубик: грани", () => {
  it("3 пустые грани, 2 с одним успехом, 1 с двумя", () => {
    const faces = [1, 2, 3, 4, 5, 6].map(successesOnFace);
    assert.equal(faces.filter(s => s === 0).length, 3);
    assert.equal(faces.filter(s => s === 1).length, 2);
    assert.equal(faces.filter(s => s === 2).length, 1);
  });

  it("порядок граней: 1–3 пустые, 4–5 один успех, 6 два", () => {
    assert.deepEqual([1, 2, 3, 4, 5, 6].map(successesOnFace), [0, 0, 0, 1, 1, 2]);
  });

  it("несуществующая грань даёт 0 успехов", () => {
    assert.equal(successesOnFace(0), 0);
    assert.equal(successesOnFace(7), 0);
  });
});

describe("Пул кубиков: от 1 до 6", () => {
  for ( const [dice, expected] of [[1, 1], [3, 3], [6, 6], [7, 6], [12, 6], [0, 1], [-2, 1], [2.9, 2], ["4", 4], [undefined, 1], [NaN, 1]] ) {
    it(`${String(dice)} → ${expected}`, () => assert.equal(clampPool(dice), expected));
  }

  it("границы берутся из config.mjs", () => {
    assert.equal(clampPool(100), VITRUVIUM.dice.maxPool);
    assert.equal(clampPool(-100), VITRUVIUM.dice.minPool);
  });
});

describe("Сложность: от 1 до 6", () => {
  for ( const [difficulty, expected] of [[1, 1], [4, 4], [6, 6], [9, 6], [0, 1], [-1, 1], ["3", 3], [undefined, 1]] ) {
    it(`${String(difficulty)} → ${expected}`, () => assert.equal(clampDifficulty(difficulty), expected));
  }
});

describe("Преимущества и помехи", () => {
  const cases = [
    // [преимущества, помехи, итог, всего бросков]
    [0, 0, 0, 1],
    [1, 0, 1, 2],
    [2, 0, 2, 3],
    [0, 1, -1, 2],
    [0, 2, -2, 3],
    [1, 1, 0, 1],   // взаимно гасятся
    [2, 1, 1, 2],
    [1, 2, -1, 2],
    [2, 2, 0, 1],
    [3, 0, 2, 3],   // больше двух не бывает
    [5, 1, 1, 2],   // сначала ограничение до 2, потом гашение
    [0, 4, -2, 3]
  ];
  for ( const [adv, dis, net, attempts] of cases ) {
    it(`${adv} преим. и ${dis} пом. → итог ${net}, бросков ${attempts}`, () => {
      assert.equal(netAdvantage(adv, dis), net);
      assert.equal(attemptCount(netAdvantage(adv, dis)), attempts);
    });
  }

  it("без аргументов — обычный бросок", () => assert.equal(netAdvantage(), 0));
  it("мусор во вводе считается нулём", () => assert.equal(netAdvantage("abc", null), 0));
});

describe("Какой бросок засчитать", () => {
  it("без преимуществ и помех — единственный", () => {
    assert.equal(chooseAttempt([3], 0), 0);
  });

  it("преимущество — лучший", () => {
    assert.equal(chooseAttempt([1, 4], 1), 1);
    assert.equal(chooseAttempt([2, 0, 5], 2), 2);
    assert.equal(chooseAttempt([5, 0, 2], 2), 0);
  });

  it("помеха — худший", () => {
    assert.equal(chooseAttempt([1, 4], -1), 0);
    assert.equal(chooseAttempt([3, 2, 0], -2), 2);
  });

  it("при равенстве — более ранний бросок", () => {
    assert.equal(chooseAttempt([2, 2, 2], 2), 0);
    assert.equal(chooseAttempt([1, 3, 3], 2), 1);
    assert.equal(chooseAttempt([3, 1, 1], -2), 1);
  });
});

describe("Итог проверки", () => {
  it("успехов не меньше сложности — успех", () => {
    assert.equal(isSuccess(3, 3), true);
    assert.equal(isSuccess(5, 3), true);
  });

  it("успехов меньше сложности — провал", () => {
    assert.equal(isSuccess(2, 3), false);
    assert.equal(isSuccess(0, 1), false);
  });
});
