/**
 * «Витрувий» — игровая система для Foundry VTT v13.
 * Точка входа: регистрирует справочник правил, кубик, документы, листы
 * и быстрые действия.
 */
import { VITRUVIUM } from "./config.mjs";
import { CharacterData } from "./data/character.mjs";
import { VitruviumActor } from "./documents/actor.mjs";
import { VitruviumCharacterSheet } from "./sheets/character-sheet.mjs";
import { VitruviumDie } from "./dice/vitruvium-die.mjs";
import { rollCheck } from "./dice/check.mjs";
import { promptCheck } from "./dice/check-dialog.mjs";
import { actions } from "./actions/index.mjs";
import { activateChatCard } from "./chat.mjs";
import { addTokenHUDButtons } from "./hud.mjs";
import { registerDiceSoNice } from "./integrations/dice-so-nice.mjs";

Hooks.once("init", () => {
  console.log("Витрувий | Инициализация системы");

  CONFIG.VITRUVIUM = VITRUVIUM;

  // Программный интерфейс для макросов и модулей.
  game.vitruvium = {
    actions,
    rollCheck,
    promptCheck,
    VitruviumDie
  };

  // Кубик «Витрувия»: формула `3dv`
  CONFIG.Dice.terms[VitruviumDie.DENOMINATION] = VitruviumDie;

  // Актёры
  CONFIG.Actor.documentClass = VitruviumActor;
  CONFIG.Actor.dataModels.character = CharacterData;
  CONFIG.Actor.trackableAttributes = {
    character: { bar: ["inspiration"], value: [] }
  };

  // Листы
  foundry.applications.apps.DocumentSheetConfig.registerSheet(
    foundry.documents.Actor, "vitruvium", VitruviumCharacterSheet,
    { types: ["character"], makeDefault: true, label: "VITRUVIUM.Sheet.Character" }
  );

  // Необязательные модули
  registerDiceSoNice();
});

// Кнопки в карточках чата
Hooks.on("renderChatMessageHTML", activateChatCard);

// Кнопки на HUD токена
Hooks.on("renderTokenHUD", addTokenHUDButtons);
