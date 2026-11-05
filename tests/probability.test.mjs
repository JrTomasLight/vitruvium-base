/**
 * Точные вероятности (module/dice/probability.mjs). Foundry не нужен.
 *
 * Эталонные значения посчитаны вручную, ход расчёта — в комментариях.
 * Если правила изменятся (грани, пул, преимущества), эти тесты покажут,
 * какие шансы сдвинулись.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  addSuccesses, chanceAtLeast, chanceTable, checkChance, checkDistribution,
  dieDistribution, expectedValue, poolDistribution, withAdvantage
} from "../module/dice/probability.mjs";

const EPS = 1e-12;
const near = (actual, expected, message) =>
  assert.ok(Math.abs(actual - expected) < EPS, `${message ?? ""} ожидалось ${expected}, получено ${actual}`);
const sum = dist => dist.reduce((a, b) => a + b, 0);

describe("Распределение одного кубика", () => {
  it("P(0) = 1/2, P(1) = 1/3, P(2) = 1/6", () => {
    const [p0, p1, p2] = dieDistribution();
    near(p0, 1 / 2);
    near(p1, 1 / 3);
    near(p2, 1 / 6);
  });

  it("в среднем 2/3 успеха на кубик", () => near(expectedValue(dieDistribution()), 2 / 3));
});

describe("Распределение пула", () => {
  it("пул 0 — всегда 0 успехов", () => assert.deepEqual(poolDistribution(0), [1]));

  it("пул 2: 1/4, 1/3, 5/18, 1/9, 1/36", () => {
    // P(1) = 2·(1/2)(1/3); P(2) = 2·(1/2)(1/6) + (1/3)²; P(3) = 2·(1/3)(1/6); P(4) = (1/6)²
    const expected = [1 / 4, 1 / 3, 5 / 18, 1 / 9, 1 / 36];
    poolDistribution(2).forEach((p, k) => near(p, expected[k], `P(${k})`));
  });

  for ( let pool = 1; pool <= 6; pool++ ) {
    it(`пул ${pool}: сумма вероятностей 1, максимум ${2 * pool} успехов, среднее ${2 * pool}/3`, () => {
      const dist = poolDistribution(pool);
      near(sum(dist), 1);
      assert.equal(dist.length, (2 * pool) + 1);
      near(expectedValue(dist), (2 * pool) / 3);
      near(chanceAtLeast(dist, 1), 1 - ((1 / 2) ** pool), "хотя бы один успех:");
      near(dist.at(-1), (1 / 6) ** pool, "все грани по два успеха:");
    });
  }
});

describe("Преимущество и помеха", () => {
  const one = poolDistribution(1);

  it("пул 1, сложность 1: обычно 1/2, с 1 преим. 3/4, с 2 — 7/8", () => {
    near(chanceAtLeast(withAdvantage(one, 0), 1), 1 / 2);
    near(chanceAtLeast(withAdvantage(one, 1), 1), 3 / 4);   // 1 − (1/2)²
    near(chanceAtLeast(withAdvantage(one, 2), 1), 7 / 8);   // 1 − (1/2)³
  });

  it("пул 1, сложность 1: с 1 помехой 1/4, с 2 — 1/8", () => {
    near(chanceAtLeast(withAdvantage(one, -1), 1), 1 / 4);  // (1/2)²
    near(chanceAtLeast(withAdvantage(one, -2), 1), 1 / 8);  // (1/2)³
  });

  it("пул 1, сложность 2: с 1 помехой 1/36", () => {
    near(chanceAtLeast(withAdvantage(one, -1), 2), 1 / 36);  // (1/6)²
  });

  for ( let pool = 1; pool <= 6; pool++ ) {
    for ( const net of [-2, -1, 1, 2] ) {
      it(`пул ${pool}, итог ${net}: распределение корректно`, () => near(sum(withAdvantage(poolDistribution(pool), net)), 1));
    }
  }

  it("преимущество и помеха гасятся: 1 + 1 — как обычный бросок", () => {
    for ( let difficulty = 1; difficulty <= 6; difficulty++ ) {
      near(
        checkChance({ dice: 3, difficulty, advantages: 1, disadvantages: 1 }),
        checkChance({ dice: 3, difficulty })
      );
    }
  });
});

describe("Шанс проверки: свойства", () => {
  const variants = [
    { advantages: 2 }, { advantages: 1 }, {}, { disadvantages: 1 }, { disadvantages: 2 }
  ];

  it("2 преим. ≥ 1 преим. ≥ обычно ≥ 1 помеха ≥ 2 помехи", () => {
    for ( let dice = 1; dice <= 6; dice++ ) {
      for ( let difficulty = 1; difficulty <= 6; difficulty++ ) {
        const chances = variants.map(v => checkChance({ dice, difficulty, ...v }));
        for ( let i = 1; i < chances.length; i++ ) {
          assert.ok(chances[i - 1] >= chances[i] - EPS, `пул ${dice}, сложность ${difficulty}: ${chances}`);
        }
      }
    }
  });

  it("больше кубиков — шанс выше; выше сложность — шанс ниже", () => {
    for ( const v of variants ) {
      const table = chanceTable(v);
      for ( let row = 0; row < table.length; row++ ) {
        for ( let col = 0; col < 6; col++ ) {
          if ( row > 0 ) assert.ok(table[row].chances[col] >= table[row - 1].chances[col] - EPS);
          if ( col > 0 ) assert.ok(table[row].chances[col] <= table[row].chances[col - 1] + EPS);
        }
      }
    }
  });

  it("пул ограничен 6 кубиками, как и в настоящем броске", () => {
    near(checkChance({ dice: 9, difficulty: 6 }), checkChance({ dice: 6, difficulty: 6 }));
  });

  it("сложность ограничена 1–6", () => {
    near(checkChance({ dice: 6, difficulty: 10 }), checkChance({ dice: 6, difficulty: 6 }));
    near(checkChance({ dice: 1, difficulty: 0 }), checkChance({ dice: 1, difficulty: 1 }));
  });

  it("пул 1 против сложности 3 невозможен: максимум 2 успеха", () => {
    assert.equal(checkChance({ dice: 1, difficulty: 3 }), 0);
  });
});

describe("Добавленные успехи (задел для вдохновения и способностей)", () => {
  it("сдвигают распределение", () => {
    assert.deepEqual(addSuccesses([0.5, 0.5], 2), [0, 0, 0.5, 0.5]);
    assert.deepEqual(addSuccesses([1], 0), [1]);
  });

  it("+N успехов к результату = сложность на N меньше", () => {
    for ( let bonus = 1; bonus <= 3; bonus++ ) {
      for ( let difficulty = bonus + 1; difficulty <= 6; difficulty++ ) {
        near(
          checkChance({ dice: 2, difficulty, bonusSuccesses: bonus }),
          checkChance({ dice: 2, difficulty: difficulty - bonus })
        );
      }
    }
  });

  it("если бонус не меньше сложности, успех гарантирован", () => {
    near(checkChance({ dice: 1, difficulty: 2, bonusSuccesses: 2 }), 1);
  });

  it("распределение с бонусом остаётся корректным", () => {
    near(sum(checkDistribution({ dice: 4, advantages: 2, bonusSuccesses: 3 })), 1);
  });
});
