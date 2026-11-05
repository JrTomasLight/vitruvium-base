/**
 * «Витрувий» — игровая система для Foundry VTT v13.
 * Точка входа: регистрирует справочник правил, документы и листы.
 */
import { VITRUVIUM } from "./config.mjs";
import { CharacterData } from "./data/character.mjs";
import { VitruviumActor } from "./documents/actor.mjs";
import { VitruviumCharacterSheet } from "./sheets/character-sheet.mjs";

Hooks.once("init", () => {
  console.log("Витрувий | Инициализация системы");

  CONFIG.VITRUVIUM = VITRUVIUM;

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
});
