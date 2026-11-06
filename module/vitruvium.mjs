/**
 * «Витрувий» — игровая система для Foundry VTT v13.
 * Точка входа: регистрирует справочник правил, кубик, документы (персонаж, домен), листы,
 * быстрые действия, библиотеку макросов и журналы системы.
 */
import { VITRUVIUM } from "./config.mjs";
import { CharacterData } from "./data/character.mjs";
import { VitruviumActor } from "./documents/actor.mjs";
import { DomainData } from "./data/domain.mjs";
import { VitruviumItem } from "./documents/item.mjs";
import { VitruviumDomainSheet } from "./sheets/domain-sheet.mjs";
import { VitruviumCharacterSheet } from "./sheets/character-sheet.mjs";
import { VitruviumDie } from "./dice/vitruvium-die.mjs";
import { rollCheck } from "./dice/check.mjs";
import { promptCheck } from "./dice/check-dialog.mjs";
import { actions } from "./actions/index.mjs";
import { activateChatCard } from "./chat.mjs";
import { addTokenHUDButtons } from "./hud.mjs";
import { MacroLibrary, addLibraryButton, openMacroLibrary } from "./apps/macro-library.mjs";
import { MACRO_LIBRARY, addToHotbar, onHotbarDrop } from "./macros/library.mjs";
import { registerDiceSoNice } from "./integrations/dice-so-nice.mjs";
import { registerJournalSettings, syncSystemJournals } from "./journals/sync.mjs";

Hooks.once("init", () => {
  console.log("Витрувий | Инициализация системы");

  CONFIG.VITRUVIUM = VITRUVIUM;

  // Программный интерфейс для макросов и модулей.
  game.vitruvium = {
    actions,
    rollCheck,
    promptCheck,
    openMacroLibrary,
    macros: { library: MACRO_LIBRARY, addToHotbar },
    VitruviumDie,
    MacroLibrary
  };

  // Кубик «Витрувия»: формула `3dv`
  CONFIG.Dice.terms[VitruviumDie.DENOMINATION] = VitruviumDie;

  // Актёры
  CONFIG.Actor.documentClass = VitruviumActor;
  CONFIG.Actor.dataModels.character = CharacterData;
  CONFIG.Actor.trackableAttributes = {
    character: { bar: ["inspiration"], value: [] }
  };

  // Предметы: домены со способностями
  CONFIG.Item.documentClass = VitruviumItem;
  CONFIG.Item.dataModels.domain = DomainData;

  // Листы
  const { DocumentSheetConfig } = foundry.applications.apps;
  DocumentSheetConfig.registerSheet(
    foundry.documents.Actor, "vitruvium", VitruviumCharacterSheet,
    { types: ["character"], makeDefault: true, label: "VITRUVIUM.Sheet.Character" }
  );
  DocumentSheetConfig.registerSheet(
    foundry.documents.Item, "vitruvium", VitruviumDomainSheet,
    { types: ["domain"], makeDefault: true, label: "VITRUVIUM.Sheet.Domain" }
  );

  // Настройки
  registerJournalSettings();

  // Необязательные модули
  registerDiceSoNice();
});

// Кнопки в карточках чата
Hooks.on("renderChatMessageHTML", activateChatCard);

// Кнопки на HUD токена
Hooks.on("renderTokenHUD", addTokenHUDButtons);

// Библиотека макросов: кнопка во вкладке «Макросы» и перетаскивание на панель
Hooks.on("renderMacroDirectory", addLibraryButton);
Hooks.on("hotbarDrop", onHotbarDrop);

// Журналы системы: «Изменения системы» и «Правила Beta 3.1»
Hooks.once("ready", syncSystemJournals);
