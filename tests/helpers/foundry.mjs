/**
 * Заглушки Foundry VTT для автотестов в Node.
 *
 * Подменяют ровно то, чем пользуется слой бросков системы: базовый класс
 * кубика, Roll, чат, уведомления, локализацию и шаблоны. Сам Foundry
 * в тестах не запускается.
 *
 * Использование:
 *   const env = await installFoundry();
 *   const { rollCheck } = await import("../module/dice/check.mjs");
 *   env.queueFaces([6, 4, 1]);   // следующие грани будут именно такими
 *
 * Модули системы, которые наследуют классы Foundry, нужно импортировать
 * динамически ПОСЛЕ installFoundry(): при статическом импорте глобальных
 * объектов ещё нет.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** Перевод из lang/ru.json. */
export const LANG = JSON.parse(fs.readFileSync(path.join(ROOT, "lang/ru.json"), "utf8"));

/**
 * Найти строку локализации по ключу.
 * @param {string} key
 * @returns {string|undefined}
 */
export function lookup(key) {
  return key.split(".").reduce((node, part) => node?.[part], LANG);
}

/**
 * Генератор псевдослучайных чисел с зерном (mulberry32).
 * Одно и то же зерно — одна и та же последовательность, поэтому
 * статистические тесты повторяемы и не падают случайно.
 * @param {number} seed
 * @returns {() => number}  Число в [0, 1).
 */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let macroCounter = 0;

/** Упрощённый макрос: id, флаги, владелец. */
class FakeMacro {
  constructor(data) {
    Object.assign(this, structuredClone(data));
    this.id = `macro${++macroCounter}`;
    this.isOwner = true;
  }

  getFlag(scope, key) {
    return this.flags?.[scope]?.[key];
  }
}

/** Упрощённая коллекция game.macros. */
class MacroCollection {
  contents = [];
  find(fn) { return this.contents.find(fn); }
  has(id) { return this.contents.some(macro => macro.id === id); }
}

/** Упрощённый актёр: имя, данные, владение, обновление. */
export class FakeActor {
  constructor({ name = "Отто Хорн", system = {}, isOwner = true } = {}) {
    this.name = name;
    this.system = system;
    this.isOwner = isOwner;
    this.uuid = `Actor.${name}`;
    this.updates = [];
  }

  async update(data) {
    this.updates.push(data);
    for ( const [path, value] of Object.entries(data) ) {
      const parts = path.split(".");
      const last = parts.pop();
      parts.reduce((node, part) => node[part], this)[last] = value;
    }
  }

  async rollCharacteristic(characteristic) {
    this.rolled = characteristic ?? "(окно)";
    return { characteristic };
  }
}

/**
 * Установить глобальные заглушки Foundry.
 * @param {object} [options]
 * @param {number} [options.seed=1]  Зерно генератора граней.
 * @returns {Promise<object>}  Пульт управления заглушками.
 */
export async function installFoundry({ seed = 1 } = {}) {
  const env = {
    random: seededRandom(seed),
    faceQueue: [],
    messages: [],
    notifications: [],
    renders: [],
    rollMode: "publicroll",
    warnings: [],
    errors: [],
    dialogResults: [],
    createdMacros: [],
    hotbarAssignments: [],

    /** Ответ следующего окна DialogV2.wait (данные формы или null). */
    queueDialog(result) { this.dialogResults.push(result); },

    /** Задать грани для следующих бросков (по одной на кубик, по порядку). */
    queueFaces(faces) { this.faceQueue.push(...faces); },

    /** Сбросить накопленные сообщения, уведомления и очередь граней. */
    reset({ seed: newSeed } = {}) {
      this.faceQueue.length = 0;
      this.messages.length = 0;
      this.notifications.length = 0;
      this.renders.length = 0;
      this.warnings.length = 0;
      this.errors.length = 0;
      this.dialogResults.length = 0;
      this.createdMacros.length = 0;
      this.hotbarAssignments.length = 0;
      globalThis.game.macros.contents.length = 0;
      globalThis.game.user.isGM = false;
      globalThis.game.user.character = null;
      globalThis.game.user.hotbar = {};
      globalThis.canvas.ready = false;
      globalThis.canvas.tokens.controlled = [];
      if ( newSeed !== undefined ) this.random = seededRandom(newSeed);
    },

    /** Следующая грань: из очереди или случайная. */
    nextFace(faces) {
      if ( this.faceQueue.length ) return this.faceQueue.shift();
      return 1 + Math.floor(this.random() * faces);
    }
  };

  /** Упрощённый foundry.dice.terms.Die: только то, что использует VitruviumDie. */
  class Die {
    constructor({ number = 1, faces = 6, results = [] } = {}) {
      this.number = number;
      this.faces = faces;
      this.results = results;
      this._evaluated = false;
    }

    evaluate() {
      for ( let i = 0; i < this.number; i++ ) {
        this.results.push({ result: env.nextFace(this.faces), active: true });
      }
      this._evaluated = true;
      return this;
    }

    getResultCSS(result) {
      return [
        this.constructor.name.toLowerCase(),
        `d${this.faces}`,
        result.result === 1 ? "min" : null,
        result.result === this.faces ? "max" : null
      ];
    }
  }

  /** Упрощённый Roll: понимает формулы вида `3dv`. */
  class Roll {
    constructor(formula) {
      const match = /^(\d+)d([a-z])$/.exec(formula);
      if ( !match ) throw new Error(`Заглушка Roll не понимает формулу «${formula}»`);
      const cls = globalThis.CONFIG.Dice.terms[match[2]];
      if ( !cls ) throw new Error(`Кубик d${match[2]} не зарегистрирован в CONFIG.Dice.terms`);
      this.formula = formula;
      this.terms = [new cls({ number: Number(match[1]) })];
    }

    async evaluate() {
      for ( const term of this.terms ) term.evaluate();
      this._evaluated = true;
      return this;
    }

    get dice() { return this.terms; }

    get total() {
      return this.terms.reduce((sum, term) => sum + term.total, 0);
    }
  }

  const { VITRUVIUM } = await import("../../module/config.mjs");

  globalThis.foundry = {
    dice: { terms: { Die } },
    documents: { Actor: class Actor {} },
    applications: {
      handlebars: {
        renderTemplate: async (template, data) => {
          env.renders.push({ template, data });
          return `<div data-template="${template}"></div>`;
        }
      },
      api: {
        DialogV2: {
          wait: async () => {
            if ( !env.dialogResults.length ) throw new Error("Окно открылось, но ответ не задан: env.queueDialog(...)");
            return env.dialogResults.shift();
          }
        }
      },
      ux: {
        FormDataExtended: class { constructor() { this.object = {}; } }
      }
    },
    utils: { randomID: () => "test" }
  };

  globalThis.CONFIG = {
    VITRUVIUM,
    Dice: { terms: {} },
    sounds: { dice: "sounds/dice.wav" }
  };

  globalThis.game = {
    i18n: {
      localize: key => lookup(key) ?? key,
      format: (key, data = {}) => {
        const text = lookup(key);
        if ( typeof text !== "string" ) return key;
        return text.replace(/\{(\w+)\}/g, (_, name) => String(data[name]));
      }
    },
    settings: { get: (scope, key) => ((scope === "core") && (key === "rollMode") ? env.rollMode : undefined) },
    user: {
      isGM: false,
      character: null,
      hotbar: {},
      async assignHotbarMacro(macro, slot) {
        env.hotbarAssignments.push({ macro, slot });
        this.hotbar[slot] = macro.id;
      }
    },
    macros: new MacroCollection()
  };

  globalThis.canvas = { ready: false, tokens: { controlled: [] } };

  globalThis.ui = {
    notifications: {
      info: message => env.notifications.push(message),
      warn: message => env.warnings.push(message),
      error: message => env.errors.push(message)
    }
  };

  globalThis.Macro = {
    implementation: {
      create: async data => {
        const macro = new FakeMacro(data);
        env.createdMacros.push(macro);
        globalThis.game.macros.contents.push(macro);
        return macro;
      }
    }
  };

  globalThis.fromUuidSync = uuid => env.uuidMap?.[uuid] ?? null;

  globalThis.Roll = Roll;

  globalThis.ChatMessage = {
    implementation: {
      getSpeaker: ({ actor } = {}) => ({ alias: actor?.name ?? null }),
      applyRollMode: (data, mode) => { data.rollMode = mode; return data; },
      create: async data => { env.messages.push(data); return data; }
    }
  };

  // Кубик регистрируется так же, как в хуке init системы.
  // Импорт только здесь: модуль кубика наследует foundry.dice.terms.Die.
  const { VitruviumDie } = await import("../../module/dice/vitruvium-die.mjs");
  globalThis.CONFIG.Dice.terms[VitruviumDie.DENOMINATION] = VitruviumDie;

  return env;
}
