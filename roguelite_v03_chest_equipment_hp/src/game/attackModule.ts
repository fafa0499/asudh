import { AttackStepData, PlayerStats } from '../types/game';

/**
 * Base Native 3-Hit Combo Attack Module for Dual-Blade Little Girl
 * Step 0: 交叉斬擊 (Cross Slash)
 * Step 1: 快速連續斬擊 (Rapid Flurry)
 * Step 2: 橫向重斬 (Heavy Sweep)
 */
export const BASE_COMBO_STEPS: AttackStepData[] = [
  {
    stepIndex: 0,
    name: 'Cross Slash',
    nameZh: '交叉斬擊',
    damageMultiplier: 1.0,
    range: 56,
    arcAngle: Math.PI * 0.72,
    windupTime: 0.07,
    activeTime: 0.12,
    recoveryTime: 0.14,
    comboWindow: 0.85,
    knockback: 70,
    hitStun: 0.18,
    visualType: 'cross',
    sfx: 'slash_cross',
  },
  {
    stepIndex: 1,
    name: 'Rapid Flurry',
    nameZh: '連鎖疾斬',
    damageMultiplier: 1.25,
    range: 62,
    arcAngle: Math.PI * 0.85,
    windupTime: 0.06,
    activeTime: 0.13,
    recoveryTime: 0.15,
    comboWindow: 0.85,
    knockback: 90,
    hitStun: 0.22,
    visualType: 'rapid',
    sfx: 'slash_rapid',
  },
  {
    stepIndex: 2,
    name: 'Heavy Sweep',
    nameZh: '橫向重斬',
    damageMultiplier: 1.75,
    range: 76,
    arcAngle: Math.PI * 1.1,
    windupTime: 0.13,
    activeTime: 0.17,
    recoveryTime: 0.24,
    comboWindow: 0.6,
    knockback: 220,
    hitStun: 0.35,
    visualType: 'sweep',
    sfx: 'slash_heavy',
  },
];

/**
 * Alternate Replacement Attack Steps unlocked by Passives
 */
export const ALTERNATE_STEPS: Record<string, AttackStepData> = {
  // Passive replacement for Step 2: Linear Puncture Thrust
  thrust_finisher: {
    stepIndex: 2,
    name: 'Resonant Thrust',
    nameZh: '共鳴音刺 (替換技)',
    damageMultiplier: 2.3,
    range: 105,
    arcAngle: Math.PI * 0.35, // Narrow focused straight thrust
    windupTime: 0.1,
    activeTime: 0.15,
    recoveryTime: 0.2,
    comboWindow: 0.6,
    knockback: 260,
    hitStun: 0.4,
    visualType: 'thrust',
    sfx: 'thrust_pierce',
  },

  // Passive replacement for Step 1: 360 Whirlwind Spin
  spin_step2: {
    stepIndex: 1,
    name: 'Blade Cyclone',
    nameZh: '雙刃旋風 (替換技)',
    damageMultiplier: 1.5,
    range: 68,
    arcAngle: Math.PI * 2.0, // Full 360 degree hit!
    windupTime: 0.08,
    activeTime: 0.16,
    recoveryTime: 0.16,
    comboWindow: 0.85,
    knockback: 130,
    hitStun: 0.25,
    visualType: 'spin',
    sfx: 'slash_spin',
  },
};

/**
 * Resolves the actual AttackStepData for a given step index based on player's active passives
 */
export function getAttackStep(stepIndex: number, stats: PlayerStats): AttackStepData {
  if (stepIndex === 2 && stats.step3ReplacedWithThrust) {
    return ALTERNATE_STEPS.thrust_finisher;
  }
  if (stepIndex === 1 && stats.step2ReplacedWithSpin) {
    return ALTERNATE_STEPS.spin_step2;
  }
  return BASE_COMBO_STEPS[stepIndex % BASE_COMBO_STEPS.length];
}
