/**
 * Статистика: настоящий код бросков против точных вероятностей.
 *
 * rollCheck бросает много раз со случайными гранями (генератор с зерном,
 * поэтому тест повторяем), и частоты сравниваются с probability.mjs.
 * Так проверяется, что бросок, выбор лучшего/худшего и теория
 * согласованы. Допуск — 5 стандартных отклонений.
 */
import { before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { installFoundry } from "./helpers/foundry.mjs";
import { checkDistribution } from "../module/dice/probability.mjs";

const N = 20000;
let env;
let rollCheck;
before(async () => {
  env = await installFoundry({ seed: 20261105 });
  ({ rollCheck } = await import("../module/dice/check.mjs"));
});

const scenarios = [
  { dice: 1 },
  { dice: 3 },
  { dice: 6 },
  { dice: 3, advantages: 1 },
  { dice: 3, advantages: 2 },
  { dice: 3, disadvantages: 1 },
  { dice: 2, disadvantages: 2 },
  { dice: 4, advantages: 2, disadvantages: 1 }
];

describe("Частоты бросков совпадают с теорией", () => {
  for ( const scenario of scenarios ) {
    it(JSON.stringify(scenario), async () => {
      const expected = checkDistribution(scenario);
      const counts = Array(expected.length).fill(0);
      for ( let i = 0; i < N; i++ ) {
        const { successes } = await rollCheck({ ...scenario, difficulty: 1 });
        counts[successes] += 1;
      }
      env.reset();

      expected.forEach((p, k) => {
        const observed = counts[k] / N;
        const sigma = Math.sqrt((p * (1 - p)) / N);
        const tolerance = (5 * sigma) + 1e-9;
        assert.ok(
          Math.abs(observed - p) <= tolerance,
          `${k} успехов: ожидалось ${p.toFixed(4)}, получено ${observed.toFixed(4)} (допуск ${tolerance.toFixed(4)})`
        );
      });
    });
  }
});
