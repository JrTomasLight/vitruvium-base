import { VitruviumDie } from "./vitruvium-die.mjs";
import {
  attemptCount, chooseAttempt, clampDifficulty, clampPool, isSuccess, netAdvantage, successesOnFace
} from "./rules.mjs";

// Чистые правила доступны и отсюда, чтобы не менять существующий импорт.
export { clampPool, netAdvantage };

const CHAT_TEMPLATE = "systems/vitruvium/templates/chat/check-card.hbs";

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
 * Собрать и отправить карточку проверки в чат.
 * @returns {Promise<ChatMessage>}
 */
async function createCheckMessage({ actor, label, pool, net, rollMode, rolls, chosenIndex, successes, difficulty, success }) {
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

  let modeLabel = "";
  if ( net !== 0 ) {
    const key = net > 0 ? "VITRUVIUM.Check.AdvantageCount" : "VITRUVIUM.Check.DisadvantageCount";
    modeLabel = game.i18n.format(key, { count: Math.abs(net) });
  }

  const content = await foundry.applications.handlebars.renderTemplate(CHAT_TEMPLATE, {
    label,
    pool,
    difficulty,
    successes,
    success,
    modeLabel,
    chosenHint: net > 0 ? "VITRUVIUM.Check.ChosenBest" : "VITRUVIUM.Check.ChosenWorst",
    multiple: attempts.length > 1,
    attempts
  });

  const messageData = {
    speaker: ChatMessage.implementation.getSpeaker({ actor }),
    flavor: game.i18n.format("VITRUVIUM.Check.Flavor", { label }),
    content,
    rolls,
    sound: CONFIG.sounds.dice,
    flags: {
      vitruvium: {
        check: { label, pool, difficulty, net, successes, success, chosenIndex }
      }
    }
  };
  ChatMessage.implementation.applyRollMode(messageData, rollMode ?? game.settings.get("core", "rollMode"));
  return ChatMessage.implementation.create(messageData);
}
