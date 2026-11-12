import {
  AttackStepData,
  DamageNumber,
  Enemy,
  EnemyType,
  Particle,
  PassiveDefinition,
  PendingSkillReplace,
  Player,
  PlayerStats,
  Projectile,
  RewardItem,
  RoomBranchOption,
  RoomInfo,
  SlashAttack,
  TelegraphArea,
  Vector2,
  WorldDoor,
  WorldRewardPickup,
} from '../types/game';
import { soundManager } from '../audio/soundManager';
import { getAttackStep } from './attackModule';
import { createDefaultSkillInventory, equipSkill, SKILL_CATALOG, unequipSkill } from './skills';
import { RoomSystem } from './roomSystem';
import { RewardSystem } from './rewardSystem';
import { TILT_Y } from './renderer';

export class GameEngine {
  public player: Player;
  public enemies: Enemy[] = [];
  public projectiles: Projectile[] = [];
  public slashes: SlashAttack[] = [];
  public telegraphs: TelegraphArea[] = [];
  public particles: Particle[] = [];
  public ambientParticles: Particle[] = [];
  public damageNumbers: DamageNumber[] = [];

  public camX: number = 0;
  public camY: number = 0;
  public mouseWorldPos: Vector2 = { x: 0, y: 0 };
  public mouseScreenPos: Vector2 = { x: 0, y: 0 };

  // Room & Branching state
  public currentDepth: number = 1;
  public currentWave: number = 1;
  public totalWaves: number = 3;
  public currentRoom: RoomInfo;
  public roomLocked: boolean = true;
  public pendingRewards: RewardItem[] | null = null;
  public pendingBranches: RoomBranchOption[] | null = null;
  public acquiredPassives: PassiveDefinition[] = [];
  public acquiredEquipment: PassiveDefinition[] = [];
  public equippedEquipmentIds: string[] = [];
  public pendingSkillReplace: PendingSkillReplace | null = null;
  public rewardObjectActivated: boolean = false;
  public pendingBranchConfirmation: RoomBranchOption | null = null;
  public interactPressed: boolean = false;

  // Flow & State flags
  public isPaused: boolean = false;
  public isGameOver: boolean = false;
  public isVictory: boolean = false;
  public isConfiguringSkills: boolean = false;
  public totalEnemiesDefeated: number = 0;
  public totalDamageDealt: number = 0;
  public runTimeSeconds: number = 0;

  // Hit-stop micro freeze
  public hitStopTimer: number = 0;

  // Keys & Input state
  public keys: { [key: string]: boolean } = {};
  public mouseLeftDown: boolean = false;

  public onShake: (amount: number) => void = () => {};

  constructor() {
    this.player = this.createDefaultPlayer();
    this.initAmbientParticles();

    // Start in Chamber 1 (基礎強化房)
    const initialBranch: RoomBranchOption = {
      id: 'init_room_1',
      type: 'upgrade',
      name: 'Altar of Cadence',
      nameZh: '基礎強化房 (終止式祭壇)',
      dangerLevel: 2,
      description: '銘刻著力量聖印的古老石壇，純粹淬鍊角色的核心體魄。',
      rewardTypeDesc: '【專屬獎勵】基礎能力精修 (攻擊/暴擊/移速)',
      icon: 'Star',
    };
    this.currentRoom = RoomSystem.buildRoomInfo(initialBranch, 1);
    this.enterRoom(initialBranch);
  }

  public createDefaultPlayer(): Player {
    const stats: PlayerStats = {
      maxHp: 120,
      hp: 120,
      maxResonance: 100,
      resonance: 40,
      speed: 210,
      baseDamage: 24,
      defense: 12,
      dodgeRate: 0.08,
      attackSpeed: 1.08,
      critRate: 0.15,
      critDamage: 1.75,
      dodgeCooldown: 0.95,
      dodgeDuration: 0.32,
      barrier: 0,

      bleedOnHit: false,
      counterOnDodge: false,
      shockwaveOnHeavy: false,
      dashThrustOnDodge: false,
      slowOnHit: false,
      skillDamageMult: 1.0,
      resonanceGainMult: 1.0,
      trailDamageOnDodge: false,
    };

    return {
      id: 'player_girl',
      x: 0,
      y: 120,
      vx: 0,
      vy: 0,
      radius: 18,
      hp: 120,
      maxHp: 120,
      isDead: false,
      facing: 0,
      stats,
      isDodging: false,
      dodgeTimer: 0,
      dodgeCooldownTimer: 0,
      invulnerableTimer: 0,

      // Dedicated attack module state
      attackState: {
        stepIndex: 0,
        phase: 'idle',
        timer: 0,
        comboTimer: 0,
        hasDealtDamage: false,
      },

      // Starts with zero active skills equipped!
      skills: createDefaultSkillInventory(),

      runFrame: 0,
      lastHurtTimer: 0,
      afterimages: [],
    };
  }

  private initAmbientParticles() {
    this.ambientParticles = [];
    for (let i = 0; i < 40; i++) {
      this.ambientParticles.push({
        x: (Math.random() - 0.5) * 1200,
        y: (Math.random() - 0.5) * 1000,
        z: Math.random() * 80 + 10,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.5) * 15,
        vz: (Math.random() - 0.5) * 5,
        alpha: Math.random() * 0.4 + 0.1,
        decay: 0,
        size: Math.random() * 2 + 1,
        color: Math.random() > 0.4 ? '#e4e4ee' : '#9999aa',
        shape: Math.random() > 0.7 ? 'petal' : 'circle',
      });
    }
  }

  // --- Room Navigation & Branching ---
  public enterRoom(branch: RoomBranchOption) {
    this.currentRoom = RoomSystem.buildRoomInfo(branch, this.currentDepth);
    this.currentRoom.doors = [];
    this.currentRoom.pickups = [];
    this.currentRoom.chest = undefined;
    this.currentRoom.fountain = undefined;
    // Natural recovery occurs only when entering a new room, not from rewards.
    if (this.currentDepth > 1) {
      const roomHeal = Math.round(this.player.stats.maxHp * 0.15);
      this.player.stats.hp = Math.min(this.player.stats.maxHp, this.player.stats.hp + roomHeal);
    }
    this.currentWave = 1;
    this.totalWaves = branch.type === 'boss' ? 1 : (branch.type === 'elite' ? 2 : 3);
    this.currentRoom.waveIndex = this.currentWave;
    this.currentRoom.totalWaves = this.totalWaves;
    this.currentRoom.phase = 'initializing';

    this.pendingRewards = null;
    this.pendingBranches = null;
    this.rewardObjectActivated = false;
    this.pendingBranchConfirmation = null;
    this.pendingSkillReplace = null;
    this.interactPressed = false;
    this.enemies = [];
    this.projectiles = [];
    this.slashes = [];
    this.telegraphs = [];

    // Reset player position to south entrance
    this.player.x = 0;
    this.player.y = 200;
    this.player.vx = 0;
    this.player.vy = 0;

    // Apply room start barrier if perk active
    if (this.player.stats.barrier < 30 && this.acquiredPassives.some((p) => p.id === 'stat_barrier_shield')) {
      this.player.stats.barrier = 30;
    }

    if (branch.type === 'boss') {
      this.currentRoom.phase = 'spawning';
      this.roomLocked = true;
      this.currentRoom.isCleared = false;
      this.spawnBoss();
      this.currentRoom.phase = 'combat';
    } else if (branch.type === 'elite') {
      this.currentRoom.phase = 'spawning';
      this.roomLocked = true;
      this.currentRoom.isCleared = false;
      this.spawnEnemySquad(true);
      this.currentRoom.phase = 'combat';
    } else if (branch.type === 'chest' || branch.type === 'fountain') {
      // Treasure rooms and the green gate are combat rooms; their rewards unlock only after clearing.
      this.currentRoom.phase = 'spawning';
      this.roomLocked = true;
      this.currentRoom.isCleared = false;
      this.spawnEnemySquad(branch.type === 'fountain');
      this.currentRoom.phase = 'combat';
    } else {
      // Combat rooms: 'skill', 'attack_mod', 'upgrade'
      this.currentRoom.phase = 'spawning';
      this.roomLocked = true;
      this.currentRoom.isCleared = false;
      this.spawnEnemySquad(false);
      this.currentRoom.phase = 'combat';
    }

    this.currentRoom.totalEnemies = this.enemies.length;
    this.currentRoom.enemiesRemaining = this.enemies.length;
  }

  public selectRoomBranch(branch: RoomBranchOption) {
    const nextDepth = this.currentDepth + 1;
    // Hard guard: the fifth room must be the Boss, and Boss cannot appear earlier.
    if (nextDepth >= 5 && branch.type !== 'boss') return;
    if (branch.type === 'boss' && nextDepth < 5) return;
    if (this.currentRoom.type === 'boss' || this.isVictory) return;
    soundManager.playSelectCard();
    this.currentDepth = nextDepth;
    this.enterRoom(branch);
  }

  private spawnEnemySquad(isElite: boolean) {
    // Fixed wave count per room; enemy count is randomized within a controlled range.
    const count = (isElite ? 2 : 2) + Math.floor(Math.random() * (isElite ? 2 : 3));
    let idCounter = 1;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 180 + Math.random() * 200;
      const ex = Math.cos(angle) * dist;
      const ey = Math.sin(angle) * dist - 60;

      let type: EnemyType = 'wanderer';
      if (isElite) {
        type = i === 0 ? 'sentinel_golem' : i === 1 ? 'phantom_archer' : 'wanderer';
      } else {
        if (this.currentDepth >= 2 && i % 3 === 1) type = 'phantom_archer';
        if (this.currentDepth >= 3 && i === count - 1) type = 'sentinel_golem';
      }

      this.enemies.push(this.createEnemy(type, `enemy_${idCounter++}`, ex, ey, isElite));
    }
  }

  private spawnBoss() {
    const boss = this.createEnemy('boss_maestro', 'boss_maestro_1', 0, -180, true);
    // Scale boss with depth
    boss.hp = Math.round(boss.hp * (1 + (this.currentDepth - 5) * 0.25));
    boss.maxHp = boss.hp;
    this.enemies.push(boss);
  }

  private createEnemy(
    type: EnemyType,
    id: string,
    x: number,
    y: number,
    elite: boolean = false
  ): Enemy {
    const mult = elite ? 1.5 : 1.0;

    if (type === 'wanderer') {
      return {
        id,
        type,
        name: elite ? 'Elite Shadow Stalker' : 'Shadow Wanderer',
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 20,
        hp: Math.round(65 * mult * (1 + (Math.ceil(this.currentDepth / 5) - 1) * 0.28)),
        maxHp: Math.round(65 * mult * (1 + (Math.ceil(this.currentDepth / 5) - 1) * 0.28)),
        isDead: false,
        facing: 0,
        speed: (130 + Math.random() * 25) * (elite ? 1.25 : 1),
        damage: Math.round(14 * mult),
        attackRange: 42,
        attackCooldown: 1.4,
        attackTimer: Math.random() * 0.8,
        windupTimer: 0,
        isTelegraphing: false,
        hurtFlashTimer: 0,
        hitStunTimer: 0,
        elite,
        scoreValue: elite ? 250 : 100,
      };
    } else if (type === 'phantom_archer') {
      return {
        id,
        type,
        name: elite ? 'Phantom Virtuoso' : 'Phantom Archer',
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 22,
        hp: Math.round(52 * mult * (1 + (Math.ceil(this.currentDepth / 5) - 1) * 0.28)),
        maxHp: Math.round(52 * mult * (1 + (Math.ceil(this.currentDepth / 5) - 1) * 0.28)),
        isDead: false,
        facing: 0,
        speed: 105 * (elite ? 1.2 : 1),
        damage: Math.round(18 * mult),
        attackRange: 320,
        attackCooldown: 2.3,
        attackTimer: 0.5 + Math.random() * 1.0,
        windupTimer: 0,
        isTelegraphing: false,
        hurtFlashTimer: 0,
        hitStunTimer: 0,
        elite,
        scoreValue: elite ? 300 : 140,
      };
    } else if (type === 'sentinel_golem') {
      return {
        id,
        type,
        name: 'Gilded Sentinel Golem',
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 34,
        hp: Math.round(220 * mult * (1 + (Math.ceil(this.currentDepth / 5) - 1) * 0.28)),
        maxHp: Math.round(220 * mult * (1 + (Math.ceil(this.currentDepth / 5) - 1) * 0.28)),
        isDead: false,
        facing: 0,
        speed: 65,
        damage: Math.round(28 * mult),
        attackRange: 80,
        attackCooldown: 2.8,
        attackTimer: 1.0,
        windupTimer: 0,
        isTelegraphing: false,
        hurtFlashTimer: 0,
        hitStunTimer: 0,
        elite,
        scoreValue: 400,
      };
    } else {
      return {
        id,
        type,
        name: 'The Marionette Maestro',
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 40,
        hp: 750,
        maxHp: 750,
        isDead: false,
        facing: 0,
        speed: 110,
        damage: 22,
        attackRange: 280,
        attackCooldown: 1.8,
        attackTimer: 0.8,
        windupTimer: 0,
        isTelegraphing: false,
        hurtFlashTimer: 0,
        hitStunTimer: 0,
        phase: 1,
        specialMoveTimer: 3.5,
        scoreValue: 2500,
      };
    }
  }

  // --- Main Update Loop ---
  public update(dt: number) {
    if (this.isPaused || this.isGameOver || this.isVictory || this.rewardObjectActivated || this.pendingSkillReplace || this.pendingBranchConfirmation) return;

    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= dt;
      return;
    }

    this.runTimeSeconds += dt;

    // Update Player & Attacks
    this.updatePlayer(dt);

    // Update Skills cooldowns
    (['q', 'e', 'r'] as const).forEach((slot) => {
      if (this.player.skills.cooldowns[slot] > 0) {
        this.player.skills.cooldowns[slot] = Math.max(0, this.player.skills.cooldowns[slot] - dt);
      }
    });

    // Update Camera
    const targetCamX = this.player.x;
    const targetCamY = this.player.y;
    this.camX += (targetCamX - this.camX) * Math.min(1, dt * 7);
    this.camY += (targetCamY - this.camY) * Math.min(1, dt * 7);

    // Update Entities
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updateSlashes(dt);
    this.updateTelegraphs(dt);
    this.updateParticles(dt);
    this.updateDamageNumbers(dt);

    // Update in-world doors, reward pedestals, chests, and fountains
    this.updateWorldInteractions(dt);

    // Check Room Clear
    this.checkRoomState();
  }

  private updatePlayer(dt: number) {
    const p = this.player;
    const stats = p.stats;

    // Facing angle follows mouse
    const dxAim = this.mouseWorldPos.x - p.x;
    const dyAim = this.mouseWorldPos.y - p.y;
    p.facing = Math.atan2(dyAim, dxAim);

    // Timers decrement
    if (p.dodgeCooldownTimer > 0) p.dodgeCooldownTimer -= dt;
    if (p.invulnerableTimer > 0) p.invulnerableTimer -= dt;
    if (p.lastHurtTimer > 0) p.lastHurtTimer -= dt;

    // Afterimages decay
    if (p.afterimages.length > 0) {
      for (let i = p.afterimages.length - 1; i >= 0; i--) {
        p.afterimages[i].alpha -= dt * 3.5;
        if (p.afterimages[i].alpha <= 0) {
          p.afterimages.splice(i, 1);
        }
      }
    }

    // --- Attack State Machine (Windup -> Active -> Recovery -> Idle) ---
    const atk = p.attackState;

    if (atk.phase === 'windup') {
      atk.timer -= dt;
      if (atk.timer <= 0) {
        // Transition to active判定
        const stepData = getAttackStep(atk.stepIndex, stats);
        atk.phase = 'active';
        atk.timer = stepData.activeTime / stats.attackSpeed;
        atk.hasDealtDamage = false;

        // Execute Attack Hitbox & VFX
        this.executeAttackHitbox(stepData);
      }
    } else if (atk.phase === 'active') {
      atk.timer -= dt;
      if (atk.timer <= 0) {
        const stepData = getAttackStep(atk.stepIndex, stats);
        atk.phase = 'recovery';
        atk.timer = stepData.recoveryTime / stats.attackSpeed;
      }
    } else if (atk.phase === 'recovery') {
      atk.timer -= dt;
      if (atk.timer <= 0) {
        const stepData = getAttackStep(atk.stepIndex, stats);
        atk.phase = 'idle';
        atk.comboTimer = stepData.comboWindow; // combo window starts
      }
    } else if (atk.phase === 'idle') {
      if (atk.comboTimer > 0) {
        atk.comboTimer -= dt;
        if (atk.comboTimer <= 0) {
          atk.stepIndex = 0; // combo timed out, reset to step 0
        }
      }
    }

    // Dodge State Update
    if (p.isDodging) {
      p.dodgeTimer -= dt;
      if (Math.random() > 0.4) {
        p.afterimages.push({
          x: p.x,
          y: p.y,
          alpha: 0.8,
          facing: p.facing,
        });
      }
      if (p.dodgeTimer <= 0) {
        p.isDodging = false;
      }
    } else {
      // Normal Screen-relative Movement (WASD)
      let screenDx = 0;
      let screenDy = 0;
      if (this.keys['KeyW'] || this.keys['ArrowUp']) screenDy -= 1;
      if (this.keys['KeyS'] || this.keys['ArrowDown']) screenDy += 1;
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) screenDx -= 1;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) screenDx += 1;

      const screenLen = Math.hypot(screenDx, screenDy);
      if (screenLen > 0) {
        screenDx /= screenLen;
        screenDy /= screenLen;
      }

      // If attacking and not idle, slow movement down during swing
      const moveSpeedMult = atk.phase === 'idle' ? 1.0 : 0.35;
      const targetVx = screenDx * stats.speed * moveSpeedMult;
      const targetVy = (screenDy / TILT_Y) * stats.speed * moveSpeedMult;

      p.vx += (targetVx - p.vx) * Math.min(1, dt * 14);
      p.vy += (targetVy - p.vy) * Math.min(1, dt * 14);

      if (Math.hypot(p.vx, p.vy) > 10) {
        p.runFrame += dt * (stats.speed / 50);
      } else {
        p.runFrame = 0;
      }

      // Check Attack Trigger
      if (this.mouseLeftDown && atk.phase === 'idle' && !p.isDodging) {
        this.triggerComboAttack();
      }
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // Pillar Collisions
    if (this.currentRoom.pillars) {
      for (const pil of this.currentRoom.pillars) {
        const dx = p.x - pil.x;
        const dy = p.y - pil.y;
        const dist = Math.hypot(dx, dy);
        const minDist = p.radius + pil.radius;
        if (dist < minDist && dist > 0.0001) {
          p.x = pil.x + (dx / dist) * minDist;
          p.y = pil.y + (dy / dist) * minDist;
        }
      }
    }

    // Room boundaries
    const halfW = this.currentRoom.width / 2 - p.radius - 8;
    const halfH = this.currentRoom.height / 2 - p.radius - 8;
    p.x = Math.max(-halfW, Math.min(halfW, p.x));
    p.y = Math.max(-halfH, Math.min(halfH, p.y));
  }

  // --- Native Combo Attack Execution ---
  public triggerComboAttack() {
    const p = this.player;
    const atk = p.attackState;

    let targetStep = 0;
    if (atk.comboTimer > 0) {
      targetStep = (atk.stepIndex + 1) % 3;
    }

    atk.stepIndex = targetStep;
    const stepData = getAttackStep(targetStep, p.stats);

    atk.phase = 'windup';
    atk.timer = stepData.windupTime / p.stats.attackSpeed;
    atk.comboTimer = 0;

    // If Dash-thrust passive active, lunge forward!
    if (p.stats.dashThrustOnDodge && p.invulnerableTimer > 0) {
      p.vx += Math.cos(p.facing) * 240;
      p.vy += (Math.sin(p.facing) / TILT_Y) * 240;
    }
  }

  private executeAttackHitbox(stepData: AttackStepData) {
    const p = this.player;
    const stats = p.stats;

    soundManager.playAttackSlash(stepData.stepIndex);

    let isCrit = Math.random() < stats.critRate;
    if (stats.counterOnDodge && p.invulnerableTimer > 0) {
      isCrit = true;
    }

    let dmg = stats.baseDamage * stepData.damageMultiplier;
    if (isCrit) dmg *= stats.critDamage;

    const slashOriginX = p.x + Math.cos(p.facing) * 16;
    const slashOriginY = p.y + Math.sin(p.facing) * 16;

    this.slashes.push({
      id: `slash_${Date.now()}_${Math.random()}`,
      x: slashOriginX,
      y: slashOriginY,
      facing: p.facing,
      radius: stepData.range,
      arcAngle: stepData.arcAngle,
      damage: dmg,
      timer: 0.16,
      maxTimer: 0.16,
      isCrit,
      color: isCrit ? '#ffe082' : '#ffffff',
      visualType: stepData.visualType,
    });

    // Check hit on enemies
    this.enemies.forEach((enemy) => {
      if (enemy.isDead) return;
      const d = Math.hypot(enemy.x - slashOriginX, enemy.y - slashOriginY);
      if (d <= stepData.range + enemy.radius) {
        const angleToEnemy = Math.atan2(enemy.y - slashOriginY, enemy.x - slashOriginX);
        let diff = angleToEnemy - p.facing;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        if (Math.abs(diff) <= stepData.arcAngle / 2 + 0.35) {
          this.damageEnemy(enemy, dmg, isCrit);

          // Check Super Armor (Elites, Sentinel Golem, Boss Maestro)
          const isSuperArmor = enemy.elite || enemy.type === 'sentinel_golem' || enemy.type === 'boss_maestro';

          if (!isSuperArmor) {
            // Ordinary enemies: Stagger hitstun, interrupt telegraphs, full knockback
            enemy.hitStunTimer = Math.max(enemy.hitStunTimer || 0, stepData.hitStun);
            if (enemy.isTelegraphing) {
              enemy.isTelegraphing = false;
              enemy.windupTimer = 0;
              enemy.attackTimer = 0.5; // Re-evaluate attack after stun
              this.telegraphs = this.telegraphs.filter((t) => !t.id.includes(enemy.id));
            }
            enemy.vx += Math.cos(p.facing) * stepData.knockback;
            enemy.vy += Math.sin(p.facing) * stepData.knockback;
          } else {
            // Super Armor: Immune to hitstun, preserves telegraph/windup, slight recoil only
            enemy.hitStunTimer = 0;
            enemy.vx += Math.cos(p.facing) * (stepData.knockback * 0.15);
            enemy.vy += Math.sin(p.facing) * (stepData.knockback * 0.15);

            // Metallic super armor spark particles
            for (let s = 0; s < 4; s++) {
              this.particles.push({
                x: enemy.x + (Math.random() - 0.5) * 16,
                y: enemy.y + (Math.random() - 0.5) * 16,
                z: 22 + Math.random() * 15,
                vx: (Math.random() - 0.5) * 110,
                vy: (Math.random() - 0.5) * 110,
                vz: Math.random() * 50,
                alpha: 1,
                decay: 3.2,
                size: 2,
                color: '#ffe082',
                shape: 'spark',
              });
            }
          }
        }
      }
    });

    // Restore resonance
    const resGain = (stepData.stepIndex === 2 ? 16 : 8) * stats.resonanceGainMult;
    stats.resonance = Math.min(stats.maxResonance, stats.resonance + resGain);

    // Passive Append: Shockwave on Step 2 Heavy Sweep
    if (stats.shockwaveOnHeavy && stepData.stepIndex === 2) {
      this.projectiles.push({
        id: `shockwave_${Date.now()}`,
        x: p.x,
        y: p.y,
        vx: Math.cos(p.facing) * 380,
        vy: Math.sin(p.facing) * 380,
        radius: 24,
        damage: stats.baseDamage * 1.0,
        isPlayer: true,
        penetrating: true,
        rangeRemaining: 400,
        color: '#e0e8ff',
        type: 'wave',
      });
    }
  }

  // --- Dodge Action ---
  public performDodge() {
    const p = this.player;
    if (p.isDodging || p.dodgeCooldownTimer > 0) return;

    p.isDodging = true;
    p.dodgeTimer = p.stats.dodgeDuration;
    p.dodgeCooldownTimer = p.stats.dodgeCooldown;
    p.invulnerableTimer = p.stats.dodgeDuration + 0.08;

    let sDx = 0;
    let sDy = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) sDy -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) sDy += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) sDx -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) sDx += 1;

    const dashSpeed = p.stats.speed * 2.8;

    if (sDx !== 0 || sDy !== 0) {
      const len = Math.hypot(sDx, sDy);
      sDx /= len;
      sDy /= len;
      p.vx = sDx * dashSpeed;
      p.vy = (sDy / TILT_Y) * dashSpeed;
    } else {
      const faceAngle = p.facing;
      let sX = Math.cos(faceAngle);
      let sY = Math.sin(faceAngle) * TILT_Y;
      const sLen = Math.hypot(sX, sY);
      if (sLen > 0) {
        sX /= sLen;
        sY /= sLen;
      }
      p.vx = sX * dashSpeed;
      p.vy = (sY / TILT_Y) * dashSpeed;
    }

    soundManager.playDodge();
  }

  // --- Active Skills Cast Execution ---
  public castSkill(slot: 'q' | 'e' | 'r') {
    const p = this.player;
    const skillId = p.skills.equipped[slot];
    if (!skillId) return; // Slot empty!

    const skillDef = SKILL_CATALOG[skillId];
    if (!skillDef) return;

    if (p.skills.cooldowns[slot] > 0 || p.stats.resonance < skillDef.resonanceCost) {
      return;
    }

    // Deduct cost and start cooldown
    p.stats.resonance -= skillDef.resonanceCost;
    p.skills.cooldowns[slot] = skillDef.cooldown;

    // Trigger Skill by ID
    if (skillId === 'shadow_dash') {
      soundManager.playDodge();
      this.onShake(2);
      p.invulnerableTimer = 0.35;
      const dashSpeed = p.stats.speed * 3.4;
      p.vx = Math.cos(p.facing) * dashSpeed;
      p.vy = (Math.sin(p.facing) / TILT_Y) * dashSpeed;

      const slashDmg = p.stats.baseDamage * skillDef.damageMultiplier;
      this.slashes.push({
        id: `sd_${Date.now()}`,
        x: p.x,
        y: p.y,
        facing: p.facing,
        radius: 80,
        arcAngle: Math.PI * 0.9,
        damage: slashDmg,
        timer: 0.2,
        maxTimer: 0.2,
        isCrit: true,
        color: '#c0d0ff',
        visualType: 'thrust',
      });
      this.enemies.forEach((en) => {
        if (!en.isDead && Math.hypot(en.x - p.x, en.y - p.y) < 95) {
          this.damageEnemy(en, slashDmg, true);
        }
      });
    } else if (skillId === 'blade_cyclone') {
      soundManager.playSkillE();
      this.onShake(3);
      const bladeDmg = p.stats.baseDamage * skillDef.damageMultiplier;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const spd = 280;
        this.projectiles.push({
          id: `cyclone_${Date.now()}_${i}`,
          x: p.x + Math.cos(angle) * 20,
          y: p.y + Math.sin(angle) * 20,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          radius: 14,
          damage: bladeDmg,
          isPlayer: true,
          rangeRemaining: 240,
          color: '#ffffff',
          type: 'shard',
        });
      }
    } else if (skillId === 'piercing_crescent') {
      soundManager.playSkillQ();
      this.onShake(2);
      const waveDmg = p.stats.baseDamage * skillDef.damageMultiplier;
      this.projectiles.push({
        id: `pierce_${Date.now()}`,
        x: p.x,
        y: p.y,
        vx: Math.cos(p.facing) * 440,
        vy: Math.sin(p.facing) * 440,
        radius: 28,
        damage: waveDmg,
        isPlayer: true,
        penetrating: true,
        rangeRemaining: 550,
        color: '#e8f0fe',
        type: 'wave',
      });
    } else if (skillId === 'phantom_echoes') {
      soundManager.playAttackSlash(1);
      for (let i = 0; i < 4; i++) {
        const spread = (i - 1.5) * 0.28;
        const ang = p.facing + spread;
        this.projectiles.push({
          id: `echo_${Date.now()}_${i}`,
          x: p.x,
          y: p.y,
          vx: Math.cos(ang) * 360,
          vy: Math.sin(ang) * 360,
          radius: 10,
          damage: p.stats.baseDamage * skillDef.damageMultiplier,
          isPlayer: true,
          rangeRemaining: 440,
          color: '#c0d0ff',
          type: 'needle',
          homing: true,
        });
      }
    } else if (skillId === 'harmonic_counter') {
      soundManager.playTelegraphWarn();
      p.invulnerableTimer = 1.0;
      this.particles.push({
        x: p.x,
        y: p.y,
        z: 20,
        vx: 0,
        vy: 0,
        vz: 0,
        alpha: 0.9,
        decay: 1.0,
        size: 35,
        color: '#ffe082',
        shape: 'circle',
      });
      // Counter burst
      window.setTimeout(() => {
        soundManager.playHit(true);
        this.onShake(4);
        this.enemies.forEach((en) => {
          if (!en.isDead && Math.hypot(en.x - p.x, en.y - p.y) < 140) {
            this.damageEnemy(en, p.stats.baseDamage * 3.0, true);
          }
        });
      }, 300);
    } else if (skillId === 'requiem_climax') {
      soundManager.playSkillR();
      this.onShake(6);
      this.hitStopTimer = 0.08;
      // Clear enemy projectiles
      this.projectiles = this.projectiles.filter((pr) => pr.isPlayer);
      const ultDmg = p.stats.baseDamage * skillDef.damageMultiplier;
      this.enemies.forEach((en) => {
        if (!en.isDead && Math.hypot(en.x - p.x, en.y - p.y) < 280) {
          this.damageEnemy(en, ultDmg, true);
        }
      });
    }
  }

  // --- Enemies AI ---
  private updateEnemies(dt: number) {
    const p = this.player;

    this.enemies.forEach((enemy) => {
      if (enemy.isDead) return;

      if (enemy.hurtFlashTimer > 0) enemy.hurtFlashTimer -= dt;
      const isStunned = Boolean(enemy.hitStunTimer && enemy.hitStunTimer > 0);
      if (isStunned && enemy.hitStunTimer) {
        enemy.hitStunTimer -= dt;
      }

      if (!isStunned) {
        if (enemy.bleedTimer && enemy.bleedTimer > 0) {
        enemy.bleedTimer -= dt;
        if (Math.random() < dt * 3) {
          this.damageEnemy(enemy, Math.round(p.stats.baseDamage * 0.2), false);
        }
      }

      let currentSpeed = enemy.speed;
      if (enemy.slowTimer && enemy.slowTimer > 0) {
        enemy.slowTimer -= dt;
        currentSpeed *= 0.6;
      }

      const dx = p.x - enemy.x;
      const dy = p.y - enemy.y;
      const dist = Math.hypot(dx, dy);
      enemy.facing = Math.atan2(dy, dx);

      if (enemy.attackTimer > 0) enemy.attackTimer -= dt;

      if (enemy.type === 'wanderer') {
        if (dist > enemy.attackRange && !enemy.isTelegraphing) {
          enemy.vx += ((dx / dist) * currentSpeed - enemy.vx) * dt * 5;
          enemy.vy += ((dy / dist) * currentSpeed - enemy.vy) * dt * 5;
        } else if (dist <= enemy.attackRange && enemy.attackTimer <= 0 && !enemy.isTelegraphing) {
          // Quick close-range strike: short, readable wind-up so the player can dodge.
          enemy.isTelegraphing = true;
          enemy.windupTimer = 0.28;
          this.telegraphs.push({ id: `wanderer_hit_${enemy.id}`, x: enemy.x, y: enemy.y, type: 'circle', radius: 48, progress: 0, color: 'rgba(235, 235, 235, 0.65)' });
        }
        if (enemy.isTelegraphing) {
          enemy.windupTimer -= dt;
          const tg = this.telegraphs.find((t) => t.id === `wanderer_hit_${enemy.id}`);
          if (tg) tg.progress = 1 - enemy.windupTimer / 0.28;
          if (enemy.windupTimer <= 0) {
            enemy.isTelegraphing = false;
            enemy.attackTimer = enemy.attackCooldown;
            this.telegraphs = this.telegraphs.filter((t) => t.id !== `wanderer_hit_${enemy.id}`);
            soundManager.playAttackSlash(0);
            if (Math.hypot(p.x - enemy.x, p.y - enemy.y) <= enemy.attackRange + p.radius && !p.isDodging && p.invulnerableTimer <= 0) this.damagePlayer(enemy.damage);
          }
        }
      } else if (enemy.type === 'phantom_archer') {
        const idealDist = 260;
        if (dist < 160) {
          enemy.vx += ((-dx / dist) * currentSpeed - enemy.vx) * dt * 4;
          enemy.vy += ((-dy / dist) * currentSpeed - enemy.vy) * dt * 4;
        } else if (dist > idealDist + 60) {
          enemy.vx += ((dx / dist) * currentSpeed - enemy.vx) * dt * 4;
          enemy.vy += ((dy / dist) * currentSpeed - enemy.vy) * dt * 4;
        }

        if (enemy.attackTimer <= 0 && !enemy.isTelegraphing) {
          enemy.isTelegraphing = true;
          enemy.windupTimer = 0.75;
          soundManager.playTelegraphWarn();
          this.telegraphs.push({
            id: `arch_tg_${enemy.id}`,
            x: enemy.x,
            y: enemy.y,
            type: 'line',
            angle: enemy.facing,
            length: 360,
            width: 24,
            progress: 0,
            color: 'rgba(240, 80, 80, 0.8)',
          });
        }

        if (enemy.isTelegraphing) {
          enemy.windupTimer -= dt;
          const tg = this.telegraphs.find((t) => t.id === `arch_tg_${enemy.id}`);
          if (tg) {
            tg.x = enemy.x;
            tg.y = enemy.y;
            tg.angle = enemy.facing;
            tg.progress = 1 - enemy.windupTimer / 0.75;
          }
          if (enemy.windupTimer <= 0) {
            enemy.isTelegraphing = false;
            enemy.attackTimer = enemy.attackCooldown;
            this.telegraphs = this.telegraphs.filter((t) => t.id !== `arch_tg_${enemy.id}`);
            const boltSpeed = 340;
            this.projectiles.push({
              id: `bolt_${Date.now()}`,
              x: enemy.x,
              y: enemy.y,
              vx: Math.cos(enemy.facing) * boltSpeed,
              vy: Math.sin(enemy.facing) * boltSpeed,
              radius: 10,
              damage: enemy.damage,
              isPlayer: false,
              rangeRemaining: 400,
              color: '#ff6666',
              type: 'needle',
            });
          }
        }
      } else if (enemy.type === 'sentinel_golem') {
        if (dist > enemy.attackRange && !enemy.isTelegraphing) {
          enemy.vx += ((dx / dist) * currentSpeed - enemy.vx) * dt * 4;
          enemy.vy += ((dy / dist) * currentSpeed - enemy.vy) * dt * 4;
        }
        if (dist <= enemy.attackRange && enemy.attackTimer <= 0 && !enemy.isTelegraphing) {
          enemy.isTelegraphing = true;
          enemy.windupTimer = 1.0;
          soundManager.playTelegraphWarn();
          this.telegraphs.push({
            id: `golem_slam_${enemy.id}`,
            x: enemy.x,
            y: enemy.y,
            type: 'circle',
            radius: 95,
            progress: 0,
            color: 'rgba(255, 90, 90, 0.85)',
          });
        }
        if (enemy.isTelegraphing) {
          enemy.windupTimer -= dt;
          const tg = this.telegraphs.find((t) => t.id === `golem_slam_${enemy.id}`);
          if (tg) tg.progress = 1 - enemy.windupTimer / 1.0;
          if (enemy.windupTimer <= 0) {
            enemy.isTelegraphing = false;
            enemy.attackTimer = enemy.attackCooldown;
            this.telegraphs = this.telegraphs.filter((t) => t.id !== `golem_slam_${enemy.id}`);
            this.onShake(12);
            soundManager.playHit(true);
            if (Math.hypot(p.x - enemy.x, p.y - enemy.y) <= 95 + p.radius) {
              if (!p.isDodging && p.invulnerableTimer <= 0) {
                this.damagePlayer(enemy.damage);
              }
            }
          }
        }
      } else if (enemy.type === 'boss_maestro') {
        if (enemy.hp <= enemy.maxHp * 0.5 && enemy.phase === 1) {
          enemy.phase = 2;
          this.onShake(15);
          soundManager.playTelegraphWarn();
        }
        if (dist > 180) {
          enemy.vx += ((dx / dist) * currentSpeed - enemy.vx) * dt * 3;
          enemy.vy += ((dy / dist) * currentSpeed - enemy.vy) * dt * 3;
        }
        if (enemy.attackTimer <= 0 && !enemy.isTelegraphing) {
          enemy.attackTimer = enemy.phase === 2 ? 1.4 : 2.0;
          const fanCount = enemy.phase === 2 ? 5 : 3;
          for (let i = 0; i < fanCount; i++) {
            const spread = (i - (fanCount - 1) / 2) * 0.28;
            const ang = enemy.facing + spread;
            this.projectiles.push({
              id: `boss_f_${Date.now()}_${i}`,
              x: enemy.x,
              y: enemy.y,
              vx: Math.cos(ang) * 280,
              vy: Math.sin(ang) * 280,
              radius: 10,
              damage: 18,
              isPlayer: false,
              rangeRemaining: 480,
              color: enemy.phase === 2 ? '#ff5555' : '#ffffff',
              type: 'needle',
            });
          }
        }
      }
      }

      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;
      enemy.vx *= Math.pow(0.1, dt);
      enemy.vy *= Math.pow(0.1, dt);

      // Enemy separation
      this.enemies.forEach((other) => {
        if (other === enemy || other.isDead) return;
        const dOther = Math.hypot(enemy.x - other.x, enemy.y - other.y);
        const minDist = enemy.radius + other.radius;
        if (dOther < minDist && dOther > 0.001) {
          const overlap = (minDist - dOther) * 0.5;
          enemy.x += ((enemy.x - other.x) / dOther) * overlap;
          enemy.y += ((enemy.y - other.y) / dOther) * overlap;
        }
      });

      // Pillar collision
      if (this.currentRoom.pillars) {
        for (const pil of this.currentRoom.pillars) {
          const dxP = enemy.x - pil.x;
          const dyP = enemy.y - pil.y;
          const dP = Math.hypot(dxP, dyP);
          const minP = enemy.radius + pil.radius;
          if (dP < minP && dP > 0.001) {
            enemy.x = pil.x + (dxP / dP) * minP;
            enemy.y = pil.y + (dyP / dP) * minP;
          }
        }
      }

      // Room bounds
      const halfW = this.currentRoom.width / 2 - enemy.radius - 8;
      const halfH = this.currentRoom.height / 2 - enemy.radius - 8;
      enemy.x = Math.max(-halfW, Math.min(halfW, enemy.x));
      enemy.y = Math.max(-halfH, Math.min(halfH, enemy.y));
    });
  }

  // --- Projectiles & Slashes Update ---
  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];

      if (proj.homing && proj.isPlayer) {
        let closest: Enemy | null = null;
        let minDist = 320;
        this.enemies.forEach((e) => {
          if (e.isDead) return;
          const d = Math.hypot(e.x - proj.x, e.y - proj.y);
          if (d < minDist) {
            minDist = d;
            closest = e;
          }
        });
        if (closest) {
          const spd = Math.hypot(proj.vx, proj.vy);
          const targetAngle = Math.atan2((closest as Enemy).y - proj.y, (closest as Enemy).x - proj.x);
          const curAngle = Math.atan2(proj.vy, proj.vx);
          let diff = targetAngle - curAngle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const newAng = curAngle + diff * Math.min(1, dt * 8);
          proj.vx = Math.cos(newAng) * spd;
          proj.vy = Math.sin(newAng) * spd;
        }
      }

      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      proj.rangeRemaining -= Math.hypot(proj.vx * dt, proj.vy * dt);

      let hit = false;
      if (proj.isPlayer) {
        for (const enemy of this.enemies) {
          if (enemy.isDead) continue;
          if (Math.hypot(enemy.x - proj.x, enemy.y - proj.y) <= enemy.radius + proj.radius) {
            this.damageEnemy(enemy, proj.damage, false);
            hit = true;
            if (!proj.penetrating) break;
          }
        }
      } else {
        if (Math.hypot(this.player.x - proj.x, this.player.y - proj.y) <= this.player.radius + proj.radius) {
          if (!this.player.isDodging && this.player.invulnerableTimer <= 0) {
            this.damagePlayer(proj.damage);
            hit = true;
          }
        }
      }

      // Pillar blocking
      if (!hit && this.currentRoom.pillars) {
        for (const pil of this.currentRoom.pillars) {
          if (Math.hypot(proj.x - pil.x, proj.y - pil.y) <= proj.radius + pil.radius) {
            hit = true;
            break;
          }
        }
      }

      if ((hit && !proj.penetrating) || proj.rangeRemaining <= 0) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  private updateSlashes(dt: number) {
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      this.slashes[i].timer -= dt;
      if (this.slashes[i].timer <= 0) {
        this.slashes.splice(i, 1);
      }
    }
  }

  private updateTelegraphs(dt: number) {
    this.telegraphs.forEach((tg) => {
      tg.progress = Math.min(1, tg.progress + dt * 1.2);
    });
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.alpha -= dt * p.decay;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    this.ambientParticles.forEach((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < -600) p.x = 600;
      if (p.x > 600) p.x = -600;
      if (p.y < -500) p.y = 500;
      if (p.y > 500) p.y = -500;
    });
  }

  private updateDamageNumbers(dt: number) {
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const dn = this.damageNumbers[i];
      dn.z += dn.vy * dt;
      dn.timer -= dt;
      if (dn.timer <= 0) {
        this.damageNumbers.splice(i, 1);
      }
    }
  }

  // --- Combat Damage Processing ---
  public damageEnemy(enemy: Enemy, rawAmount: number, isCrit: boolean = false) {
    if (enemy.isDead) return;

    let amount = Math.round(rawAmount);
    if (this.player.stats.slowOnHit && enemy.slowTimer && enemy.slowTimer > 0) {
      amount = Math.round(amount * 1.3);
    }

    enemy.hp -= amount;
    enemy.hurtFlashTimer = 0.12;
    this.totalDamageDealt += amount;

    soundManager.playHit(isCrit);
    // Ordinary attacks do not shake the screen per requirement
    if (isCrit) this.hitStopTimer = 0.04;

    this.damageNumbers.push({
      id: `dn_${Date.now()}_${Math.random()}`,
      x: enemy.x + (Math.random() - 0.5) * 16,
      y: enemy.y,
      z: 32,
      text: `${amount}${isCrit ? '!' : ''}`,
      color: isCrit ? '#ffe082' : '#ffffff',
      isCrit,
      timer: 0.75,
      vy: 45,
    });

    if (this.player.stats.bleedOnHit) enemy.bleedTimer = 2.5;
    if (this.player.stats.slowOnHit) enemy.slowTimer = 2.0;

    if (enemy.hp <= 0) {
      this.killEnemy(enemy);
    }
  }

  private killEnemy(enemy: Enemy) {
    enemy.isDead = true;
    this.totalEnemiesDefeated++;
    this.currentRoom.enemiesRemaining = this.enemies.filter((e) => !e.isDead).length;


    if (enemy.type === 'boss_maestro') {
      this.currentRoom.phase = 'boss_completed';
      this.currentRoom.doors = [];
      this.currentRoom.pickups = [];
      this.pendingRewards = null;
      this.rewardObjectActivated = false;
      this.pendingBranchConfirmation = null;
      this.roomLocked = false;
      this.isVictory = true;
    }
  }

  public damagePlayer(rawAmount: number) {
    const p = this.player;
    if (p.isDodging || p.invulnerableTimer > 0) return;

    // Passive Dodge Rate Check (閃避機率規避傷害)
    if (Math.random() < (p.stats.dodgeRate || 0)) {
      this.damageNumbers.push({
        id: `dodge_${Date.now()}`,
        x: p.x,
        y: p.y,
        z: 32,
        text: 'MISS',
        color: '#80d8ff',
        isCrit: false,
        timer: 0.75,
        vy: 42,
      });
      return;
    }

    // Defense calculation (防禦力減傷)
    const def = Math.max(0, p.stats.defense || 0);
    const defMultiplier = 100 / (100 + def);
    let dmg = Math.max(1, Math.round(rawAmount * defMultiplier));

    if (p.stats.barrier > 0) {
      if (p.stats.barrier >= dmg) {
        p.stats.barrier -= dmg;
        dmg = 0;
      } else {
        dmg -= p.stats.barrier;
        p.stats.barrier = 0;
      }
    }

    p.stats.hp -= dmg;
    p.lastHurtTimer = 0.22;
    p.invulnerableTimer = 0.45;

    soundManager.playHit(true);
    if (dmg > 10) {
      this.onShake(3);
    }

    if (dmg > 0) {
      this.damageNumbers.push({
        id: `dn_p_${Date.now()}`,
        x: p.x,
        y: p.y,
        z: 32,
        text: `-${dmg}`,
        color: '#ff4444',
        isCrit: true,
        timer: 0.8,
        vy: 40,
      });
    }

    if (p.stats.hp <= 0) {
      p.stats.hp = 0;
      p.isDead = true;
      this.isGameOver = true;
      this.onShake(5);
    }
  }

  // --- Room Completion & In-World Rewards/Doorways Flow ---
  private checkRoomState() {
    if (this.currentRoom.phase !== 'combat') return;
    if (this.enemies.length === 0) return; // Cannot clear if no enemies were spawned yet!

    const aliveEnemies = this.enemies.filter((e) => !e.isDead);
    if (aliveEnemies.length === 0) {
      if (this.currentWave < this.totalWaves) {
        this.currentWave += 1;
        this.currentRoom.waveIndex = this.currentWave;
        this.currentRoom.phase = 'spawning';
        this.enemies = [];
        this.spawnEnemySquad(this.currentRoom.type === 'elite' || this.currentRoom.type === 'fountain');
        this.currentRoom.totalEnemies = this.enemies.length;
        this.currentRoom.enemiesRemaining = this.enemies.length;
        this.currentRoom.phase = 'combat';
        return;
      }
      this.currentRoom.phase = 'cleared';
      this.currentRoom.isCleared = true;
      this.roomLocked = false;
      soundManager.playRoomCleared();

      // Treasure room: chest appears only after every guard is defeated.
      if (this.currentRoom.type === 'chest') {
        this.currentRoom.chest = { x: 0, y: -40, radius: 28, opened: false };
        this.currentRoom.phase = 'reward_pending';
      } else {
        // Other combat rooms reveal their physical reward object after clearing.
        this.spawnWorldRewards();
      }
    }
  }

  public spawnWorldRewards() {
    if (this.currentRoom.type === 'boss' || this.currentRoom.phase === 'boss_completed') return;
    const skillIds = this.player.skills.acquiredSkills;
    const passiveIds = this.acquiredPassives.map((p) => p.id);
    const equipmentIds = this.acquiredEquipment.map((p) => p.id.split('__copy_')[0]);
    const rewards = RewardSystem.generateRewards(this.currentRoom.type, skillIds, [...passiveIds, ...equipmentIds]);
    if (!rewards.length) return;

    // One physical altar/pedestal represents the reward choices. The choices only
    // appear after the player approaches and presses F.
    this.pendingRewards = rewards;
    this.rewardObjectActivated = false;
    this.currentRoom.pickups = [{
      id: `reward_altar_${this.currentDepth}_${Date.now()}`,
      x: 0,
      y: -20,
      radius: 42,
      reward: rewards[0],
      claimed: false,
    }];
    this.currentRoom.phase = 'reward_pending';
  }

  public pickupWorldReward(_pickupId: string) {
    if (this.currentRoom.phase !== 'reward_pending' || !this.pendingRewards) return;
    this.rewardObjectActivated = true;
  }

  public completeWorldRewardPickup(_pickupId: string) {
    const altar = this.currentRoom.pickups?.[0];
    if (altar) {
      for (let i = 0; i < 24; i++) {
        const ang = Math.random() * Math.PI * 2;
        this.particles.push({
          x: altar.x, y: altar.y, z: 25,
          vx: Math.cos(ang) * (70 + Math.random() * 90),
          vy: Math.sin(ang) * (70 + Math.random() * 90),
          vz: 25 + Math.random() * 50,
          alpha: 1, decay: 2, size: 2.5,
          color: '#e4e4e4', shape: 'spark',
        });
      }
    }
    this.currentRoom.pickups = [];
    this.pendingRewards = null;
    this.rewardObjectActivated = false;
    this.spawnWorldDoors();
  }

  public replaceEquippedSkill(slot: 'q' | 'e' | 'r') {
    if (!this.pendingSkillReplace) return;
    const { newSkill, pickupId } = this.pendingSkillReplace;
    const oldSkillId = this.player.skills.equipped[slot];

    // The replaced skill is permanently removed from the run's collection.
    if (oldSkillId) {
      this.player.skills.acquiredSkills = this.player.skills.acquiredSkills.filter((id) => id !== oldSkillId);
    }
    if (!this.player.skills.acquiredSkills.includes(newSkill.id)) {
      this.player.skills.acquiredSkills.push(newSkill.id);
    }
    this.equipSkillToSlot(newSkill.id, slot);
    this.pendingSkillReplace = null;
    this.completeWorldRewardPickup(pickupId);
  }

  public cancelSkillReplace() {
    if (!this.pendingSkillReplace) return;
    this.pendingSkillReplace = null;
    // Return to the reward choices. The old loadout and reward altar remain intact.
    this.rewardObjectActivated = true;
  }

  public skipSkillReplace() {
    this.cancelSkillReplace();
  }

  public spawnWorldDoors() {
    if (this.currentRoom.type === 'boss' || this.currentRoom.phase === 'boss_completed' || this.isVictory) {
      this.currentRoom.doors = [];
      return;
    }
    soundManager.playRoomCleared();
    const branches = RoomSystem.generateBranches(this.currentDepth);
    const doors: WorldDoor[] = [];
    const doorY = -this.currentRoom.height / 2 + 42;

    if (branches.length === 3) {
      const xs = [-220, 0, 220];
      branches.forEach((b, idx) => {
        doors.push({
          id: `door_${b.id}`,
          x: xs[idx],
          y: doorY,
          radius: 44,
          branch: b,
          active: true,
        });
      });
    } else if (branches.length === 2) {
      const xs = [-150, 150];
      branches.forEach((b, idx) => {
        doors.push({
          id: `door_${b.id}`,
          x: xs[idx],
          y: doorY,
          radius: 44,
          branch: b,
          active: true,
        });
      });
    } else if (branches.length === 1) {
      doors.push({
        id: `door_${branches[0].id}`,
        x: 0,
        y: doorY,
        radius: 44,
        branch: branches[0],
        active: true,
      });
    }

    this.currentRoom.doors = doors;
    this.currentRoom.phase = 'doors_open';

    // Particle flash on door arrival
    doors.forEach((door) => {
      for (let i = 0; i < 22; i++) {
        const ang = Math.random() * Math.PI * 2;
        this.particles.push({
          x: door.x + (Math.random() - 0.5) * 45,
          y: door.y + (Math.random() - 0.5) * 20,
          z: Math.random() * 60,
          vx: Math.cos(ang) * 45,
          vy: Math.sin(ang) * 45,
          vz: 25 + Math.random() * 40,
          alpha: 1,
          decay: 1.6,
          size: 2.2,
          color: '#e4e8ff',
          shape: 'circle',
        });
      }
    });
  }

  public updateWorldInteractions(_dt: number) {
    if (this.pendingSkillReplace || this.pendingBranchConfirmation || this.isVictory) return;
    const p = this.player;
    const pressed = this.interactPressed;
    this.interactPressed = false;

    // All world interactions require an explicit F press while in range.
    if (!pressed) return;

    // Treasure chest: opening it reveals the single reward altar.
    if (this.currentRoom.chest && !this.currentRoom.chest.opened) {
      const chest = this.currentRoom.chest;
      if (Math.hypot(p.x - chest.x, p.y - chest.y) <= 64) {
        chest.opened = true;
        soundManager.playSelectCard();
        this.spawnWorldRewards();
        return;
      }
    }

    // Reward altar: F opens the reward-choice window, not the reward itself.
    const altar = this.currentRoom.pickups?.[0];
    if (altar && !altar.claimed && this.currentRoom.phase === 'reward_pending') {
      if (Math.hypot(p.x - altar.x, p.y - altar.y) <= 72) {
        this.rewardObjectActivated = true;
        return;
      }
    }

    // Door: first F selects a nearby door and opens a confirmation dialog.
    if (this.currentRoom.phase === 'doors_open' && this.currentRoom.type !== 'boss') {
      const nearbyDoor = (this.currentRoom.doors || [])
        .filter((door) => door.active && Math.hypot(p.x - door.x, p.y - door.y) <= 82)
        .sort((a, b) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(p.x - b.x, p.y - b.y))[0];
      if (nearbyDoor) {
        this.pendingBranchConfirmation = nearbyDoor.branch;
        this.currentRoom.phase = 'branch_confirmation';
      }
    }
  }

  public cancelBranchConfirmation() {
    if (!this.pendingBranchConfirmation) return;
    this.pendingBranchConfirmation = null;
    this.currentRoom.phase = 'doors_open';
  }

  public confirmBranchSelection() {
    if (!this.pendingBranchConfirmation || this.currentRoom.type === 'boss' || this.isVictory) return;
    const branch = this.pendingBranchConfirmation;
    this.pendingBranchConfirmation = null;
    this.currentRoom.phase = 'exiting';
    this.selectRoomBranch(branch);
  }

  /**
   * Optional programmatic reward select (e.g. from cheat/test or UI)
   */
  public selectReward(reward: RewardItem) {
    if (!this.pendingRewards || !this.rewardObjectActivated) return;
    soundManager.playSelectCard();

    if (reward.category === 'stat') {
      reward.apply(this.player.stats);
      this.completeWorldRewardPickup(this.currentRoom.pickups?.[0]?.id || 'reward');
    } else if (reward.category === 'passive') {
      if (!this.acquiredPassives.some((p) => p.id === reward.passive.id)) {
        this.acquiredPassives.push(reward.passive);
        reward.passive.apply(this.player.stats);
      }
      this.completeWorldRewardPickup(this.currentRoom.pickups?.[0]?.id || 'reward');
    } else if (reward.category === 'equipment') {
      if (!this.acquiredEquipment.some((item) => item.id === reward.equipment.id)) {
        this.acquiredEquipment.push(reward.equipment);
        if (this.equippedEquipmentIds.length < 3) {
          this.equippedEquipmentIds.push(reward.equipment.id);
          reward.equipment.apply(this.player.stats);
        }
      }
      this.completeWorldRewardPickup(this.currentRoom.pickups?.[0]?.id || 'reward');
    } else if (reward.category === 'skill') {
      const skill = reward.skill;
      const equipped = this.player.skills.equipped;
      const emptySlot = (['q', 'e', 'r'] as const).find((slot) => equipped[slot] === null);
      if (emptySlot) {
        if (!this.player.skills.acquiredSkills.includes(skill.id)) this.player.skills.acquiredSkills.push(skill.id);
        this.equipSkillToSlot(skill.id, emptySlot);
        this.completeWorldRewardPickup(this.currentRoom.pickups?.[0]?.id || 'reward');
      } else {
        this.rewardObjectActivated = false;
        this.pendingSkillReplace = { newSkill: skill, pickupId: this.currentRoom.pickups?.[0]?.id || 'reward' };
      }
    }
  }

  // Equipment picked from treasure chests is stored in the left-side gear panel.
  // Up to three items can be active at once; clicking an item toggles its effect.
  public toggleEquipment(equipmentId: string) {
    const item = this.acquiredEquipment.find((entry) => entry.id === equipmentId);
    if (!item) return;
    if (this.equippedEquipmentIds.includes(equipmentId)) {
      this.equippedEquipmentIds = this.equippedEquipmentIds.filter((id) => id !== equipmentId);
      this.removeEquipmentEffect(equipmentId);
      return;
    }
    if (this.equippedEquipmentIds.length >= 3) return;
    this.equippedEquipmentIds.push(equipmentId);
    item.apply(this.player.stats);
  }

  private removeEquipmentEffect(equipmentId: string) {
    const stats = this.player.stats;
    const baseId = equipmentId.split('__copy_')[0];
    if (baseId === 'armor_break') {
      const anotherCopyEquipped = this.equippedEquipmentIds.some((id) => id.split('__copy_')[0] === baseId);
      if (!anotherCopyEquipped) {
        stats.slowOnHit = false;
        stats.bleedOnHit = false;
      }
    } else if (baseId === 'relic_sacred_aegis') {
      stats.barrier = Math.max(0, stats.barrier - 70);
      stats.defense = Math.max(0, stats.defense - 15);
      stats.dodgeRate = Math.max(0, stats.dodgeRate - 0.08);
    } else if (baseId === 'relic_resonance_core') {
      stats.maxResonance = Math.max(1, stats.maxResonance - 40);
      stats.resonance = Math.min(stats.resonance, stats.maxResonance);
      stats.skillDamageMult = stats.skillDamageMult / 1.4;
    }
  }

  // --- Skill Loadout Configuration ---
  public equipSkillToSlot(skillId: string, slot: 'q' | 'e' | 'r') {
    equipSkill(this.player.skills, skillId, slot);
    soundManager.playSelectCard();
  }

  public unequipSkillFromSlot(slot: 'q' | 'e' | 'r') {
    unequipSkill(this.player.skills, slot);
    soundManager.playSelectCard();
  }

  public restartGame() {
    this.player = this.createDefaultPlayer();
    this.acquiredPassives = [];
    this.acquiredEquipment = [];
    this.equippedEquipmentIds = [];
    this.currentDepth = 1;
    this.totalEnemiesDefeated = 0;
    this.totalDamageDealt = 0;
    this.runTimeSeconds = 0;
    this.isGameOver = false;
    this.isVictory = false;
    this.pendingRewards = null;
    this.pendingSkillReplace = null;
    this.pendingBranchConfirmation = null;
    this.rewardObjectActivated = false;
    this.interactPressed = false;

    const initialBranch: RoomBranchOption = {
      id: 'init_room_1',
      type: 'upgrade',
      name: 'Altar of Cadence',
      nameZh: '基礎強化房 (終止式祭壇)',
      dangerLevel: 2,
      description: '銘刻著力量聖印的古老石壇，純粹淬鍊角色的核心體魄。',
      rewardTypeDesc: '【專屬獎勵】基礎能力精修 (攻擊/暴擊/移速)',
      icon: 'Star',
    };
    this.enterRoom(initialBranch);
  }
}
