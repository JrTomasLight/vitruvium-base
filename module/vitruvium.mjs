/**
 * «Витрувий» — игровая система для Foundry VTT v13.
 * Точка входа: регистрирует справочник правил, документы и листы.
 */
import { VITRUVIUM } from "./config.mjs";
import { CharacterData } from "./data/character.mjs";
import { VitruviumActor } from "./documents/actor.mjs";

Hooks.once("init", () => {
  console.log("Витрувий | Инициализация системы");

  CONFIG.VITRUVIUM = VITRUVIUM;

  // Актёры
  CONFIG.Actor.documentClass = VitruviumActor;
  CONFIG.Actor.dataModels.character = CharacterData;
  CONFIG.Actor.trackableAttributes = {
    character: { bar: ["inspiration"], value: [] }
  };
});
