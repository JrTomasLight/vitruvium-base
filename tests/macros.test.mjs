/**
 * Библиотека макросов (module/macros/library.mjs) на заглушках Foundry.
 */
import { before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ROOT, installFoundry, lookup } from "./helpers/foundry.mjs";
// Список записей не зависит от Foundry, его можно импортировать сразу.
import { MACRO_LIBRARY } from "../module/macros/library.mjs";

let env;
let library;
let actions;
before(async () => {
  env = await installFoundry();
  library = await import("../module/macros/library.mjs");
  ({ actions } = await import("../module/actions/index.mjs"));
});
beforeEach(() => env.reset());

describe("Записи библиотеки", () => {
  it("ключи уникальны", () => {
    const keys = library.MACRO_LIBRARY.map(entry => entry.key);
    assert.equal(new Set(keys).size, keys.length);
  });

  for ( const entry of MACRO_LIBRARY ) {
    it(`«${entry.key}»: иконка, строки и действие на месте`, () => {
      const file = path.join(ROOT, entry.img.replace("systems/vitruvium/", ""));
      assert.ok(fs.existsSync(file), `нет иконки ${file}`);
      assert.equal(typeof lookup(`VITRUVIUM.Macro.${entry.key}.label`), "string");
      assert.equal(typeof lookup(`VITRUVIUM.Macro.${entry.key}.hint`), "string");
      if ( entry.call ) {
        assert.equal(typeof actions[entry.call], "function", `нет действия actions.${entry.call}`);
        assert.match(library.macroCommand(entry), new RegExp(`game\\.vitruvium\\.actions\\.${entry.call}\\(\\);$`));
      } else {
        assert.equal(typeof lookup(entry.pending), "string", "у недоступного макроса должно быть объяснение");
      }
    });
  }
});

describe("Создание макроса и панель", () => {
  it("создаёт макрос-скрипт с флагом библиотеки", async () => {
    const macro = await library.ensureMacro("check");
    assert.equal(macro.type, "script");
    assert.equal(macro.name, "Проверка характеристики");
    assert.equal(macro.getFlag("vitruvium", "library"), "check");
    assert.match(macro.command, /game\.vitruvium\.actions\.check\(\);/);
  });

  it("повторно использует уже созданный макрос", async () => {
    const first = await library.ensureMacro("dice");
    const second = await library.ensureMacro("dice");
    assert.equal(first, second);
    assert.equal(env.createdMacros.length, 1);
  });

  it("недоступный макрос не создаётся", async () => {
    assert.equal(await library.ensureMacro("ability"), null);
    assert.equal(env.createdMacros.length, 0);
  });

  it("макрос мастера игроку не создаётся", async () => {
    assert.equal(await library.ensureMacro("inspiration"), null);
    game.user.isGM = true;
    assert.ok(await library.ensureMacro("inspiration"));
  });

  it("«На панель» кладёт в первую свободную ячейку", async () => {
    await library.addToHotbar("check");
    await library.addToHotbar("declare");
    assert.deepEqual(env.hotbarAssignments.map(a => a.slot), [1, 2]);
    assert.equal(env.notifications.length, 2);
  });

  it("перетаскивание на панель: своя ячейка, Foundry не вмешивается", async () => {
    const handled = library.onHotbarDrop(null, { type: library.DRAG_TYPE, key: "dice" }, 7);
    assert.equal(handled, false);
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(env.hotbarAssignments.at(-1).slot, 7);
  });

  it("чужие данные перетаскивания не трогает", () => {
    assert.equal(library.onHotbarDrop(null, { type: "Item", uuid: "Item.x" }, 3), undefined);
  });
});
