import {
  PassiveRewardItem,
  PlayerStats,
  RewardItem,
  RoomType,
  SkillRewardItem,
  StatRewardItem,
  EquipmentRewardItem,
} from '../types/game';
import { PASSIVE_CATALOG } from './passives';
import { SKILL_CATALOG } from './skills';

/**
 * Generates 3 distinct reward options according to the cleared room type
 */
export class RewardSystem {
  public static generateRewards(
    roomType: RoomType,
    existingSkillIds: string[],
    existingPassiveIds: string[]
  ): RewardItem[] {
    const rewards: RewardItem[] = [];

    // Helper: Stat upgrades pool
    const statPool: StatRewardItem[] = [
      {
        id: 'stat_atk_boost',
        category: 'stat',
        title: 'Crescendo Might',
        nameZh: '強音鍛造',
        description: '基礎攻擊力提升 30%，讓每一次普通攻擊更具威脅。',
        rarity: 'common',
        icon: 'Activity',
        synergyTag: '基礎能力強化',
        apply: (stats: PlayerStats) => {
          stats.baseDamage = Math.round(stats.baseDamage * 1.3);
        },
      },
      {
        id: 'stat_crit_boost',
        category: 'stat',
        title: 'Sharp Overtone',
        nameZh: '泛音透析',
        description: '暴擊率提升 18%，暴擊傷害提升 40%。',
        rarity: 'rare',
        icon: 'Zap',
        synergyTag: '基礎能力強化',
        apply: (stats: PlayerStats) => {
          stats.critRate = Math.min(0.85, stats.critRate + 0.18);
          stats.critDamage += 0.4;
        },
      },
      {
        id: 'stat_speed_agility',
        category: 'stat',
        title: 'Presto Tempo',
        nameZh: '極速快板',
        description: '移動速度提升 25%，閃避冷卻時間縮短 30%。',
        rarity: 'rare',
        icon: 'Wind',
        synergyTag: '基礎能力強化',
        apply: (stats: PlayerStats) => {
          stats.speed = Math.round(stats.speed * 1.25);
          stats.dodgeCooldown = Math.max(0.45, stats.dodgeCooldown * 0.7);
        },
      },
      {
        id: 'stat_barrier_shield',
        category: 'stat',
        title: 'Aegis Resonance',
        nameZh: '音律神聖護盾',
        description: '獲得 50 點護盾，並在進入後續每個房間時重新獲得 30 點護盾。',
        rarity: 'common',
        icon: 'Shield',
        synergyTag: '基礎能力強化',
        apply: (stats: PlayerStats) => {
          stats.barrier = Math.max(stats.barrier, 50);
        },
      },
      {
        id: 'stat_def_boost',
        category: 'stat',
        title: 'Iron Cadence Armor',
        nameZh: '鐵律之甲',
        description: '防禦力提升 16 點，閃避機率提升 6%，大幅增強常態承傷減免與規避機率。',
        rarity: 'rare',
        icon: 'Shield',
        synergyTag: '基礎能力強化',
        apply: (stats: PlayerStats) => {
          stats.defense = (stats.defense || 0) + 16;
          stats.dodgeRate = Math.min(0.60, (stats.dodgeRate || 0) + 0.06);
        },
      },
    ];

    // Helper: Available attack mod passives (category 'replace' or 'append' that modify combo)
    const attackModPassives: PassiveRewardItem[] = Object.values(PASSIVE_CATALOG)
      .filter((p) => (p.category === 'replace' || p.category === 'append') && !existingPassiveIds.includes(p.id))
      .map((p) => ({
        id: `passive_${p.id}`,
        category: 'passive' as const,
        title: p.title,
        nameZh: p.nameZh,
        description: p.description,
        rarity: p.category === 'replace' ? 'legendary' : 'rare',
        icon: p.icon,
        synergyTag: p.category === 'replace' ? '攻擊模組替換' : '攻擊模組追加',
        passive: p,
      }));

    // Helper: Available active skills
    const availableSkills: SkillRewardItem[] = Object.values(SKILL_CATALOG)
      .filter((s) => !existingSkillIds.includes(s.id))
      .map((s) => ({
        id: `skill_${s.id}`,
        category: 'skill' as const,
        title: s.title,
        nameZh: s.nameZh,
        description: s.description,
        rarity: s.category === 'burst' ? 'legendary' : 'rare',
        icon: s.icon,
        synergyTag: '主動技能 (入庫裝備)',
        skill: s,
      }));

    // Helper: Rare relics & special passives (category 'enhance')
    const rareRelics: PassiveRewardItem[] = Object.values(PASSIVE_CATALOG)
      .filter((p) => p.category === 'enhance' && !existingPassiveIds.includes(p.id))
      .map((p) => ({
        id: `relic_${p.id}`,
        category: 'passive' as const,
        title: p.title,
        nameZh: p.nameZh,
        description: p.description,
        rarity: 'legendary' as const,
        icon: p.icon,
        synergyTag: '稀有特殊秘寶',
        passive: p,
      }));

    // 1. 主動技能房 (Skill Room): 嚴格只提供 2~3 個主動技能，不可混入數值或攻擊被動
    if (roomType === 'skill') {
      if (availableSkills.length > 0) {
        const shuffled = [...availableSkills].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(3, Math.max(2, shuffled.length)));
      }
      // Fallback only if all skills are already acquired: provide skill mastery overclocks
      return [
        {
          id: 'skill_overclock_cd',
          category: 'skill',
          title: 'Staccato Haste',
          nameZh: '和弦極限冷卻',
          description: '所有主動技能冷卻時間永久縮短 30%。',
          rarity: 'legendary',
          icon: 'Zap',
          synergyTag: '主動技能奧義',
          skill: {
            id: 'mastery_cd',
            title: 'Mastery Haste',
            nameZh: '和弦極限冷卻',
            description: '主動技能冷卻縮短 30%',
            icon: 'Zap',
            resonanceCost: 0,
            cooldown: 0,
            damageMultiplier: 1.0,
            category: 'special',
          },
        },
        {
          id: 'skill_overclock_dmg',
          category: 'skill',
          title: 'Fortissimo Surge',
          nameZh: '極強音爆發',
          description: '所有主動技能傷害永久提升 45%。',
          rarity: 'legendary',
          icon: 'Flame',
          synergyTag: '主動技能奧義',
          skill: {
            id: 'mastery_dmg',
            title: 'Mastery Surge',
            nameZh: '極強音爆發',
            description: '主動技能傷害提升 45%',
            icon: 'Flame',
            resonanceCost: 0,
            cooldown: 0,
            damageMultiplier: 1.45,
            category: 'burst',
          },
        },
      ];
    }

    // 2. 攻擊強化房 (Attack Modification Room): 嚴格只提供 2~3 個攻擊模組變化被動
    if (roomType === 'attack_mod') {
      const shuffledMods = [...attackModPassives].sort(() => Math.random() - 0.5);
      if (shuffledMods.length >= 2) {
        return shuffledMods.slice(0, Math.min(3, shuffledMods.length));
      }
      // If exhausted, include all attack mod passives
      const allMods = Object.values(PASSIVE_CATALOG)
        .filter((p) => p.category === 'replace' || p.category === 'append')
        .map((p) => ({
          id: `passive_${p.id}_alt`,
          category: 'passive' as const,
          title: p.title,
          nameZh: p.nameZh,
          description: p.description,
          rarity: 'rare' as const,
          icon: p.icon,
          synergyTag: '攻擊模組突破',
          passive: p,
        }));
      return allMods.slice(0, 3);
    }

    // 3. 基礎強化房 (Upgrade Room): 嚴格只提供 2~3 個基礎能力強化選項
    if (roomType === 'upgrade') {
      const shuffledStats = [...statPool].sort(() => Math.random() - 0.5);
      return shuffledStats.slice(0, 3);
    }

    // 4. 綠色門 (Green Gate): the only source of maximum-HP growth.
    if (roomType === 'fountain') {
      return [{
        id: 'green_gate_vitality',
        category: 'stat',
        title: 'Verdant Threshold',
        nameZh: '翠門生命刻印',
        description: '最大生命值永久提升 30 點。此獎勵不會立即恢復生命。',
        rarity: 'rare',
        icon: 'Heart',
        synergyTag: '綠門專屬：生命上限',
        apply: (stats: PlayerStats) => { stats.maxHp += 30; },
      }];
    }

    // 5. 寶箱房：只提供裝備，不混入技能或一般數值強化。
    if (roomType === 'chest') {
      const allEquipment = Object.values(PASSIVE_CATALOG).filter((p) => p.category === 'enhance');
      const unownedEquipment = allEquipment.filter((p) => !existingPassiveIds.includes(p.id));
      const sourcePool = unownedEquipment.length > 0 ? unownedEquipment : allEquipment;
      const stamp = Date.now();
      const equipmentChoices: EquipmentRewardItem[] = [...sourcePool]
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((item, index) => {
          const equipmentInstance = { ...item, id: `${item.id}__copy_${stamp}_${index}` };
          return {
            id: `equipment_${equipmentInstance.id}`,
            category: 'equipment',
            title: item.title,
            nameZh: item.nameZh,
            description: item.description,
            rarity: 'legendary',
            icon: item.icon,
            synergyTag: '寶箱裝備',
            equipment: equipmentInstance,
          };
        });
      return equipmentChoices;
    }

    // 6. 精英房 (Elite Room): 高品質獎勵 (稀有技能、傳奇連段模組、罕見強化)
    if (roomType === 'elite') {
      const eliteRewards: RewardItem[] = [];
      if (availableSkills.length > 0) {
        eliteRewards.push(availableSkills[0]);
      }
      if (attackModPassives.length > 0) {
        eliteRewards.push(attackModPassives[0]);
      }
      if (rareRelics.length > 0) {
        eliteRewards.push(rareRelics[0]);
      } else {
        eliteRewards.push(statPool[0]); // Crescendo Might
      }
      return eliteRewards.slice(0, 3);
    }

    // 7. Boss 房 (Boss Room): 傳奇昇華
    return [
      {
        id: 'boss_dawn_ascension',
        category: 'stat',
        title: 'Dawn of Cinderia',
        nameZh: '破曉絕響昇華',
        description: '攻擊力 +50%，暴擊率 +25%，防禦力 +20，閃避率 +10%。',
        rarity: 'legendary',
        icon: 'Crown',
        synergyTag: '通關傳奇昇華',
        apply: (stats: PlayerStats) => {
          stats.baseDamage = Math.round(stats.baseDamage * 1.5);
          stats.critRate = Math.min(0.95, stats.critRate + 0.25);
          stats.defense = (stats.defense || 0) + 20;
          stats.dodgeRate = Math.min(0.65, (stats.dodgeRate || 0) + 0.10);
        },
      },
    ];
  }
}
