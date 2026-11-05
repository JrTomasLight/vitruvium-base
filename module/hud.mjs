/**
 * Кнопки «Витрувия» на HUD токена (меню по правому клику на токене).
 *
 * Работают для любого актёра с характеристиками: и для персонажа игрока,
 * и для персонажа под управлением мастера.
 * - «Проверка» — владельцу токена и мастеру;
 * - «Выдать вдохновение» — только мастеру.
 */
import { actions } from "./actions/index.mjs";

/**
 * Создать кнопку HUD.
 * @param {object} options
 * @returns {HTMLButtonElement}
 */
function hudButton({ icon, label, onClick }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "control-icon vitruvium-hud-button";
  button.dataset.tooltip = label;
  button.setAttribute("aria-label", label);
  button.innerHTML = `<i class="${icon}" inert></i>`;
  button.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });
  return button;
}

/**
 * Добавить кнопки на HUD токена. Вызывается хуком `renderTokenHUD`.
 * @param {TokenHUD} hud
 * @param {HTMLElement} html
 */
export function addTokenHUDButtons(hud, html) {
  html = html instanceof HTMLElement ? html : html?.[0];
  if ( !html ) return;
  const actor = hud.document?.actor ?? hud.object?.actor;
  if ( !actor?.system?.characteristics ) return;
  const column = html.querySelector(".col.left") ?? html.querySelector(".col");
  if ( !column ) return;

  if ( actor.isOwner ) {
    column.append(hudButton({
      icon: "fa-solid fa-dice",
      label: game.i18n.localize("VITRUVIUM.HUD.Check"),
      onClick: () => actions.check({ actor })
    }));
  }

  if ( game.user.isGM && actor.system.inspiration ) {
    column.append(hudButton({
      icon: "fa-solid fa-star",
      label: game.i18n.localize("VITRUVIUM.HUD.AwardInspiration"),
      onClick: () => actions.awardInspiration({ actors: [actor] })
    }));
  }
}
