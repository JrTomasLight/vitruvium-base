import { VitruviumDie } from "./vitruvium-die.mjs";
import { formatCount } from "../helpers/i18n.mjs";
import {
  attemptCount, chooseAttempt, clampDifficulty, clampPool, isSuccess, netAdvantage, successesOnFace
} from "./rules.mjs";

// Чистые правила доступны и отсюда, чтобы не менять существующий импорт.
export { clampPool, netAdvantage };

const CHAT_TEMPLATE = "systems/vitruvium/templates/chat/dice-card.hbs";

/**
 * @typedef {object} CheckOptions
 * @property {Actor} [actor]             Кто проходит проверку (для подписи в чате).
 * @property {string} [label]            Что проверяется, например «Телосложение».
 * @property {number} dice               Размер пула кубиков до ограничения.
 * @property {number} difficulty         Сложность проверки (1–6).
 * @property {number} [advantages=0]     Число преимуществ (0–2).
 * @property {number} [disadvantages=0]  Число помех (0–2).
 * @property {string} [rollMode]         Режим броска; по умолчанию — текущий режим чата.
 */

/**
 * @typedef {object} CheckResult
 * @property {Roll[]} rolls        Все броски: основной и дополнительные.
 * @property {number} chosenIndex  Какой бросок засчитан.
 * @property {number} successes    Успехов в засчитанном броске.
 * @property {number} difficulty   Сложность.
 * @property {boolean} success     Проверка успешна.
 * @property {ChatMessage} [message] Сообщение в чате.
 */

/**
 * Провести проверку и отправить карточку в чат.
 *
 * Правила (Beta 3.1, «Проверка характеристики»):
 * - бросается пул особых кубиков, успехи складываются;
 * - успехов не меньше сложности — успех, иначе провал;
 * - преимущество или помеха — дополнительный бросок, засчитывается лучший
 *   или худший результат; не больше двух, взаимно гасятся;
 * - близкий к сложности провал мастер может засчитать как частичный успех.
 *
 * @param {CheckOptions} options
 * @returns {Promise<CheckResult>}
 */
export async function rollCheck({
  actor, label = "", dice, difficulty, advantages = 0, disadvantages = 0, rollMode
} = {}) {
  const pool = clampPool(dice);
  const requested = Math.floor(Number(dice) || 0);
  if ( requested > pool ) {
    ui.notifications.info(game.i18n.format("VITRUVIUM.Check.PoolCapped", { requested, max: pool }));
  }

  difficulty = clampDifficulty(difficulty);

  const net = netAdvantage(advantages, disadvantages);
  const formula = `${pool}d${VitruviumDie.DENOMINATION}`;

  const rolls = [];
  for ( let i = 0; i < attemptCount(net); i++ ) {
    const roll = new Roll(formula);
    await roll.evaluate();
    rolls.push(roll);
  }

  const chosenIndex = chooseAttempt(rolls.map(roll => roll.total), net);
  const successes = rolls[chosenIndex].total;
  const success = isSuccess(successes, difficulty);

  const result = { rolls, chosenIndex, successes, difficulty, success };
  result.message = await createCheckMessage({ actor, label, pool, net, rollMode, ...result });
  return result;
}

/**
 * Свободный бросок кубиков без сложности: просто посчитать успехи.
 * Например, когда мастер хочет узнать «насколько хорошо», а не «удалось ли».
 *
 * @param {object} options
 * @param {Actor} [options.actor]     От чьего имени бросок.
 * @param {string} [options.label]    Подпись броска; по умолчанию «Бросок кубиков».
 * @param {number} options.dice       Размер пула (1–6).
 * @param {string} [options.rollMode]
 * @returns {Promise<{rolls: Roll[], successes: number, message: ChatMessage}>}
 */
export async function rollDice({ actor, label, dice, rollMode } = {}) {
  const pool = clampPool(dice);
  label ||= game.i18n.localize("VITRUVIUM.Dice.Title");
  const roll = new Roll(`${pool}d${VitruviumDie.DENOMINATION}`);
  await roll.evaluate();

  const result = { rolls: [roll], chosenIndex: 0, successes: roll.total };
  result.message = await createDiceMessage({
    actor, label, pool, net: 0, rollMode, ...result,
    flavor: label,
    flags: { roll: { label, pool, successes: roll.total } }
  });
  return result;
}

/**
 * Собрать и отправить карточку проверки в чат.
 * @returns {Promise<ChatMessage>}
 */
function createCheckMessage({ label, net, chosenIndex, successes, difficulty, success, pool, ...options }) {
  return createDiceMessage({
    ...options, label, net, chosenIndex, successes, difficulty, success, pool,
    flavor: game.i18n.format("VITRUVIUM.Check.Flavor", { label }),
    flags: { check: { label, pool, difficulty, net, successes, success, chosenIndex } }
  });
}

/**
 * Подпись режима броска: «Преимущество», «Две помехи» и т. п.
 * @param {number} net  Итог преимуществ и помех.
 * @returns {string}    Пустая строка для обычного броска.
 */
export function advantageLabel(net) {
  if ( !net ) return "";
  const kind = net > 0 ? "Advantage" : "Disadvantage";
  return game.i18n.localize(`VITRUVIUM.Check.Mode.${kind}${Math.abs(net)}`);
}

/**
 * Карточка броска в чате: общая для проверки и свободного броска.
 * Если передана сложность (`difficulty`), карточка показывает итог проверки.
 * @returns {Promise<ChatMessage>}
 */
async function createDiceMessage({
  actor, label, pool, net, rollMode, rolls, chosenIndex, successes, difficulty, success, flavor, flags
}) {
  const attempts = rolls.map((roll, index) => ({
    chosen: index === chosenIndex,
    successes: roll.total,
    dice: roll.dice.flatMap(term => term.results.map(result => {
      const faceSuccesses = successesOnFace(result.result);
      return {
        successes: faceSuccesses,
        marks: Array(faceSuccesses).fill(null),
        label: game.i18n.localize(`VITRUVIUM.Die.Face${faceSuccesses}`)
      };
    }))
  }));

  const hasDifficulty = difficulty !== undefined;
  const content = await foundry.applications.handlebars.renderTemplate(CHAT_TEMPLATE, {
    label,
    pool,
    poolLabel: formatCount("VITRUVIUM.Check.Dice", pool),
    hasDifficulty,
    difficulty,
    successes,
    success,
    outcomeClass: hasDifficulty ? (success ? "success" : "failure") : "",
    modeLabel: advantageLabel(net),
    chosenHint: net > 0 ? "VITRUVIUM.Check.ChosenBest" : "VITRUVIUM.Check.ChosenWorst",
    multiple: attempts.length > 1,
    attempts
  });

  const messageData = {
    speaker: ChatMessage.implementation.getSpeaker({ actor }),
    flavor,
    content,
    rolls,
    sound: CONFIG.sounds.dice,
    flags: { vitruvium: flags }
  };
  ChatMessage.implementation.applyRollMode(messageData, rollMode ?? game.settings.get("core", "rollMode"));
  return ChatMessage.implementation.create(messageData);
}
