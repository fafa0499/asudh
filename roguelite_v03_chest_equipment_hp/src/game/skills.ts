import { SkillDefinition, SkillInventory, SkillSlot } from '../types/game';

export const SKILL_CATALOG: Record<string, SkillDefinition> = {
  shadow_dash: {
    id: 'shadow_dash',
    title: 'Shadow Dash',
    nameZh: '影襲之刃',
    description: '向面向方向極速突進並撕裂路徑上的敵人，造成 220% 攻擊力傷害。',
    icon: 'Zap',
    resonanceCost: 20,
    cooldown: 3.5,
    damageMultiplier: 2.2,
    category: 'mobility',
  },
  blade_cyclone: {
    id: 'blade_cyclone',
    title: 'Blade Cyclone',
    nameZh: '旋刃風暴',
    description: '以自身為中心召喚 8 枚高速旋轉的雙刀琴音，造成 180% 範圍傷害並強力擊退周圍敵人。',
    icon: 'Wind',
    resonanceCost: 35,
    cooldown: 5.5,
    damageMultiplier: 1.8,
    category: 'aoe',
  },
  piercing_crescent: {
    id: 'piercing_crescent',
    title: 'Piercing Crescent',
    nameZh: '斷音劍氣',
    description: '向地面劈出筆直穿透的音律劍氣，對直線範圍內的所有敵人造成 250% 傷害。',
    icon: 'Activity',
    resonanceCost: 25,
    cooldown: 4.0,
    damageMultiplier: 2.5,
    category: 'burst',
  },
  phantom_echoes: {
    id: 'phantom_echoes',
    title: 'Phantom Echoes',
    nameZh: '殘影劍舞',
    description: '在原地留下分身殘影，並向前方扇形範圍爆發 4 枚追蹤殘響飛刃。',
    icon: 'Sparkles',
    resonanceCost: 30,
    cooldown: 4.5,
    damageMultiplier: 1.9,
    category: 'special',
  },
  harmonic_counter: {
    id: 'harmonic_counter',
    title: 'Harmonic Counter',
    nameZh: '諧波反擊',
    description: '進入 1.0 秒招架姿態，受到攻擊時完全免疫傷害，並向四周爆發 300% 暴擊音波震盪。',
    icon: 'Shield',
    resonanceCost: 30,
    cooldown: 7.0,
    damageMultiplier: 3.0,
    category: 'control',
  },
  requiem_climax: {
    id: 'requiem_climax',
    title: 'Requiem Climax',
    nameZh: '安魂絕響',
    description: '引發聖所的終極共鳴，大範圍引爆音律力場，清除場上所有敵方彈幕並造成 450% 巨額傷害。',
    icon: 'Flame',
    resonanceCost: 55,
    cooldown: 12.0,
    damageMultiplier: 4.5,
    category: 'burst',
  },
};

/**
 * Creates initial empty skill inventory.
 * Initial state: NO skills equipped, initial acquired collection is empty!
 */
export function createDefaultSkillInventory(): SkillInventory {
  return {
    acquiredSkills: [],
    equipped: {
      q: null,
      e: null,
      r: null,
    },
    cooldowns: {
      q: 0,
      e: 0,
      r: 0,
    },
  };
}

/**
 * Equip a skill to a specific slot (Q, E, or R)
 */
export function equipSkill(
  inventory: SkillInventory,
  skillId: string,
  slot: SkillSlot
): void {
  if (!inventory.acquiredSkills.includes(skillId)) return;

  // If already equipped in another slot, clear that slot
  (Object.keys(inventory.equipped) as SkillSlot[]).forEach((s) => {
    if (inventory.equipped[s] === skillId) {
      inventory.equipped[s] = null;
    }
  });

  inventory.equipped[slot] = skillId;
}

/**
 * Unequip a skill from a specific slot
 */
export function unequipSkill(inventory: SkillInventory, slot: SkillSlot): void {
  inventory.equipped[slot] = null;
}
