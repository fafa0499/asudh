import { RoomBranchOption, RoomInfo, RoomType } from '../types/game';

interface RoomTemplate {
  name: string;
  nameZh: string;
  type: RoomType;
  dangerLevel: 1 | 2 | 3 | 4 | 5;
  description: string;
  rewardTypeDesc: string;
  icon: string;
}

const ROOM_TEMPLATES: Record<RoomType, RoomTemplate[]> = {
  skill: [
    {
      name: 'Sanctuary of Melodic Arts',
      nameZh: '主動技能房 (秘術聖所)',
      type: 'skill',
      dangerLevel: 2,
      description: '迴盪著遠古共鳴音符的石堂，內有暗影衛士守衛技能秘符。',
      rewardTypeDesc: '【專屬獎勵】2~3 個全新主動技能供拾取',
      icon: 'Zap',
    },
    {
      name: 'Hall of Resonant Chords',
      nameZh: '主動技能房 (和弦迴廊)',
      type: 'skill',
      dangerLevel: 3,
      description: '飄蕩著琴弦音波的試煉大廳，擊敗敵人解鎖奧義技能。',
      rewardTypeDesc: '【專屬獎勵】2~3 個全新主動技能供拾取',
      icon: 'Activity',
    },
  ],
  attack_mod: [
    {
      name: 'Atelier of Blade Cadence',
      nameZh: '攻擊強化房 (劍勢工坊)',
      type: 'attack_mod',
      dangerLevel: 2,
      description: '刀劍交織的試煉石窟，在此可突破普攻模組與連段極限。',
      rewardTypeDesc: '【專屬獎勵】2~3 個連段模組變化 / 攻擊替換被動',
      icon: 'Sword',
    },
    {
      name: 'Crucible of Rhythmic Edge',
      nameZh: '攻擊強化房 (刃影熔爐)',
      type: 'attack_mod',
      dangerLevel: 3,
      description: '狂風呼嘯的鋒芒試煉場，擊碎魔像獲取旋風或突刺招式。',
      rewardTypeDesc: '【專屬獎勵】2~3 個連段模組變化 / 攻擊替換被動',
      icon: 'Wind',
    },
  ],
  upgrade: [
    {
      name: 'Altar of Cadence',
      nameZh: '基礎強化房 (終止式祭壇)',
      type: 'upgrade',
      dangerLevel: 2,
      description: '銘刻著力量聖印的古老石壇，純粹淬鍊角色的核心體魄。',
      rewardTypeDesc: '【專屬獎勵】2~3 個基礎數值強化 (攻擊/暴擊/移速)',
      icon: 'Star',
    },
    {
      name: 'Sanctum of Fortitude',
      nameZh: '基礎強化房 (堅毅聖殿)',
      type: 'upgrade',
      dangerLevel: 2,
      description: '流淌著音律精華的修行之殿，顯著強化攻擊與暴擊傷害。',
      rewardTypeDesc: '【專屬獎勵】2~3 個基礎數值強化 (攻擊/暴擊/移速)',
      icon: 'Sparkles',
    },
  ],
  fountain: [
    {
      name: 'Fountain of Tears',
      nameZh: '生命上限房 (翠綠之門)',
      type: 'fountain',
      dangerLevel: 1,
      description: '門後有守門者鎮守。擊敗敵人後，可提升角色的最大生命上限。',
      rewardTypeDesc: '【綠門專屬】擊敗守門敵人後，永久提高最大生命值',
      icon: 'Heart',
    },
  ],
  chest: [
    {
      name: 'The Sealed Vault',
      nameZh: '寶箱房 (秘藏寶庫)',
      type: 'chest',
      dangerLevel: 1,
      description: '寶庫由影之守衛看守，擊敗全部敵人後才能開啟寶箱。',
      rewardTypeDesc: '【寶箱裝備】擊敗守衛後，從稀有裝備中選擇一件',
      icon: 'Sparkles',
    },
  ],
  elite: [
    {
      name: 'Hall of Resonant Trials',
      nameZh: '精英戰鬥房 (共鳴審判殿)',
      type: 'elite',
      dangerLevel: 4,
      description: '狂暴的菁英衛隊鎮守於此，攻擊極具侵略性，但獎勵極其豐厚！',
      rewardTypeDesc: '【高品質獎勵】稀有主動技能 / 罕見強化恩賜',
      icon: 'Flame',
    },
  ],
  boss: [
    {
      name: 'Sanctum of the Marionette Maestro',
      nameZh: 'Boss 房 (傀儡樂師的終焉聖堂)',
      type: 'boss',
      dangerLevel: 5,
      description: '黑白虛空的統御者——傀儡樂師等待著與你的最後協奏曲。',
      rewardTypeDesc: '【終焉決戰】通關昇華之戰',
      icon: 'Crown',
    },
  ],
};

export class RoomSystem {
  /**
   * Generates 2 to 3 branching choices for the player's next room
   * CRITICAL REQUIREMENT: Room types in the same round CANNOT repeat.
   */
  public static generateBranches(currentDepth: number): RoomBranchOption[] {
    const nextDepth = currentDepth + 1;

    // Depth 5 is the final room: only the Boss can appear.
    if (nextDepth >= 5) {
      const tmpl = ROOM_TEMPLATES.boss[0];
      return [{
        id: `branch_boss_${nextDepth}_0`,
        type: 'boss',
        name: tmpl.name,
        nameZh: tmpl.nameZh,
        dangerLevel: tmpl.dangerLevel,
        description: tmpl.description,
        rewardTypeDesc: tmpl.rewardTypeDesc,
        icon: tmpl.icon,
      }];
    }

    const candidateTypes: RoomType[] = ['skill', 'attack_mod', 'upgrade', 'chest'];
    if (nextDepth >= 2) candidateTypes.push('fountain', 'elite');

    // Shuffle without replacement so one branch set never contains duplicate room types.
    const shuffled = [...candidateTypes].sort(() => Math.random() - 0.5);
    const chosenTypes = shuffled.slice(0, Math.min(3, shuffled.length));

    return chosenTypes.map((type, idx) => {
      const templates = ROOM_TEMPLATES[type];
      const tmpl = templates[Math.floor(Math.random() * templates.length)];
      return {
        id: `branch_${type}_${nextDepth}_${idx}`,
        type,
        name: tmpl.name,
        nameZh: tmpl.nameZh,
        dangerLevel: tmpl.dangerLevel,
        description: tmpl.description,
        rewardTypeDesc: tmpl.rewardTypeDesc,
        icon: tmpl.icon,
      };
    });
  }

  /**
   * Builds the RoomInfo object for an entered room
   */
  public static buildRoomInfo(branch: RoomBranchOption, depth: number): RoomInfo {
    const isBoss = branch.type === 'boss';

    const width = isBoss ? 1100 : 950;
    const height = isBoss ? 800 : 700;

    const pillars = [
      { id: 'pil_1', x: -260, y: -140, radius: 24, height: 85 },
      { id: 'pil_2', x: 260, y: -140, radius: 24, height: 85 },
      { id: 'pil_3', x: -260, y: 140, radius: 24, height: 85 },
      { id: 'pil_4', x: 260, y: 140, radius: 24, height: 85 },
    ];

    return {
      index: depth,
      depth,
      name: branch.name,
      nameZh: branch.nameZh,
      type: branch.type,
      phase: 'initializing',
      totalEnemies: 0, // Populated by enemy spawner
      enemiesRemaining: 0,
      isCleared: false,
      width,
      height,
      pillars,
      doors: [],
      pickups: [],
    };
  }
}
