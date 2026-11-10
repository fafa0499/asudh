export interface Vector2 {
  x: number;
  y: number;
}

export type EnemyType = 'wanderer' | 'phantom_archer' | 'sentinel_golem' | 'boss_maestro';

export interface Entity {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  isDead: boolean;
  facing: number; // angle in radians
}

export interface PlayerStats {
  maxHp: number;
  hp: number;
  maxResonance: number;
  resonance: number;
  speed: number;
  baseDamage: number;
  defense: number; // DEF 防禦力
  dodgeRate: number; // Dodge Rate 閃避機率 (0 to 1)
  attackSpeed: number; // multiplier
  critRate: number; // 0 to 1
  critDamage: number; // multiplier e.g. 1.8
  dodgeCooldown: number; // in seconds
  dodgeDuration: number;
  barrier: number; // temporary shield

  // Passive flags & modifiers
  bleedOnHit: boolean;
  counterOnDodge: boolean;
  shockwaveOnHeavy: boolean;
  dashThrustOnDodge: boolean;
  slowOnHit: boolean;
  skillDamageMult: number;
  resonanceGainMult: number;
  trailDamageOnDodge: boolean;

  // Attack replacement modifier flags
  step3ReplacedWithThrust?: boolean;
  step2ReplacedWithSpin?: boolean;
}

// --- Attack Module & Combo Definitions ---
export type AttackVisualType = 'cross' | 'rapid' | 'sweep' | 'thrust' | 'spin';

export interface AttackStepData {
  stepIndex: number;
  name: string;
  nameZh: string;
  damageMultiplier: number;
  range: number;
  arcAngle: number;
  windupTime: number; // 前搖時間 (秒)
  activeTime: number; // 判定時間 (秒)
  recoveryTime: number; // 後搖時間 (秒)
  comboWindow: number; // 連段允許輸入窗口 (秒)
  knockback: number;
  hitStun: number;
  visualType: AttackVisualType;
  sfx: string;
}

export interface AttackState {
  stepIndex: number;
  phase: 'idle' | 'windup' | 'active' | 'recovery';
  timer: number;
  comboTimer: number;
  hasDealtDamage: boolean;
}

// --- Active Skills & Loadout ---
export type SkillSlot = 'q' | 'e' | 'r';

export interface SkillDefinition {
  id: string;
  title: string;
  nameZh: string;
  description: string;
  icon: string;
  resonanceCost: number;
  cooldown: number; // in seconds
  damageMultiplier: number;
  category: 'mobility' | 'aoe' | 'burst' | 'control' | 'special';
}

export interface SkillInventory {
  acquiredSkills: string[]; // skill IDs
  equipped: {
    q: string | null;
    e: string | null;
    r: string | null;
  };
  cooldowns: {
    q: number;
    e: number;
    r: number;
  };
}

// --- Passive Ability System ---
export type PassiveCategory = 'replace' | 'append' | 'enhance';

export interface PassiveDefinition {
  id: string;
  title: string;
  nameZh: string;
  category: PassiveCategory;
  description: string;
  icon: string;
  targetStep?: number; // 0, 1, 2 for combo modification
  apply: (stats: PlayerStats) => void;
}

// --- Player Interface ---
export interface Player extends Entity {
  stats: PlayerStats;
  isDodging: boolean;
  dodgeTimer: number;
  dodgeCooldownTimer: number;
  invulnerableTimer: number;
  
  // Attack combo module
  attackState: AttackState;
  
  // Skills system
  skills: SkillInventory;

  // Animation state
  runFrame: number;
  lastHurtTimer: number;
  afterimages: Array<{ x: number; y: number; alpha: number; facing: number }>;
}

export interface Enemy extends Entity {
  type: EnemyType;
  name: string;
  speed: number;
  damage: number;
  attackRange: number;
  attackCooldown: number;
  attackTimer: number;
  windupTimer: number;
  isTelegraphing: boolean;
  telegraphType?: 'line' | 'circle' | 'cone';
  telegraphTarget?: Vector2;
  telegraphRadius?: number;
  
  hurtFlashTimer: number;
  hitStunTimer?: number;
  elite?: boolean;
  scoreValue: number;
  
  // Boss specific
  phase?: number;
  specialMoveTimer?: number;
  subTypeAction?: number;
  slowTimer?: number;
  bleedTimer?: number;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  isPlayer: boolean;
  penetrating?: boolean;
  rangeRemaining: number;
  color: string;
  type: 'needle' | 'wave' | 'orb' | 'shard';
  homing?: boolean;
}

export interface SlashAttack {
  id: string;
  x: number;
  y: number;
  facing: number;
  radius: number;
  arcAngle: number;
  damage: number;
  timer: number;
  maxTimer: number;
  isCrit: boolean;
  color: string;
  visualType?: AttackVisualType;
}

export interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  alpha: number;
  decay: number;
  size: number;
  color: string;
  shape: 'circle' | 'spark' | 'petal' | 'dust' | 'note';
}

export interface DamageNumber {
  id: string;
  x: number;
  y: number;
  z: number;
  text: string;
  color: string;
  isCrit: boolean;
  timer: number;
  vy: number;
}

export interface TelegraphArea {
  id: string;
  x: number;
  y: number;
  type: 'circle' | 'line';
  radius?: number;
  width?: number;
  length?: number;
  angle?: number;
  progress: number;
  color: string;
}

export interface Pillar {
  id: string;
  x: number;
  y: number;
  radius: number;
  height: number;
  broken?: boolean;
}

// --- Screen Shake Central Configuration ---
export type ShakeLevel = 'off' | 'low' | 'medium' | 'high';

export const SHAKE_MULTIPLIERS: Record<ShakeLevel, number> = {
  off: 0,
  low: 0.25, // Default: 極輕微
  medium: 0.6,
  high: 1.0,
};

// --- Active Skill Replacement Pending State ---
export interface PendingSkillReplace {
  newSkill: SkillDefinition;
  pickupId: string;
}

// --- Room Types & Branching System ---
export type RoomType =
  | 'skill'         // 主動技能房 (提供 2~3 個主動技能)
  | 'attack_mod'    // 攻擊強化房 (提供 2~3 個連段模組被動)
  | 'upgrade'       // 基礎強化房 (提供 2~3 個基礎數值強化)
  | 'fountain'      // 回復房 (生命恢復與護盾補給)
  | 'chest'         // 寶箱房 (稀有道具、特殊被動)
  | 'elite'         // 精英房 (高品質戰鬥獎勵)
  | 'boss';         // Boss 房 (終焉之戰)

export interface RoomBranchOption {
  id: string;
  type: RoomType;
  name: string;
  nameZh: string;
  dangerLevel: 1 | 2 | 3 | 4 | 5;
  description: string;
  rewardTypeDesc: string;
  icon: string;
}

// --- Room Phase State Machine ---
export type RoomPhase =
  | 'initializing'    // 房間初始化
  | 'spawning'        // 敵人或機關生成中
  | 'combat'          // 戰鬥進行中
  | 'cleared'         // 戰鬥完成
  | 'reward_pending'  // 場景獎勵掉落，等待拾取
  | 'doors_open'      // 獎勵已選，場景實體門扉開啟，等待確認進入
  | 'branch_confirmation'
  | 'boss_completed'
  | 'exiting';        // 玩家踏入傳送門，切換房間

export interface WorldDoor {
  id: string;
  x: number;
  y: number;
  radius: number;
  branch: RoomBranchOption;
  active: boolean;
}

export interface WorldRewardPickup {
  id: string;
  x: number;
  y: number;
  radius: number;
  reward: RewardItem;
  claimed: boolean;
}

export interface WorldChest {
  x: number;
  y: number;
  radius: number;
  opened: boolean;
}

export interface WorldFountain {
  x: number;
  y: number;
  radius: number;
  used: boolean;
}

export interface RoomInfo {
  index: number;
  depth: number;
  name: string;
  nameZh: string;
  type: RoomType;
  phase: RoomPhase;
  totalEnemies: number;
  enemiesRemaining: number;
  isCleared: boolean;
  width: number;
  height: number;
  pillars?: Pillar[];
  doors?: WorldDoor[];
  pickups?: WorldRewardPickup[];
  chest?: WorldChest;
  fountain?: WorldFountain;
}

// --- Distinct Reward System ---
export type RewardCategory = 'stat' | 'passive' | 'skill' | 'equipment';

export interface BaseRewardItem {
  id: string;
  category: RewardCategory;
  title: string;
  nameZh: string;
  description: string;
  rarity: 'common' | 'rare' | 'legendary';
  icon: string;
  synergyTag: string;
}

export interface StatRewardItem extends BaseRewardItem {
  category: 'stat';
  apply: (stats: PlayerStats) => void;
}

export interface PassiveRewardItem extends BaseRewardItem {
  category: 'passive';
  passive: PassiveDefinition;
}

export interface SkillRewardItem extends BaseRewardItem {
  category: 'skill';
  skill: SkillDefinition;
}

export interface EquipmentRewardItem extends BaseRewardItem {
  category: 'equipment';
  equipment: PassiveDefinition;
}

export type RewardItem = StatRewardItem | PassiveRewardItem | SkillRewardItem | EquipmentRewardItem;
