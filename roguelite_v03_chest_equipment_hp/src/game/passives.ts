import { PassiveDefinition, PlayerStats } from '../types/game';

export const PASSIVE_CATALOG: Record<string, PassiveDefinition> = {
  // --- 替換型被動 (Replace) ---
  thrust_finisher: {
    id: 'thrust_finisher',
    title: 'Piercing Staccato',
    nameZh: '貫穿終止式 (替換型)',
    category: 'replace',
    description: '【替換第三段攻擊】將原本的橫向重斬替換為「超遠程音律直線突刺」，射程達 105 像素，造成 230% 貫通傷害。',
    icon: 'Zap',
    targetStep: 2,
    apply: (stats: PlayerStats) => {
      stats.step3ReplacedWithThrust = true;
    },
  },
  cyclone_flurry: {
    id: 'cyclone_flurry',
    title: 'Waltz of Blades',
    nameZh: '雙刃旋風 (替換型)',
    category: 'replace',
    description: '【替換第二段攻擊】將快速連續斬替換為「360 度周身雙刃旋風」，全方位斬擊身旁所有敵人並造成硬直。',
    icon: 'Wind',
    targetStep: 1,
    apply: (stats: PlayerStats) => {
      stats.step2ReplacedWithSpin = true;
    },
  },

  // --- 追加型被動 (Append) ---
  shockwave_heavy: {
    id: 'shockwave_heavy',
    title: 'Resonant Shockwave',
    nameZh: '斷空震波 (追加型)',
    category: 'append',
    description: '【追加效果】第三段攻擊揮舞時，額外向前發射一道寬幅撕裂音波，對遠處敵人造成 100% 追加傷害。',
    icon: 'Activity',
    apply: (stats: PlayerStats) => {
      stats.shockwaveOnHeavy = true;
    },
  },
  dodge_dash_thrust: {
    id: 'dodge_dash_thrust',
    title: 'Tempo Counter',
    nameZh: '疾影追擊 (追加型)',
    category: 'append',
    description: '【追加效果】成功閃避後 1.8 秒內的下一次普通攻擊自動附帶前衝破風斬，並獲得 100% 暴擊機率。',
    icon: 'Sparkles',
    apply: (stats: PlayerStats) => {
      stats.counterOnDodge = true;
      stats.dashThrustOnDodge = true;
    },
  },
  crescent_cross_wide: {
    id: 'crescent_cross_wide',
    title: 'Crescent Arc Sweep',
    nameZh: '新月重闢 (追加型)',
    category: 'append',
    description: '【追加效果】第一段交叉斬擊半徑提升 45%，並附帶大範圍雙月撕裂劍壓，造成 140% 傷害。',
    icon: 'Sword',
    apply: (stats: PlayerStats) => {
      stats.baseDamage = Math.round(stats.baseDamage * 1.15);
      stats.counterOnDodge = true;
    },
  },
  heavy_stomp_quake: {
    id: 'heavy_stomp_quake',
    title: 'Tremor Cadence',
    nameZh: '震地共鳴 (追加型)',
    category: 'append',
    description: '【追加效果】第三段重斬命中地面時引爆周圍衝擊震波，擊退四周所有敵人並造成 110% 震盪傷害。',
    icon: 'Zap',
    apply: (stats: PlayerStats) => {
      stats.shockwaveOnHeavy = true;
    },
  },

  // --- 強化型被動與特殊秘寶 (Enhance / Relic) ---
  armor_break: {
    id: 'armor_break',
    title: 'Shattered Cadence',
    nameZh: '碎甲音印 (秘寶)',
    category: 'enhance',
    description: '【稀有效果】所有攻擊命中敵人時烙印碎甲效果，使目標受緩速 40%，且後續受到的所有傷害提升 30%。',
    icon: 'Shield',
    apply: (stats: PlayerStats) => {
      stats.slowOnHit = true;
      stats.bleedOnHit = true;
    },
  },
  relic_sacred_aegis: {
    id: 'relic_sacred_aegis',
    title: 'Aegis of Solitude',
    nameZh: '孤寂聖盾 (秘寶)',
    category: 'enhance',
    description: '【稀有效果】立即獲得 70 點堅毅護盾、15 點防禦力與 8% 閃避機率，並在閃避成功時回復 15 點護盾。',
    icon: 'Shield',
    apply: (stats: PlayerStats) => {
      stats.barrier += 70;
      stats.defense = (stats.defense || 0) + 15;
      stats.dodgeRate = Math.min(0.60, (stats.dodgeRate || 0) + 0.08);
    },
  },
  relic_resonance_core: {
    id: 'relic_resonance_core',
    title: 'Resonance Heart Core',
    nameZh: '共鳴之心 (秘寶)',
    category: 'enhance',
    description: '【稀有效果】主動技能傷害提升 40%，最大音律共鳴提升 40 點，並立即回復滿共鳴。',
    icon: 'Sparkles',
    apply: (stats: PlayerStats) => {
      stats.maxResonance += 40;
      stats.resonance = stats.maxResonance;
      stats.skillDamageMult = (stats.skillDamageMult || 1.0) * 1.4;
    },
  },
};
