/**
 * Быстрые действия (module/actions/*) на заглушках Foundry:
 * проверка, заявка, свободный бросок, выдача вдохновения.
 */
import { before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { FakeActor, installFoundry } from "./helpers/foundry.mjs";

let env;
let actions;
let advantageLabel;
before(async () => {
  env = await installFoundry();
  ({ actions } = await import("../module/actions/index.mjs"));
  ({ advantageLabel } = await import("../module/dice/check.mjs"));
});
beforeEach(() => env.reset());

const character = (options = {}) => new FakeActor({
  system: { characteristics: { will: { value: 2 } }, inspiration: { value: 3, max: 6 } },
  ...options
});

describe("Проверка: actions.check", () => {
  it("без выбранного токена и персонажа — подсказка, без броска", async () => {
    assert.equal(await actions.check(), null);
    assert.equal(env.warnings.length, 1);
  });

  it("берёт назначенного персонажа", async () => {
    const actor = character();
    game.user.character = actor;
    await actions.check();
    assert.equal(actor.rolled, "(окно)");
  });

  it("выбранный токен важнее назначенного персонажа", async () => {
    const own = character({ name: "Свой" });
    const selected = character({ name: "Выбранный" });
    game.user.character = own;
    canvas.ready = true;
    canvas.tokens.controlled = [{ actor: selected }];
    await actions.check({ characteristic: "will" });
    assert.equal(selected.rolled, "will");
    assert.equal(own.rolled, undefined);
  });

  it("чужой токен не подходит", async () => {
    canvas.ready = true;
    canvas.tokens.controlled = [{ actor: character({ isOwner: false }) }];
    assert.equal(await actions.check(), null);
    assert.equal(env.warnings.length, 1);
  });
});

describe("Заявка: actions.declare", () => {
  it("с переданным действием — сразу карточка в чате", async () => {
    const actor = character();
    await actions.declare({ actor, action: "Лезу на стену", goal: "Попасть внутрь" });
    const message = env.messages.at(-1);
    assert.deepEqual(message.flags.vitruvium.declaration, {
      actorUuid: actor.uuid, action: "Лезу на стену", goal: "Попасть внутрь"
    });
    assert.deepEqual(message.speaker, { alias: "Отто Хорн" });
    const { template, data } = env.renders.at(-1);
    assert.equal(template, "systems/vitruvium/templates/chat/declaration-card.hbs");
    assert.deepEqual(data, { action: "Лезу на стену", goal: "Попасть внутрь" });
  });

  it("без действия открывает окно и берёт ответ из него", async () => {
    env.queueDialog({ action: "  Торгуюсь с купцом  ", goal: " Скидка " });
    await actions.declare({ actor: character() });
    assert.deepEqual(env.messages.at(-1).flags.vitruvium.declaration.action, "Торгуюсь с купцом");
    assert.deepEqual(env.messages.at(-1).flags.vitruvium.declaration.goal, "Скидка");
  });

  it("пустое действие — подсказка, без карточки", async () => {
    env.queueDialog({ action: "   ", goal: "" });
    assert.equal(await actions.declare({ actor: character() }), null);
    assert.equal(env.messages.length, 0);
    assert.equal(env.warnings.length, 1);
  });

  it("окно закрыто — ничего не происходит", async () => {
    env.queueDialog(null);
    assert.equal(await actions.declare({ actor: character() }), null);
    assert.equal(env.messages.length, 0);
  });
});

describe("Свободный бросок: actions.rollDice", () => {
  it("бросает N кубиков без сложности", async () => {
    env.queueFaces([6, 4, 1]);
    const result = await actions.rollDice({ dice: 3 });
    assert.equal(result.successes, 3);
    assert.equal(result.rolls[0].formula, "3dv");
    const { data } = env.renders.at(-1);
    assert.equal(data.hasDifficulty, false);
    assert.equal(data.outcomeClass, "");
    assert.equal(data.poolLabel, "3 кубика");
    assert.deepEqual(env.messages.at(-1).flags.vitruvium.roll, { label: "Бросок кубиков", pool: 3, successes: 3 });
  });

  it("без числа кубиков спрашивает его в окне", async () => {
    env.queueDialog({ dice: "5" });
    const result = await actions.rollDice();
    assert.equal(result.rolls[0].formula, "5dv");
  });

  it("пул ограничен 6 кубиками", async () => {
    const result = await actions.rollDice({ dice: 9 });
    assert.equal(result.rolls[0].formula, "6dv");
  });

  it("окно закрыто — броска нет", async () => {
    env.queueDialog(null);
    assert.equal(await actions.rollDice(), null);
    assert.equal(env.messages.length, 0);
  });
});

describe("Вдохновение: actions.awardInspiration", () => {
  it("игроку недоступно", async () => {
    assert.equal(await actions.awardInspiration({ actors: [character()] }), null);
    assert.equal(env.warnings.length, 1);
  });

  it("мастер выдаёт +1, но не больше 6", async () => {
    game.user.isGM = true;
    const otto = character();
    const lucia = character({ name: "Лючия", system: { characteristics: {}, inspiration: { value: 6, max: 6 } } });
    await actions.awardInspiration({ actors: [otto, lucia] });
    assert.equal(otto.system.inspiration.value, 4);
    assert.equal(lucia.updates.length, 0);
    assert.deepEqual(env.messages.at(-1).flags.vitruvium.inspiration.rows, [
      { name: "Отто Хорн", value: 4, max: 6, capped: false },
      { name: "Лючия", value: 6, max: 6, capped: true }
    ]);
  });

  it("без выбранных токенов — подсказка", async () => {
    game.user.isGM = true;
    assert.equal(await actions.awardInspiration(), null);
    assert.equal(env.warnings.length, 1);
  });

  it("по умолчанию — актёры выбранных токенов с вдохновением", async () => {
    game.user.isGM = true;
    canvas.ready = true;
    const otto = character();
    const statue = new FakeActor({ name: "Статуя", system: {} });
    canvas.tokens.controlled = [{ actor: otto }, { actor: statue }];
    await actions.awardInspiration();
    assert.equal(otto.system.inspiration.value, 4);
    assert.equal(env.messages.at(-1).flags.vitruvium.inspiration.rows.length, 1);
  });
});

describe("Подпись режима броска", () => {
  it("по итогу преимуществ и помех", () => {
    assert.equal(advantageLabel(0), "");
    assert.equal(advantageLabel(1), "Преимущество");
    assert.equal(advantageLabel(2), "Два преимущества");
    assert.equal(advantageLabel(-1), "Помеха");
    assert.equal(advantageLabel(-2), "Две помехи");
  });
});
