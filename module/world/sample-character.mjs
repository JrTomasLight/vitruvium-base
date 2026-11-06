/**
 * Пример персонажа: рыцарь Георг Лиззул.
 *
 * Нужен, чтобы сразу увидеть лист, домены и способности в деле. Активный мастер
 * создаёт его один раз в каждом мире, в папке «Витрувий» на вкладке «Актёры».
 * Если персонажа удалить, сам он больше не появится; создать заново можно
 * из консоли: `game.vitruvium.createSampleCharacter()`.
 *
 * Портрета в системе нет: картинку персонажу назначают в Foundry щелчком по портрету.
 * Бюджеты — по правилам для уровня «Редкий» (6 очков характеристик и 6 очков доменов),
 * это проверяет tests/sample-character.test.mjs.
 */
const SCOPE = "vitruvium";
const CREATED = "sampleCharacterCreated";

/** Данные персонажа для Actor.create. */
export const SAMPLE_CHARACTER = {
  name: "Георг Лиззул",
  type: "character",
  system: {
    tier: "rare",
    concept: "Младший сын маркграфа, юный рыцарь графства",
    characteristics: {
      physique: { value: 2 },
      movement: { value: 3 },
      attention: { value: 2 },
      thinking: { value: 1 },
      influence: { value: 2 },
      will: { value: 2 }
    },
    inspiration: { value: 3, max: 6 },
    biography: "<p>Младший сын маркграфа Ганса Лиззула, один из самых юных сэров графства, "
      + "обладающий удивительной ловкостью и увёртливостью.</p>"
  },
  items: [
    {
      name: "Фехтование",
      type: "domain",
      system: {
        level: 2,
        description: "Владение мечом и щитом: выпады, защита и приёмы благородного поединка.",
        abilities: [
          { name: "Выпад-молния", description: "Стремительный выпад с дальней дистанции: противник не успевает закрыться, если не ждал атаки." },
          { name: "Удар навершием", description: "Перехватить меч за клинок и ударить навершием или гардой, оглушив противника в тяжёлом доспехе." },
          { name: "Обезоруживание", description: "Связать клинок противника и выбить оружие из его рук." },
          { name: "Щит и клинок", description: "Принять удар на щит и тут же ответить, не теряя темпа боя." }
        ]
      }
    },
    {
      name: "Рыцарская выучка",
      type: "domain",
      system: {
        level: 2,
        description: "Всё, чему учат оруженосца: верховой бой, доспех, честь и долг.",
        abilities: [
          { name: "Таранный удар", description: "Атака копьём верхом на полном скаку: сбить всадника или прорвать строй." },
          { name: "Натиск щитом", description: "Врезаться в противника щитом, опрокинуть или оттеснить его." },
          { name: "Клятва защитника", description: "Встать между союзником и угрозой и принять удар, предназначенный другому." },
          { name: "Боевой клич", description: "Ободрить союзников и смутить врагов, напомнив о чести рода Лиззулов." }
        ]
      }
    },
    {
      name: "Ловкость",
      type: "domain",
      system: {
        level: 2,
        description: "Подвижность и увёртливость, редкая для рыцаря в доспехе.",
        abilities: [
          { name: "Уход с линии атаки", description: "Уклониться от удара в последний момент, даже в полном доспехе." },
          { name: "Кувырок в доспехе", description: "Перекатиться, вскочить и продолжить бой, не выронив меча." },
          { name: "Удар в прыжке", description: "Атаковать сверху: с коня, лестницы или крепостной стены." },
          { name: "Скользкий как угорь", description: "Вырваться из захвата или протиснуться там, где застрял бы другой." }
        ]
      }
    }
  ]
};

/** Настройка мира: создан ли уже пример персонажа (в меню настроек не видна). */
export function registerSampleCharacterSetting() {
  game.settings.register(SCOPE, CREATED, {
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });
}

/**
 * Создать пример персонажа в папке «Витрувий».
 * @returns {Promise<Actor>}
 */
export async function createSampleCharacter() {
  let folder = game.folders.find(f => (f.type === "Actor") && f.getFlag(SCOPE, "systemFolder"));
  folder ??= await foundry.documents.Folder.create({
    name: game.i18n.localize("VITRUVIUM.SystemTitle"),
    type: "Actor",
    flags: { [SCOPE]: { systemFolder: true } }
  });
  const actor = await foundry.documents.Actor.create({
    ...foundry.utils.deepClone(SAMPLE_CHARACTER),
    folder: folder?.id,
    flags: { [SCOPE]: { sample: true } }
  });
  ui.notifications.info(game.i18n.format("VITRUVIUM.Sample.Created", { name: actor.name }));
  return actor;
}

/** Создать пример персонажа при первой загрузке мира. Вызывается в хуке `ready`. */
export async function ensureSampleCharacter() {
  if ( !game.users.activeGM?.isSelf ) return;
  if ( game.settings.get(SCOPE, CREATED) ) return;
  try {
    await createSampleCharacter();
    await game.settings.set(SCOPE, CREATED, true);
  }
  catch ( err ) {
    console.error("Витрувий | Пример персонажа не создан", err);
  }
}
