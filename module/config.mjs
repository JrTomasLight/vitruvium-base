/**
 * Справочник правил «Витрувия» (Beta 3.1).
 *
 * Здесь собраны все числовые константы и списки из правил, чтобы остальной
 * код не держал «магических чисел». Во время игры справочник доступен
 * как `CONFIG.VITRUVIUM`.
 *
 * Названия и описания — ключи локализации из `lang/ru.json`.
 */
export const VITRUVIUM = {};

/**
 * Характеристики персонажа: уровень базовых возможностей относительно
 * других персонажей того же типа в мире игры.
 * Порядок совпадает с порядком в правилах.
 */
VITRUVIUM.characteristics = {
  physique: {
    label: "VITRUVIUM.Characteristic.physique.label",
    hint: "VITRUVIUM.Characteristic.physique.hint",
    icon: "fa-solid fa-dumbbell"
  },
  movement: {
    label: "VITRUVIUM.Characteristic.movement.label",
    hint: "VITRUVIUM.Characteristic.movement.hint",
    icon: "fa-solid fa-person-running"
  },
  attention: {
    label: "VITRUVIUM.Characteristic.attention.label",
    hint: "VITRUVIUM.Characteristic.attention.hint",
    icon: "fa-solid fa-eye"
  },
  thinking: {
    label: "VITRUVIUM.Characteristic.thinking.label",
    hint: "VITRUVIUM.Characteristic.thinking.hint",
    icon: "fa-solid fa-brain"
  },
  influence: {
    label: "VITRUVIUM.Characteristic.influence.label",
    hint: "VITRUVIUM.Characteristic.influence.hint",
    icon: "fa-solid fa-masks-theater"
  },
  will: {
    label: "VITRUVIUM.Characteristic.will.label",
    hint: "VITRUVIUM.Characteristic.will.hint",
    icon: "fa-solid fa-hurricane"
  }
};

/** Допустимый уровень характеристики. Все характеристики начинаются с минимума. */
VITRUVIUM.characteristicRange = { min: 1, max: 3 };

/**
 * Уровень персонажа на старте игры.
 * `budget` — сколько очков характеристик и доменов, атрибутов и предметов
 * получает персонаж при создании.
 */
VITRUVIUM.tiers = {
  common: {
    label: "VITRUVIUM.Tier.common.label",
    hint: "VITRUVIUM.Tier.common.hint",
    budget: 3
  },
  rare: {
    label: "VITRUVIUM.Tier.rare.label",
    hint: "VITRUVIUM.Tier.rare.hint",
    budget: 6
  },
  outstanding: {
    label: "VITRUVIUM.Tier.outstanding.label",
    hint: "VITRUVIUM.Tier.outstanding.hint",
    budget: 9
  },
  legendary: {
    label: "VITRUVIUM.Tier.legendary.label",
    hint: "VITRUVIUM.Tier.legendary.hint",
    budget: 12
  }
};

/** Вдохновение: запас внутренней энергии персонажа. */
VITRUVIUM.inspiration = { max: 6 };

/**
 * Игровые кубики: особые шестигранники.
 * `denomination` — буква кубика в формулах Foundry: `3dv` — три кубика «Витрувия».
 * `faces` — число успехов на каждой грани: 3 пустые, 2 с одним успехом, 1 с двумя.
 *           Индекс в массиве — номер грани минус один.
 * `minPool`, `maxPool` — сколько кубиков может быть в одном броске.
 */
VITRUVIUM.dice = {
  denomination: "v",
  faces: [0, 0, 0, 1, 1, 2],
  minPool: 1,
  maxPool: 6
};

/**
 * Сложность проверки, которую назначает мастер.
 * `default` — значение, выбранное в окне проверки изначально. Правила его
 * не задают, это только удобство интерфейса.
 */
VITRUVIUM.difficulty = { min: 1, max: 6, default: 2 };

/** Максимум преимуществ или помех на одной проверке. */
VITRUVIUM.maxAdvantages = 2;

/** Домены: категории способностей персонажа. */
VITRUVIUM.domains = {
  maxCount: 6,
  levelRange: { min: 1, max: 3 },
  abilitiesPerLevel: 2
};

/** Атрибуты: особенности персонажа вне доменов. */
VITRUVIUM.attributes = { maxCount: 12 };
