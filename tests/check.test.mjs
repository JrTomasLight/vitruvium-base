/**
 * Проверка характеристики (module/dice/check.mjs) на заглушках Foundry:
 * бросок с заданными гранями, выбор броска, ограничения, данные сообщения.
 */
import { before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { installFoundry } from "./helpers/foundry.mjs";

let env;
let rollCheck;
before(async () => {
  env = await installFoundry();
  ({ rollCheck } = await import("../module/dice/check.mjs"));
});
beforeEach(() => env.reset());

const totals = result => result.rolls.map(roll => roll.total);

describe("rollCheck: базовый бросок", () => {
  it("пул 3, грани 6/4/1 → 3 успеха; сложность 3 — успех", async () => {
    env.queueFaces([6, 4, 1]);
    const result = await rollCheck({ label: "Телосложение", dice: 3, difficulty: 3 });
    assert.equal(result.rolls.length, 1);
    assert.equal(result.successes, 3);
    assert.equal(result.success, true);
  });

  it("те же грани против сложности 4 — провал", async () => {
    env.queueFaces([6, 4, 1]);
    const result = await rollCheck({ dice: 3, difficulty: 4 });
    assert.equal(result.successes, 3);
    assert.equal(result.success, false);
  });

  it("формула броска — NdV по размеру пула", async () => {
    const result = await rollCheck({ dice: 2, difficulty: 1 });
    assert.equal(result.rolls[0].formula, "2dv");
  });
});

describe("rollCheck: преимущества и помехи", () => {
  it("1 преимущество: два броска, засчитан лучший", async () => {
    env.queueFaces([1, 1, 1, 6, 6, 6]);
    const result = await rollCheck({ dice: 3, difficulty: 2, advantages: 1 });
    assert.deepEqual(totals(result), [0, 6]);
    assert.equal(result.chosenIndex, 1);
    assert.equal(result.successes, 6);
    assert.equal(result.success, true);
  });

  it("1 помеха: два броска, засчитан худший", async () => {
    env.queueFaces([6, 6, 6, 1, 1, 1]);
    const result = await rollCheck({ dice: 3, difficulty: 2, disadvantages: 1 });
    assert.deepEqual(totals(result), [6, 0]);
    assert.equal(result.chosenIndex, 1);
    assert.equal(result.success, false);
  });

  it("2 преимущества: три броска", async () => {
    env.queueFaces([4, 1, 6]);
    const result = await rollCheck({ dice: 1, difficulty: 1, advantages: 2 });
    assert.deepEqual(totals(result), [1, 0, 2]);
    assert.equal(result.chosenIndex, 2);
  });

  it("равные результаты: засчитан более ранний", async () => {
    env.queueFaces([4, 1, 5, 1]);
    const result = await rollCheck({ dice: 2, difficulty: 1, advantages: 1 });
    assert.deepEqual(totals(result), [1, 1]);
    assert.equal(result.chosenIndex, 0);
  });

  it("2 преимущества и 1 помеха: два броска, лучший", async () => {
    env.queueFaces([1, 6]);
    const result = await rollCheck({ dice: 1, difficulty: 1, advantages: 2, disadvantages: 1 });
    assert.equal(result.rolls.length, 2);
    assert.equal(result.chosenIndex, 1);
  });

  it("преимущества и помехи поровну: один бросок", async () => {
    const result = await rollCheck({ dice: 2, difficulty: 1, advantages: 2, disadvantages: 2 });
    assert.equal(result.rolls.length, 1);
  });

  it("больше двух не бывает: 5 преимуществ — три броска", async () => {
    const result = await rollCheck({ dice: 1, difficulty: 1, advantages: 5 });
    assert.equal(result.rolls.length, 3);
  });
});

describe("rollCheck: ограничения правил", () => {
  it("пул больше 6 урезается до 6 с уведомлением", async () => {
    const result = await rollCheck({ dice: 8, difficulty: 1 });
    assert.equal(result.rolls[0].formula, "6dv");
    assert.equal(env.notifications.length, 1);
    assert.match(env.notifications[0], /6/);
    assert.match(env.notifications[0], /8/);
  });

  it("пул 0 превращается в 1 кубик без уведомления", async () => {
    const result = await rollCheck({ dice: 0, difficulty: 1 });
    assert.equal(result.rolls[0].formula, "1dv");
    assert.equal(env.notifications.length, 0);
  });

  it("сложность ограничена 1–6", async () => {
    assert.equal((await rollCheck({ dice: 1, difficulty: 9 })).difficulty, 6);
    assert.equal((await rollCheck({ dice: 1, difficulty: 0 })).difficulty, 1);
  });
});

describe("rollCheck: сообщение в чате", () => {
  it("содержит все броски, флаги проверки и подпись", async () => {
    env.queueFaces([6, 1, 4, 4]);
    const actor = { name: "Отто Хорн" };
    await rollCheck({ actor, label: "Воля", dice: 2, difficulty: 2, advantages: 1 });

    assert.equal(env.messages.length, 1);
    const message = env.messages[0];
    assert.equal(message.rolls.length, 2);
    assert.deepEqual(message.speaker, { alias: "Отто Хорн" });
    assert.match(message.flavor, /Воля/);
    assert.equal(message.sound, CONFIG.sounds.dice);
    assert.deepEqual(message.flags.vitruvium.check, {
      label: "Воля", pool: 2, difficulty: 2, net: 1, successes: 2, success: true, chosenIndex: 0
    });
  });

  it("режим броска: по умолчанию из настроек чата, можно передать явно", async () => {
    env.rollMode = "gmroll";
    await rollCheck({ dice: 1, difficulty: 1 });
    await rollCheck({ dice: 1, difficulty: 1, rollMode: "blindroll" });
    assert.deepEqual(env.messages.map(m => m.rollMode), ["gmroll", "blindroll"]);
    env.rollMode = "publicroll";
  });

  it("данные для карточки: грани, отметки успехов, засчитанный бросок", async () => {
    env.queueFaces([1, 4, 6, 6, 6, 6]);
    await rollCheck({ label: "Внимание", dice: 3, difficulty: 6, disadvantages: 1 });
    const { template, data } = env.renders.at(-1);

    assert.equal(template, "systems/vitruvium/templates/chat/check-card.hbs");
    assert.equal(data.pool, 3);
    assert.equal(data.multiple, true);
    assert.equal(data.success, false);
    assert.equal(data.chosenHint, "VITRUVIUM.Check.ChosenWorst");
    assert.match(data.modeLabel, /помеха/);
    assert.deepEqual(data.attempts.map(a => a.chosen), [true, false]);
    assert.deepEqual(data.attempts[0].dice.map(d => d.successes), [0, 1, 2]);
    assert.deepEqual(data.attempts[0].dice.map(d => d.marks.length), [0, 1, 2]);
    assert.deepEqual(data.attempts[0].dice.map(d => d.label), ["Пустая грань", "Один успех", "Два успеха"]);
  });

  it("без преимуществ и помех подписи режима нет", async () => {
    await rollCheck({ dice: 1, difficulty: 1 });
    const { data } = env.renders.at(-1);
    assert.equal(data.modeLabel, "");
    assert.equal(data.multiple, false);
  });
});
