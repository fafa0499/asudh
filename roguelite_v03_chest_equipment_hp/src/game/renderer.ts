import {
  DamageNumber,
  Enemy,
  Particle,
  Pillar,
  Player,
  Projectile,
  RoomInfo,
  ShakeLevel,
  SHAKE_MULTIPLIERS,
  SlashAttack,
  TelegraphArea,
  Vector2,
  WorldChest,
  WorldDoor,
  WorldFountain,
  WorldRewardPickup,
} from '../types/game';

// 2.5D Oblique Perspective Foreshortening Factor
// Looking down at ~45-50 degrees: horizontal scale is 1.0, vertical ground depth is foreshortened to 0.65.
export const TILT_Y = 0.65;

/**
 * Projects a ground coordinate (x, y, z) into screen space relative to camera
 */
export function worldToScreen(
  wx: number,
  wy: number,
  wz: number,
  camX: number,
  camY: number,
  canvasWidth: number,
  canvasHeight: number
): Vector2 {
  const dx = wx - camX;
  const dy = wy - camY;

  const sx = dx + canvasWidth / 2;
  const sy = dy * TILT_Y - wz + canvasHeight / 2;

  return { x: sx, y: sy };
}

/**
 * Inverse projects screen coordinate to ground plane (z = 0)
 */
export function screenToWorld(
  sx: number,
  sy: number,
  camX: number,
  camY: number,
  canvasWidth: number,
  canvasHeight: number
): Vector2 {
  const relX = sx - canvasWidth / 2;
  const relY = sy - canvasHeight / 2;

  const wx = camX + relX;
  const wy = camY + relY / TILT_Y;

  return { x: wx, y: wy };
}

export class GameRenderer {
  public shakeX: number = 0;
  public shakeY: number = 0;
  public shakeIntensity: number = 0;
  public shakeLevel: ShakeLevel = 'low'; // Centralized shake setting: 'off' | 'low' | 'medium' | 'high'

  public triggerShake(amount: number = 4) {
    const mult = SHAKE_MULTIPLIERS[this.shakeLevel];
    if (mult <= 0) {
      this.shakeIntensity = 0;
      this.shakeX = 0;
      this.shakeY = 0;
      return;
    }
    // Prevent endless shake stacking: cap at 8 and take maximum of current and incoming
    const scaled = amount * mult;
    this.shakeIntensity = Math.min(8, Math.max(this.shakeIntensity, scaled));
  }

  public updateShake(dt: number) {
    if (this.shakeIntensity > 0.05) {
      this.shakeX = (Math.random() - 0.5) * this.shakeIntensity * 1.5;
      this.shakeY = (Math.random() - 0.5) * this.shakeIntensity * 1.5;
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 26);
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
      this.shakeIntensity = 0;
    }
  }

  public render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    camX: number,
    camY: number,
    room: RoomInfo,
    player: Player,
    enemies: Enemy[],
    projectiles: Projectile[],
    slashes: SlashAttack[],
    telegraphs: TelegraphArea[],
    particles: Particle[],
    damageNumbers: DamageNumber[],
    roomLocked: boolean,
    ambientParticles: Particle[]
  ) {
    const roomWidth = room.width;
    const roomHeight = room.height;

    // Clear viewport with deep melancholic dark void
    ctx.save();
    ctx.fillStyle = '#09090c';
    ctx.fillRect(0, 0, width, height);

    // Apply Screen Shake
    ctx.translate(this.shakeX, this.shakeY);

    // 1. Draw Continuous Gothic Stone Ground (No diamond tiles!)
    this.renderContinuousFloor(ctx, width, height, camX, camY, roomWidth, roomHeight);

    // 2. Draw Gothic North Wall & Architectural Depth
    this.renderNorthWall(ctx, width, height, camX, camY, roomWidth, roomHeight);

    // 3. Draw Floor Telegraphs (under characters and pillars)
    this.renderTelegraphs(ctx, width, height, camX, camY, telegraphs);

    // 4. Draw Slashes & Ground Effects
    this.renderSlashes(ctx, width, height, camX, camY, slashes);

    // 5. Draw Depth-Sorted Entities: Pillars, Doors, Pickups, Chest, Fountain, Player, Enemies, Projectiles
    this.renderDepthSortedEntities(
      ctx,
      width,
      height,
      camX,
      camY,
      room,
      player,
      enemies,
      projectiles
    );

    // 6. Draw Room Perimeter Barrier (Vertical harp/piano strings if locked)
    if (roomLocked) {
      this.renderBarrierStrings(ctx, width, height, camX, camY, roomWidth, roomHeight);
    }

    // 7. Draw Combat Particles & Floating Dust
    this.renderParticles(ctx, width, height, camX, camY, particles);
    this.renderAmbientAtmosphere(ctx, width, height, camX, camY, ambientParticles);

    // 8. Draw Damage Numbers
    this.renderDamageNumbers(ctx, width, height, camX, camY, damageNumbers);

    // 9. Vignette & Cinematic Shadow Overlay
    this.renderCinematicVignette(ctx, width, height, roomLocked);

    ctx.restore();
  }

  /**
   * Continuous, natural stone pavement floor with large slate flagstones,
   * subtle worn mortar joints, and embedded monochrome piano key runic frieze.
   */
  private renderContinuousFloor(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    camX: number,
    camY: number,
    roomW: number,
    roomH: number
  ) {
    const halfW = roomW / 2;
    const halfH = roomH / 2;

    const topLeft = worldToScreen(-halfW, -halfH, 0, camX, camY, w, h);
    const topRight = worldToScreen(halfW, -halfH, 0, camX, camY, w, h);
    const botRight = worldToScreen(halfW, halfH, 0, camX, camY, w, h);
    const botLeft = worldToScreen(-halfW, halfH, 0, camX, camY, w, h);

    // 1. Base Ground Slab
    ctx.beginPath();
    ctx.moveTo(topLeft.x, topLeft.y);
    ctx.lineTo(topRight.x, topRight.y);
    ctx.lineTo(botRight.x, botRight.y);
    ctx.lineTo(botLeft.x, botLeft.y);
    ctx.closePath();

    // Subtle radial floor gradient (brightest near center sanctum)
    const centerScreen = worldToScreen(0, 0, 0, camX, camY, w, h);
    const floorGrad = ctx.createRadialGradient(
      centerScreen.x,
      centerScreen.y,
      60,
      centerScreen.x,
      centerScreen.y,
      Math.max(w, h) * 0.7
    );
    floorGrad.addColorStop(0, '#1c1c25');
    floorGrad.addColorStop(0.5, '#14141c');
    floorGrad.addColorStop(1, '#0e0e14');

    ctx.fillStyle = floorGrad;
    ctx.fill();

    // 2. Large Continuous Rectangular Slate Slabs (Natural stone joints)
    const slabW = 100;
    const slabH = 80;
    ctx.strokeStyle = '#22222f';
    ctx.lineWidth = 1;

    for (let x = -halfW; x < halfW; x += slabW) {
      for (let y = -halfH; y < halfH; y += slabH) {
        const p1 = worldToScreen(x, y, 0, camX, camY, w, h);
        const p2 = worldToScreen(x + slabW, y, 0, camX, camY, w, h);
        const p3 = worldToScreen(x + slabW, y + slabH, 0, camX, camY, w, h);
        const p4 = worldToScreen(x, y + slabH, 0, camX, camY, w, h);

        // Cull offscreen slabs
        if (p2.x < -20 || p1.x > w + 20 || p3.y < -20 || p1.y > h + 20) continue;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();
        ctx.stroke();

        // Subtle slate stone texture variations
        const noise = Math.sin(x * 12.9898 + y * 78.233);
        if (noise > 0.6) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
          ctx.fill();
        } else if (noise < -0.6) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
          ctx.fill();
        }
      }
    }

    // 3. Deemo Embedded Piano Keys Frieze (Flush with stone in central nave)
    const keyWidth = 18;
    const friezeY = 0; // along center axis
    const friezeLen = Math.min(halfW * 1.6, 600);
    const numKeys = Math.floor(friezeLen / keyWidth);

    ctx.save();
    for (let i = -numKeys / 2; i < numKeys / 2; i++) {
      const kx = i * keyWidth;
      const ky = friezeY;
      const isBlackKey = Math.abs(i) % 7 === 1 || Math.abs(i) % 7 === 2 || Math.abs(i) % 7 === 4 || Math.abs(i) % 7 === 5 || Math.abs(i) % 7 === 6;

      const pA = worldToScreen(kx, ky - 30, 0, camX, camY, w, h);
      const pB = worldToScreen(kx + keyWidth - 2, ky - 30, 0, camX, camY, w, h);
      const pC = worldToScreen(kx + keyWidth - 2, ky + 30, 0, camX, camY, w, h);
      const pD = worldToScreen(kx, ky + 30, 0, camX, camY, w, h);

      ctx.beginPath();
      ctx.moveTo(pA.x, pA.y);
      ctx.lineTo(pB.x, pB.y);
      ctx.lineTo(pC.x, pC.y);
      ctx.lineTo(pD.x, pD.y);
      ctx.closePath();

      if (isBlackKey) {
        ctx.fillStyle = 'rgba(10, 10, 16, 0.6)';
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(210, 210, 230, 0.06)';
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(50, 50, 70, 0.3)';
      ctx.stroke();
    }
    ctx.restore();

    // 4. Center Runic Seal (Subtle etched circle)
    ctx.save();
    ctx.translate(centerScreen.x, centerScreen.y);
    ctx.scale(1, TILT_Y);
    ctx.beginPath();
    ctx.arc(0, 0, 140, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 210, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.setLineDash([8, 12]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // 5. Natural Stone Edge Trim (Weathered curb transitioning to dark abyss)
    ctx.beginPath();
    ctx.moveTo(topLeft.x, topLeft.y);
    ctx.lineTo(topRight.x, topRight.y);
    ctx.lineTo(botRight.x, botRight.y);
    ctx.lineTo(botLeft.x, botLeft.y);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(40, 40, 55, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  /**
   * Gothic North Wall with 3D vertical elevation, stone block texture,
   * arched alcoves, and a soft shadow cast down onto the floor.
   */
  private renderNorthWall(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    camX: number,
    camY: number,
    roomW: number,
    roomH: number
  ) {
    const halfW = roomW / 2;
    const halfH = roomH / 2;
    const wallHeight = 110;

    const baseLeft = worldToScreen(-halfW, -halfH, 0, camX, camY, w, h);
    const baseRight = worldToScreen(halfW, -halfH, 0, camX, camY, w, h);
    const topLeft = worldToScreen(-halfW, -halfH, wallHeight, camX, camY, w, h);
    const topRight = worldToScreen(halfW, -halfH, wallHeight, camX, camY, w, h);

    // 1. Wall Surface Gradient
    const wallGrad = ctx.createLinearGradient(0, topLeft.y, 0, baseLeft.y);
    wallGrad.addColorStop(0, '#101016');
    wallGrad.addColorStop(0.5, '#181822');
    wallGrad.addColorStop(1, '#0e0e14');

    ctx.beginPath();
    ctx.moveTo(topLeft.x, topLeft.y);
    ctx.lineTo(topRight.x, topRight.y);
    ctx.lineTo(baseRight.x, baseRight.y);
    ctx.lineTo(baseLeft.x, baseLeft.y);
    ctx.closePath();
    ctx.fillStyle = wallGrad;
    ctx.fill();

    // Wall stone relief lines
    ctx.strokeStyle = 'rgba(60, 60, 80, 0.25)';
    ctx.lineWidth = 1;
    const stepX = 140;
    for (let x = -halfW; x <= halfW; x += stepX) {
      const bP = worldToScreen(x, -halfH, 0, camX, camY, w, h);
      const tP = worldToScreen(x, -halfH, wallHeight, camX, camY, w, h);
      ctx.beginPath();
      ctx.moveTo(bP.x, bP.y);
      ctx.lineTo(tP.x, tP.y);
      ctx.stroke();

      // Arched alcove motif on wall
      if (x + stepX <= halfW) {
        const midX = x + stepX / 2;
        const archTop = worldToScreen(midX, -halfH, wallHeight * 0.75, camX, camY, w, h);
        const archLeft = worldToScreen(x + 20, -halfH, wallHeight * 0.2, camX, camY, w, h);
        const archRight = worldToScreen(x + stepX - 20, -halfH, wallHeight * 0.2, camX, camY, w, h);

        ctx.beginPath();
        ctx.moveTo(archLeft.x, archLeft.y);
        ctx.quadraticCurveTo(archTop.x, archTop.y, archRight.x, archRight.y);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.stroke();
      }
    }

    // Top coping trim
    ctx.beginPath();
    ctx.moveTo(topLeft.x, topLeft.y);
    ctx.lineTo(topRight.x, topRight.y);
    ctx.strokeStyle = '#2b2b3a';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 2. Soft Cast Shadow from North Wall onto Floor
    const shadowReach = 75;
    const sLeft = worldToScreen(-halfW, -halfH + shadowReach, 0, camX, camY, w, h);
    const sRight = worldToScreen(halfW, -halfH + shadowReach, 0, camX, camY, w, h);

    const shadowGrad = ctx.createLinearGradient(0, baseLeft.y, 0, sLeft.y);
    shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.beginPath();
    ctx.moveTo(baseLeft.x, baseLeft.y);
    ctx.lineTo(baseRight.x, baseRight.y);
    ctx.lineTo(sRight.x, sRight.y);
    ctx.lineTo(sLeft.x, sLeft.y);
    ctx.closePath();
    ctx.fillStyle = shadowGrad;
    ctx.fill();
  }

  /**
   * Renders 3D Upright Pillars with plinth base, column shaft, capital,
   * and soft cast shadow extending across the stone floor.
   */
  private renderPillar(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    camX: number,
    camY: number,
    pillar: Pillar
  ) {
    const pBase = worldToScreen(pillar.x, pillar.y, 0, camX, camY, w, h);
    const pTop = worldToScreen(pillar.x, pillar.y, pillar.height, camX, camY, w, h);
    const rad = pillar.radius;

    // 1. Diagonal Soft Cast Shadow on Ground
    ctx.save();
    ctx.translate(pBase.x, pBase.y);
    ctx.beginPath();
    // Shadow extends diagonally down-right
    ctx.moveTo(-rad, 0);
    ctx.lineTo(rad, 0);
    ctx.lineTo(rad + 45, pillar.height * 0.45);
    ctx.lineTo(-rad + 35, pillar.height * 0.45);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fill();
    ctx.restore();

    // 2. Plinth Base
    ctx.save();
    ctx.translate(pBase.x, pBase.y);
    ctx.beginPath();
    ctx.ellipse(0, 0, rad * 1.25, rad * 1.25 * TILT_Y, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1c1c27';
    ctx.fill();
    ctx.strokeStyle = '#323244';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // 3. Upright Pillar Shaft
    const shaftGrad = ctx.createLinearGradient(pBase.x - rad, 0, pBase.x + rad, 0);
    shaftGrad.addColorStop(0, '#1a1a24');
    shaftGrad.addColorStop(0.3, '#323242');
    shaftGrad.addColorStop(0.7, '#242430');
    shaftGrad.addColorStop(1, '#14141c');

    ctx.beginPath();
    ctx.moveTo(pBase.x - rad, pBase.y);
    ctx.lineTo(pTop.x - rad, pTop.y);
    ctx.lineTo(pTop.x + rad, pTop.y);
    ctx.lineTo(pBase.x + rad, pBase.y);
    ctx.closePath();
    ctx.fillStyle = shaftGrad;
    ctx.fill();

    // Fluting vertical grooves
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    [-0.5, 0, 0.5].forEach((offset) => {
      ctx.beginPath();
      ctx.moveTo(pBase.x + rad * offset, pBase.y);
      ctx.lineTo(pTop.x + rad * offset, pTop.y);
      ctx.stroke();
    });

    // 4. Carved Capital on Top
    ctx.save();
    ctx.translate(pTop.x, pTop.y);
    ctx.beginPath();
    ctx.ellipse(0, 0, rad * 1.3, rad * 1.3 * TILT_Y, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#3a3a4d';
    ctx.fill();
    ctx.strokeStyle = '#54546a';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Sort entities by ground Y depth (wy) for accurate 3D occlusion
   */
  private renderDepthSortedEntities(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    camX: number,
    camY: number,
    room: RoomInfo,
    player: Player,
    enemies: Enemy[],
    projectiles: Projectile[]
  ) {
    type Renderable =
      | { type: 'player'; obj: Player; depthY: number }
      | { type: 'enemy'; obj: Enemy; depthY: number }
      | { type: 'projectile'; obj: Projectile; depthY: number }
      | { type: 'pillar'; obj: Pillar; depthY: number }
      | { type: 'door'; obj: WorldDoor; depthY: number }
      | { type: 'pickup'; obj: WorldRewardPickup; depthY: number }
      | { type: 'chest'; obj: WorldChest; depthY: number }
      | { type: 'fountain'; obj: WorldFountain; depthY: number };

    const items: Renderable[] = [];

    // Add Player
    items.push({ type: 'player', obj: player, depthY: player.y });

    // Add Enemies
    enemies.forEach((en) => {
      if (!en.isDead) {
        items.push({ type: 'enemy', obj: en, depthY: en.y });
      }
    });

    // Add Pillars
    if (room.pillars) {
      room.pillars.forEach((pil) => {
        items.push({ type: 'pillar', obj: pil, depthY: pil.y });
      });
    }

    // Add In-World Doors (if open)
    if (room.doors && room.doors.length > 0) {
      room.doors.forEach((door) => {
        items.push({ type: 'door', obj: door, depthY: door.y });
      });
    }

    // Add In-World Reward Pickups (if any)
    if (room.pickups && room.pickups.length > 0) {
      room.pickups.forEach((pickup) => {
        if (!pickup.claimed) {
          items.push({ type: 'pickup', obj: pickup, depthY: pickup.y });
        }
      });
    }

    // Add In-World Chest
    if (room.chest) {
      items.push({ type: 'chest', obj: room.chest, depthY: room.chest.y });
    }

    // Add In-World Fountain
    if (room.fountain) {
      items.push({ type: 'fountain', obj: room.fountain, depthY: room.fountain.y });
    }

    // Add Projectiles
    projectiles.forEach((proj) => {
      items.push({ type: 'projectile', obj: proj, depthY: proj.y });
    });

    // Sort by depthY ascending (further away in North rendered first)
    items.sort((a, b) => a.depthY - b.depthY);

    items.forEach((item) => {
      if (item.type === 'player') {
        this.renderPlayer(ctx, w, h, camX, camY, item.obj);
      } else if (item.type === 'enemy') {
        this.renderEnemy(ctx, w, h, camX, camY, item.obj);
      } else if (item.type === 'pillar') {
        this.renderPillar(ctx, w, h, camX, camY, item.obj);
      } else if (item.type === 'door') {
        this.renderDoor(ctx, w, h, camX, camY, item.obj, player);
      } else if (item.type === 'pickup') {
        this.renderPickup(ctx, w, h, camX, camY, item.obj, player);
      } else if (item.type === 'chest') {
        this.renderChest(ctx, w, h, camX, camY, item.obj, player);
      } else if (item.type === 'fountain') {
        this.renderFountain(ctx, w, h, camX, camY, item.obj, player);
      } else {
        this.renderProjectile(ctx, w, h, camX, camY, item.obj);
      }
    });
  }

  /**
   * Natural vertical harp/piano string barrier when room is locked
   * (Replaces the crude wireframe box)
   */
  private renderBarrierStrings(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    camX: number,
    camY: number,
    roomW: number,
    roomH: number
  ) {
    const halfW = roomW / 2;
    const halfH = roomH / 2;
    const stringHeight = 55;
    const time = Date.now() * 0.003;
    const pulse = 0.35 + Math.sin(time) * 0.15;

    // Draw vertical ethereal string arrays along boundaries
    const spacing = 36;

    // South perimeter
    for (let x = -halfW; x <= halfW; x += spacing) {
      const pBot = worldToScreen(x, halfH, 0, camX, camY, w, h);
      const pTop = worldToScreen(x, halfH, stringHeight, camX, camY, w, h);

      ctx.beginPath();
      ctx.moveTo(pBot.x, pBot.y);
      ctx.lineTo(pTop.x, pTop.y);
      ctx.strokeStyle = `rgba(230, 230, 255, ${pulse * 0.6})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Base runic glow
      ctx.fillStyle = `rgba(255, 255, 255, ${pulse * 0.8})`;
      ctx.beginPath();
      ctx.arc(pBot.x, pBot.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // West and East perimeters
    for (let y = -halfH; y <= halfH; y += spacing) {
      [-halfW, halfW].forEach((xBound) => {
        const pBot = worldToScreen(xBound, y, 0, camX, camY, w, h);
        const pTop = worldToScreen(xBound, y, stringHeight, camX, camY, w, h);

        ctx.beginPath();
        ctx.moveTo(pBot.x, pBot.y);
        ctx.lineTo(pTop.x, pTop.y);
        ctx.strokeStyle = `rgba(230, 230, 255, ${pulse * 0.6})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    }
  }

  private renderTelegraphs(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    camX: number,
    camY: number,
    telegraphs: TelegraphArea[]
  ) {
    telegraphs.forEach((tg) => {
      const pos = worldToScreen(tg.x, tg.y, 0, camX, camY, w, h);

      if (tg.type === 'circle') {
        const rad = tg.radius || 70;
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.scale(1, TILT_Y);

        // Warning filled slice
        ctx.beginPath();
        ctx.arc(0, 0, rad * Math.max(0.1, tg.progress), 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(235, 60, 60, 0.25)';
        ctx.fill();

        // Warning perimeter
        ctx.beginPath();
        ctx.arc(0, 0, rad, 0, Math.PI * 2);
        ctx.strokeStyle = tg.color || 'rgba(240, 80, 80, 0.75)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
      } else if (tg.type === 'line' && tg.angle !== undefined) {
        const length = tg.length || 240;
        const width = tg.width || 36;
        const forward = {
          x: Math.cos(tg.angle) * length,
          y: Math.sin(tg.angle) * length,
        };
        const perp = {
          x: -Math.sin(tg.angle) * (width / 2),
          y: Math.cos(tg.angle) * (width / 2),
        };

        const p1 = worldToScreen(tg.x + perp.x, tg.y + perp.y, 0, camX, camY, w, h);
        const p2 = worldToScreen(tg.x + forward.x + perp.x, tg.y + forward.y + perp.y, 0, camX, camY, w, h);
        const p3 = worldToScreen(tg.x + forward.x - perp.x, tg.y + forward.y - perp.y, 0, camX, camY, w, h);
        const p4 = worldToScreen(tg.x - perp.x, tg.y - perp.y, 0, camX, camY, w, h);

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();

        ctx.fillStyle = `rgba(235, 60, 60, ${0.15 + tg.progress * 0.25})`;
        ctx.fill();
        ctx.strokeStyle = 'rgba(240, 80, 80, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });
  }

  private renderSlashes(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    camX: number,
    camY: number,
    slashes: SlashAttack[]
  ) {
    slashes.forEach((slash) => {
      const pos = worldToScreen(slash.x, slash.y, 16, camX, camY, w, h);
      const ratio = slash.timer / slash.maxTimer; // 1 -> 0
      const alpha = Math.max(0, ratio);
      const vType = slash.visualType || 'cross';

      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(slash.facing);
      ctx.scale(1.2, 0.85);

      if (vType === 'cross') {
        // Step 0: Cross Slash (Two intersecting crossing arcs forming an X)
        const rad = slash.radius * (0.8 + 0.3 * (1 - ratio));
        ctx.lineWidth = 5 * alpha;
        ctx.lineCap = 'round';
        ctx.strokeStyle = slash.isCrit ? `rgba(255, 230, 160, ${alpha})` : `rgba(255, 255, 255, ${alpha * 0.95})`;

        // Diagonal slash 1
        ctx.beginPath();
        ctx.arc(0, -6, rad, -slash.arcAngle * 0.6, slash.arcAngle * 0.4);
        ctx.stroke();

        // Diagonal slash 2 (crossing over)
        ctx.beginPath();
        ctx.arc(0, 6, rad, -slash.arcAngle * 0.4, slash.arcAngle * 0.6);
        ctx.stroke();

        // Crossing flash intersection point
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(rad * 0.85, 0, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (vType === 'rapid') {
        // Step 1: Rapid Flurry (Double parallel crescent ink slashes)
        const rad = slash.radius * (0.85 + 0.25 * (1 - ratio));
        ctx.lineWidth = 4 * alpha;
        ctx.strokeStyle = slash.isCrit ? `rgba(255, 235, 170, ${alpha})` : `rgba(240, 240, 255, ${alpha * 0.9})`;

        ctx.beginPath();
        ctx.arc(0, 0, rad, -slash.arcAngle / 2, slash.arcAngle / 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(4, 0, rad * 0.8, -slash.arcAngle * 0.45, slash.arcAngle * 0.45);
        ctx.lineWidth = 2.5 * alpha;
        ctx.stroke();
      } else if (vType === 'thrust') {
        // Linear Pierce Thrust
        const reach = slash.radius * (0.9 + 0.25 * (1 - ratio));
        const grad = ctx.createLinearGradient(0, 0, reach, 0);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        grad.addColorStop(0.7, slash.isCrit ? `rgba(255, 230, 150, ${alpha})` : `rgba(220, 230, 255, ${alpha})`);
        grad.addColorStop(1, '#ffffff');

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(reach, 0);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 8 * alpha;
        ctx.stroke();

        // Piercing diamond tip
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(reach, 0, 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (vType === 'spin') {
        // 360 Full Cyclone Spin
        const rad = slash.radius * (0.8 + 0.3 * (1 - ratio));
        ctx.beginPath();
        ctx.arc(0, 0, rad, 0, Math.PI * 2);
        ctx.strokeStyle = slash.isCrit ? `rgba(255, 230, 160, ${alpha})` : `rgba(255, 255, 255, ${alpha * 0.85})`;
        ctx.lineWidth = 5 * alpha;
        ctx.stroke();
      } else {
        // Default Heavy Sweep
        ctx.beginPath();
        ctx.arc(0, 0, slash.radius * (0.8 + 0.3 * (1 - ratio)), -slash.arcAngle / 2, slash.arcAngle / 2);
        ctx.strokeStyle = slash.isCrit ? `rgba(255, 230, 160, ${alpha})` : `rgba(245, 245, 255, ${alpha * 0.9})`;
        ctx.lineWidth = 7 * alpha;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, slash.radius * (0.88 + 0.22 * (1 - ratio)), -slash.arcAngle * 0.45, slash.arcAngle * 0.45);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      ctx.restore();
    });
  }

  private renderPlayer(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    camX: number,
    camY: number,
    player: Player
  ) {
    const ground = worldToScreen(player.x, player.y, 0, camX, camY, w, h);

    // 1. Ghostly Afterimages during Dash
    if (player.afterimages && player.afterimages.length > 0) {
      player.afterimages.forEach((img) => {
        const imgPos = worldToScreen(img.x, img.y, 0, camX, camY, w, h);
        ctx.save();
        ctx.globalAlpha = img.alpha * 0.45;
        this.drawGirlSprite(ctx, imgPos.x, imgPos.y, img.facing, 0, false, true, player.attackState.phase, player.attackState.stepIndex);
        ctx.restore();
      });
    }

    // 2. Soft Ground Shadow
    ctx.save();
    ctx.translate(ground.x, ground.y);
    ctx.scale(1, TILT_Y);
    ctx.beginPath();
    ctx.arc(0, 0, player.radius * 0.9, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fill();
    ctx.restore();

    // 3. Render Little Girl Character with Dual Blades
    const isHurt = player.lastHurtTimer > 0;
    const isInvulnerable = player.invulnerableTimer > 0 || player.isDodging;

    ctx.save();
    if (isInvulnerable) {
      ctx.globalAlpha = 0.75 + Math.sin(Date.now() * 0.03) * 0.2;
    }

    this.drawGirlSprite(
      ctx,
      ground.x,
      ground.y,
      player.facing,
      player.runFrame,
      isHurt,
      false,
      player.attackState.phase,
      player.attackState.stepIndex
    );

    ctx.restore();

    // 4. Aim line (Ethereal needle pointer)
    const aimLength = 48;
    const aimWorldX = player.x + Math.cos(player.facing) * aimLength;
    const aimWorldY = player.y + Math.sin(player.facing) * aimLength;
    const aimScreen = worldToScreen(aimWorldX, aimWorldY, 18, camX, camY, w, h);
    const originScreen = worldToScreen(player.x, player.y, 18, camX, camY, w, h);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(originScreen.x, originScreen.y);
    ctx.lineTo(aimScreen.x, aimScreen.y);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(aimScreen.x, aimScreen.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
  }

  private drawGirlSprite(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    facing: number,
    runFrame: number,
    isHurt: boolean,
    isSilhouette: boolean = false,
    attackPhase: string = 'idle',
    comboStep: number = 0
  ) {
    ctx.save();
    ctx.translate(sx, sy);

    const bob = Math.sin(runFrame * 8) * 3;
    const hairSway = Math.cos(runFrame * 6) * 4;
    const isMoving = Math.abs(runFrame) > 0.01;

    if (isSilhouette) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(0, -22 + bob, 12, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    if (isHurt) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ff4444';
    }

    // 1. Long Inky Hair (Back Layer)
    ctx.fillStyle = isHurt ? '#ffffff' : '#141418';
    ctx.beginPath();
    ctx.moveTo(-7, -35 + bob);
    ctx.quadraticCurveTo(-14 + hairSway, -15 + bob, -8 + hairSway, -4 + bob);
    ctx.quadraticCurveTo(0, -10 + bob, 8 - hairSway, -4 + bob);
    ctx.quadraticCurveTo(14 - hairSway, -15 + bob, 7, -35 + bob);
    ctx.closePath();
    ctx.fill();

    // 2. Slender Legs & Shoes
    ctx.strokeStyle = isHurt ? '#ffffff' : '#222228';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    const legOffset1 = isMoving ? Math.sin(runFrame * 8) * 6 : 0;
    const legOffset2 = isMoving ? -Math.sin(runFrame * 8) * 6 : 0;

    ctx.beginPath();
    ctx.moveTo(-3, -12 + bob);
    ctx.lineTo(-4 + legOffset1, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(3, -12 + bob);
    ctx.lineTo(4 + legOffset2, 0);
    ctx.stroke();

    // 3. Flowing White / Silver Dress
    ctx.fillStyle = isHurt ? '#ffdddd' : '#f0f0f5';
    ctx.beginPath();
    ctx.moveTo(0, -32 + bob);
    ctx.lineTo(-7, -22 + bob);
    ctx.lineTo(-12 - (isMoving ? 4 : 0), -10 + bob);
    ctx.quadraticCurveTo(0, -8 + bob, 12 + (isMoving ? 4 : 0), -10 + bob);
    ctx.lineTo(7, -22 + bob);
    ctx.closePath();
    ctx.fill();

    // Dress ink-black hem ribbon
    ctx.strokeStyle = isHurt ? '#ffffff' : '#1a1a22';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 4. White Silk Scarf floating behind
    ctx.strokeStyle = isHurt ? '#ffffff' : '#e4e4ec';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -30 + bob);
    ctx.quadraticCurveTo(-12 - hairSway, -26 + bob, -22 - hairSway * 1.5, -20 + bob);
    ctx.stroke();

    // 5. Delicate Head & Anime Face
    ctx.fillStyle = isHurt ? '#ffffff' : '#fcfaf6';
    ctx.beginPath();
    ctx.arc(0, -36 + bob, 7.5, 0, Math.PI * 2);
    ctx.fill();

    // Hair Bangs
    ctx.fillStyle = isHurt ? '#ffffff' : '#181820';
    ctx.beginPath();
    ctx.arc(0, -37 + bob, 8, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fill();

    // Hair Bow
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(4, -42 + bob, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 6. Dual Blades (雙刀小女孩) - Left Blade & Right Blade
    const isAttacking = attackPhase === 'active' || attackPhase === 'windup';

    // Right Hand Blade
    ctx.save();
    ctx.translate(5, -22 + bob);

    let rightAngle = facing * 0.5;
    let rightThrust = 0;

    if (isAttacking) {
      if (comboStep === 0) {
        // Cross slash: Right blade crosses downward to the left
        rightAngle += 0.5;
        rightThrust = 9;
      } else if (comboStep === 1) {
        // Rapid flurry: Right blade slashes forward
        rightAngle -= 0.3;
        rightThrust = 11;
      } else {
        // Heavy sweep / thrust: Full outward extension
        rightAngle += 0.8;
        rightThrust = 14;
      }
    }

    ctx.rotate(rightAngle);
    ctx.translate(rightThrust, 0);

    // Blade line
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(16, -6);
    ctx.strokeStyle = isHurt ? '#ffffff' : '#e0e0e8';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(16, -6, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#b0b0bc';
    ctx.beginPath();
    ctx.arc(2, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Left Hand Blade (Dual Blade)
    ctx.save();
    ctx.translate(-5, -22 + bob);

    let leftAngle = facing * 0.5 - 0.2;
    let leftThrust = 0;

    if (isAttacking) {
      if (comboStep === 0) {
        // Cross slash: Left blade crosses upward to the right
        leftAngle -= 0.5;
        leftThrust = 9;
      } else if (comboStep === 1) {
        // Rapid flurry: Left blade follows right blade quickly
        leftAngle += 0.4;
        leftThrust = 10;
      } else {
        // Heavy sweep: Left blade assists with momentum
        leftAngle -= 0.6;
        leftThrust = 8;
      }
    }

    ctx.rotate(leftAngle);
    ctx.translate(leftThrust, 0);

    // Blade line
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(15, 6);
    ctx.strokeStyle = isHurt ? '#ffffff' : '#e0e0e8';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(15, 6, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#b0b0bc';
    ctx.beginPath();
    ctx.arc(2, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  private renderEnemy(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    camX: number,
    camY: number,
    enemy: Enemy
  ) {
    const isStunned = Boolean(enemy.hitStunTimer && enemy.hitStunTimer > 0);
    const isSuperArmor = enemy.elite || enemy.type === 'sentinel_golem' || enemy.type === 'boss_maestro';

    // Jitter during hitstun
    const jitterX = isStunned ? (Math.random() - 0.5) * 3 : 0;
    const jitterY = isStunned ? (Math.random() - 0.5) * 3 : 0;

    const ground = worldToScreen(enemy.x + jitterX, enemy.y + jitterY, 0, camX, camY, w, h);

    // 1. Ground Shadow
    ctx.save();
    ctx.translate(ground.x, ground.y);
    ctx.scale(1, TILT_Y);
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius * 0.95, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fill();

    // If Super Armor, draw subtle golden runic ring under feet
    if (isSuperArmor) {
      ctx.strokeStyle = 'rgba(255, 215, 120, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius * 1.15, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // 2. Draw Enemy Body by Type
    const isHurt = enemy.hurtFlashTimer > 0;
    ctx.save();
    ctx.translate(ground.x, ground.y);

    if (enemy.type === 'wanderer') {
      this.drawMeleeWanderer(ctx, isHurt, enemy.facing);
    } else if (enemy.type === 'phantom_archer') {
      this.drawPhantomArcher(ctx, isHurt, enemy.isTelegraphing);
    } else if (enemy.type === 'sentinel_golem') {
      this.drawSentinelGolem(ctx, isHurt, enemy.isTelegraphing);
    } else if (enemy.type === 'boss_maestro') {
      this.drawBossMaestro(ctx, isHurt, enemy.phase || 1, enemy.isTelegraphing);
    }

    ctx.restore();

    // 3. Mini Overhead HP bar & Status Badges
    const headTopY = ground.y - (enemy.type === 'boss_maestro' ? 84 : enemy.type === 'sentinel_golem' ? 64 : 46);

    if (enemy.type !== 'boss_maestro' && enemy.hp < enemy.maxHp) {
      const barW = 34;
      const barH = 3.5;
      const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);

      ctx.fillStyle = 'rgba(10, 10, 14, 0.8)';
      ctx.fillRect(ground.x - barW / 2, headTopY, barW, barH);

      ctx.fillStyle = '#e5e5ea';
      ctx.fillRect(ground.x - barW / 2, headTopY, barW * hpRatio, barH);

      ctx.strokeStyle = '#22222a';
      ctx.lineWidth = 1;
      ctx.strokeRect(ground.x - barW / 2, headTopY, barW, barH);
    }

    // 4. Hitstun Indicator (Stagger)
    if (isStunned) {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ 硬直', ground.x, headTopY - 7);
      ctx.restore();
    } else if (isSuperArmor && isHurt) {
      // 5. Super Armor Flash when struck
      ctx.save();
      ctx.fillStyle = '#ffe082';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('◆ 霸體 ◆', ground.x, headTopY - 7);
      ctx.restore();
    }
  }

  /**
   * 1. Physical World Doorway (Gateway / Portal Archway)
   */
  private renderDoor(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    camX: number,
    camY: number,
    door: WorldDoor,
    player: Player
  ) {
    const ground = worldToScreen(door.x, door.y, 0, camX, camY, w, h);
    const time = Date.now() * 0.003;
    const branch = door.branch;

    const pDist = Math.hypot(player.x - door.x, player.y - door.y);
    const isNearby = pDist <= 72;

    // Theme color & distinctive iconography based on room branch type
    let themeColor = '#e0e4f0';
    let auraGlow = 'rgba(220, 230, 255, 0.35)';
    let typeBadge = '【房間】';

    if (branch.type === 'skill') {
      themeColor = '#c084fc'; // Purple resonance
      auraGlow = 'rgba(192, 132, 252, 0.45)';
      typeBadge = '【主動技能房】';
    } else if (branch.type === 'attack_mod') {
      themeColor = '#fb923c'; // Amber sword flame
      auraGlow = 'rgba(251, 146, 60, 0.45)';
      typeBadge = '【攻擊強化房】';
    } else if (branch.type === 'upgrade') {
      themeColor = '#38bdf8'; // Crystal azure
      auraGlow = 'rgba(56, 189, 248, 0.45)';
      typeBadge = '【基礎強化房】';
    } else if (branch.type === 'fountain') {
      themeColor = '#34d399'; // Emerald life spring
      auraGlow = 'rgba(52, 211, 153, 0.45)';
      typeBadge = '【生命上限房】';
    } else if (branch.type === 'chest') {
      themeColor = '#facc15'; // Gold relic vault
      auraGlow = 'rgba(250, 204, 21, 0.45)';
      typeBadge = '【秘藏寶箱房】';
    } else if (branch.type === 'elite') {
      themeColor = '#f43f5e'; // Crimson challenge
      auraGlow = 'rgba(244, 63, 94, 0.45)';
      typeBadge = '【精英試煉房】';
    } else if (branch.type === 'boss') {
      themeColor = '#e11d48'; // Royal dark ruby
      auraGlow = 'rgba(225, 29, 72, 0.65)';
      typeBadge = '【終焉 BOSS 房】';
    }

    // 1. Ground Portal Light Pool
    ctx.save();
    ctx.translate(ground.x, ground.y);
    ctx.scale(1, TILT_Y);
    const poolGrad = ctx.createRadialGradient(0, 0, 8, 0, 0, 44);
    poolGrad.addColorStop(0, auraGlow);
    poolGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = poolGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Gothic Archway Frame
    const archW = 66;
    const archH = 92;
    const archTop = ground.y - archH;

    ctx.save();
    // Portal inner vortex background
    const vortexGrad = ctx.createLinearGradient(0, ground.y, 0, archTop);
    vortexGrad.addColorStop(0, '#0c0d14');
    vortexGrad.addColorStop(0.5, '#161928');
    vortexGrad.addColorStop(1, themeColor);

    // Archway aperture shape
    ctx.beginPath();
    ctx.moveTo(ground.x - archW / 2 + 8, ground.y);
    ctx.lineTo(ground.x - archW / 2 + 8, archTop + 24);
    ctx.quadraticCurveTo(ground.x, archTop, ground.x + archW / 2 - 8, archTop + 24);
    ctx.lineTo(ground.x + archW / 2 - 8, ground.y);
    ctx.closePath();
    ctx.fillStyle = vortexGrad;
    ctx.fill();

    // Swirling portal vortex rings
    ctx.save();
    ctx.translate(ground.x, (ground.y + archTop) / 2);
    for (let r = 1; r <= 3; r++) {
      ctx.beginPath();
      const ringRadX = 14 + r * 6;
      const ringRadY = (8 + r * 4) * TILT_Y;
      const rot = time * (r % 2 === 0 ? 1 : -1) * (0.8 + r * 0.3);
      ctx.ellipse(0, 0, ringRadX, ringRadY, rot, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.25 + 0.15 * Math.sin(time + r)})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();

    // Stone Archway Pillars & Lintel
    ctx.strokeStyle = '#2d2e3d';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(ground.x - archW / 2, ground.y);
    ctx.lineTo(ground.x - archW / 2, archTop + 20);
    ctx.quadraticCurveTo(ground.x, archTop - 6, ground.x + archW / 2, archTop + 20);
    ctx.lineTo(ground.x + archW / 2, ground.y);
    ctx.stroke();

    // Keystone rune on top
    ctx.fillStyle = themeColor;
    ctx.beginPath();
    ctx.arc(ground.x, archTop - 4, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // 3. Floating Overhead Information Plaque
    const plaqueY = archTop - 44;
    const plaqueW = 176;
    const plaqueH = 52;

    // Plaque background
    ctx.fillStyle = 'rgba(10, 10, 15, 0.92)';
    ctx.strokeStyle = isNearby ? themeColor : '#323448';
    ctx.lineWidth = isNearby ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(ground.x - plaqueW / 2, plaqueY - plaqueH / 2, plaqueW, plaqueH, 6);
    ctx.fill();
    ctx.stroke();

    // Room Type Distinct Badge
    ctx.fillStyle = themeColor;
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typeBadge, ground.x, plaqueY - 14);

    // Plaque Room Name
    ctx.fillStyle = '#f4f4f8';
    ctx.font = 'bold 11px serif';
    ctx.fillText(branch.nameZh, ground.x, plaqueY);

    // Reward Preview
    ctx.fillStyle = '#a0a0b8';
    ctx.font = '8.5px monospace';
    ctx.fillText(branch.rewardTypeDesc.slice(0, 18), ground.x, plaqueY + 14);

    // 4. Proximity Key Prompt
    if (isNearby) {
      const promptY = ground.y + 14;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      const promptPulse = 0.8 + Math.sin(time * 5) * 0.2;
      ctx.globalAlpha = promptPulse;
      ctx.fillText('[ 按 F 選擇此門 ]', ground.x, promptY);
      ctx.globalAlpha = 1.0;
    }

    ctx.restore();
  }

  /**
   * 2. Physical World Reward Pedestal / Floating Orb
   */
  private renderPickup(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    camX: number,
    camY: number,
    pickup: WorldRewardPickup,
    player: Player
  ) {
    if (pickup.claimed) return;
    const ground = worldToScreen(pickup.x, pickup.y, 0, camX, camY, w, h);
    const time = Date.now() * 0.003;

    const pDist = Math.hypot(player.x - pickup.x, player.y - pickup.y);
    const isNearby = pDist <= 60;

    // Neutral styling: this is one altar for all reward choices.
    const catColor = '#d4d4d8';
    const catLabel = '關卡獎勵';

    // 1. Pedestal Base
    ctx.save();
    ctx.translate(ground.x, ground.y);
    ctx.scale(1, TILT_Y);
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fillStyle = '#1c1c28';
    ctx.fill();
    ctx.strokeStyle = '#323448';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Runic light ring
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.strokeStyle = catColor;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // 2. Floating Gem/Orb
    const hoverZ = 34 + Math.sin(time * 2 + pickup.x * 0.05) * 5;
    const gemScreen = worldToScreen(pickup.x, pickup.y, hoverZ, camX, camY, w, h);

    ctx.save();
    ctx.translate(gemScreen.x, gemScreen.y);

    // Glowing aura
    const orbGrad = ctx.createRadialGradient(0, 0, 3, 0, 0, 18);
    orbGrad.addColorStop(0, '#ffffff');
    orbGrad.addColorStop(0.4, catColor);
    orbGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = orbGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();

    // Rotating crystal rhombus
    const rot = time * 1.5;
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(8, 0);
    ctx.lineTo(0, 11);
    ctx.lineTo(-8, 0);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = catColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // 3. Floating Reward Information Plate
    const plateY = gemScreen.y - 36;
    const plateW = 154;
    const plateH = 46;

    ctx.save();
    ctx.fillStyle = 'rgba(10, 10, 16, 0.9)';
    ctx.strokeStyle = isNearby ? catColor : '#323448';
    ctx.lineWidth = isNearby ? 1.5 : 1;
    ctx.beginPath();
    ctx.roundRect(gemScreen.x - plateW / 2, plateY - plateH / 2, plateW, plateH, 6);
    ctx.fill();
    ctx.stroke();

    // Badge
    ctx.fillStyle = catColor;
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`[ ${catLabel} ]`, gemScreen.x, plateY - 12);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px serif';
    ctx.fillText('選擇一項關卡獎勵', gemScreen.x, plateY);

    // Description / tag
    ctx.fillStyle = '#a8a8ba';
    ctx.font = '8.5px monospace';
    ctx.fillText('靠近後按 F 互動', gemScreen.x, plateY + 12);

    // 4. Proximity Key Prompt
    if (isNearby) {
      const promptY = ground.y + 12;
      ctx.fillStyle = catColor;
      ctx.font = 'bold 10px monospace';
      const promptPulse = 0.8 + Math.sin(time * 5) * 0.2;
      ctx.globalAlpha = promptPulse;
      ctx.fillText('[ 按 F 互動 ]', ground.x, promptY);
      ctx.globalAlpha = 1.0;
    }

    ctx.restore();
  }

  /**
   * 3. Physical World Gothic Chest
   */
  private renderChest(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    camX: number,
    camY: number,
    chest: WorldChest,
    player: Player
  ) {
    const ground = worldToScreen(chest.x, chest.y, 0, camX, camY, w, h);
    const pDist = Math.hypot(player.x - chest.x, player.y - chest.y);
    const isNearby = pDist <= 65;

    ctx.save();
    // Ground shadow
    ctx.translate(ground.x, ground.y);
    ctx.scale(1, TILT_Y);
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(ground.x, ground.y);

    const chestW = 38;
    const chestH = 24;

    // Chest Body
    ctx.fillStyle = '#1e1e28';
    ctx.fillRect(-chestW / 2, -chestH, chestW, chestH);
    ctx.strokeStyle = '#44465c';
    ctx.lineWidth = 2;
    ctx.strokeRect(-chestW / 2, -chestH, chestW, chestH);

    // Iron Straps & Studs
    ctx.fillStyle = '#656880';
    ctx.fillRect(-chestW / 2 + 6, -chestH, 4, chestH);
    ctx.fillRect(chestW / 2 - 10, -chestH, 4, chestH);

    // Chest Lid
    if (!chest.opened) {
      // Closed lid
      ctx.fillStyle = '#262836';
      ctx.beginPath();
      ctx.moveTo(-chestW / 2, -chestH);
      ctx.quadraticCurveTo(0, -chestH - 10, chestW / 2, -chestH);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Golden Lock
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(0, -chestH / 2, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Proximity Prompt
      if (isNearby) {
        ctx.fillStyle = '#80e5ff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('[ 按 F 開啟秘藏 ]', 0, 16);
      }
    } else {
      // Open lid angled back
      ctx.fillStyle = '#161722';
      ctx.beginPath();
      ctx.moveTo(-chestW / 2, -chestH);
      ctx.lineTo(-chestW / 2 + 5, -chestH - 18);
      ctx.lineTo(chestW / 2 - 5, -chestH - 18);
      ctx.lineTo(chestW / 2, -chestH);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Golden radiance beam inside
      const lightGrad = ctx.createLinearGradient(0, -chestH, 0, -chestH - 45);
      lightGrad.addColorStop(0, 'rgba(255, 220, 100, 0.7)');
      lightGrad.addColorStop(1, 'rgba(255, 220, 100, 0)');
      ctx.fillStyle = lightGrad;
      ctx.beginPath();
      ctx.moveTo(-chestW / 2 + 4, -chestH);
      ctx.lineTo(-chestW / 2 - 10, -chestH - 45);
      ctx.lineTo(chestW / 2 + 10, -chestH - 45);
      ctx.lineTo(chestW / 2 - 4, -chestH);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * 4. Physical World Recovery Fountain
   */
  private renderFountain(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    camX: number,
    camY: number,
    fountain: WorldFountain,
    player: Player
  ) {
    const ground = worldToScreen(fountain.x, fountain.y, 0, camX, camY, w, h);
    const time = Date.now() * 0.003;
    const pDist = Math.hypot(player.x - fountain.x, player.y - fountain.y);
    const isNearby = pDist <= 70;

    ctx.save();
    ctx.translate(ground.x, ground.y);
    ctx.scale(1, TILT_Y);

    // Outer Stone Basin Octagon
    const poolR = fountain.radius;
    ctx.beginPath();
    ctx.arc(0, 0, poolR + 6, 0, Math.PI * 2);
    ctx.fillStyle = '#181924';
    ctx.fill();
    ctx.strokeStyle = '#383a50';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Water pool
    const waterGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, poolR);
    if (!fountain.used) {
      waterGrad.addColorStop(0, '#55ffaa');
      waterGrad.addColorStop(0.6, '#1a5940');
      waterGrad.addColorStop(1, '#0e261c');
    } else {
      waterGrad.addColorStop(0, '#3a4a58');
      waterGrad.addColorStop(1, '#111720');
    }
    ctx.fillStyle = waterGrad;
    ctx.beginPath();
    ctx.arc(0, 0, poolR, 0, Math.PI * 2);
    ctx.fill();

    // Ripples
    for (let r = 1; r <= 2; r++) {
      const ripRad = (time * 25 + r * 20) % poolR;
      ctx.beginPath();
      ctx.arc(0, 0, ripRad, 0, Math.PI * 2);
      ctx.strokeStyle = fountain.used ? 'rgba(255,255,255,0.06)' : 'rgba(120,255,180,0.25)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();

    // Center Spire & Prompt
    ctx.save();
    ctx.translate(ground.x, ground.y);
    if (!fountain.used) {
      // Floating Musical Rune
      const runeY = -24 + Math.sin(time * 3) * 4;
      ctx.fillStyle = '#66ffbb';
      ctx.font = 'bold 16px serif';
      ctx.textAlign = 'center';
      ctx.fillText('𝄞', 0, runeY);

      if (isNearby) {
        ctx.fillStyle = '#66ffbb';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('[ 按 F 使用綠門 ]', 0, 22);
      }
    } else {
      ctx.fillStyle = '#7a8595';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('(泉水力量已耗盡)', 0, 22);
    }
    ctx.restore();
  }

  private drawMeleeWanderer(ctx: CanvasRenderingContext2D, isHurt: boolean, facing: number) {
    const time = Date.now() * 0.005;
    const bob = Math.sin(time) * 2;

    ctx.fillStyle = isHurt ? '#ffffff' : '#181822';
    ctx.beginPath();
    ctx.moveTo(0, -32 + bob);
    ctx.lineTo(-12, -18 + bob);
    ctx.lineTo(-10, 0);
    ctx.lineTo(10, 0);
    ctx.lineTo(12, -18 + bob);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = isHurt ? '#ffffff' : '#525264';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, -16 + bob);
    ctx.lineTo(-16, -10 + bob);
    ctx.moveTo(10, -16 + bob);
    ctx.lineTo(16, -10 + bob);
    ctx.stroke();

    ctx.fillStyle = isHurt ? '#ff4444' : '#ffffff';
    ctx.beginPath();
    ctx.ellipse(Math.cos(facing) * 3, -26 + bob, 3, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawPhantomArcher(ctx: CanvasRenderingContext2D, isHurt: boolean, isCharging: boolean) {
    const time = Date.now() * 0.004;
    const floatY = Math.sin(time) * 4 - 8;

    ctx.fillStyle = isHurt ? '#ffffff' : '#20202e';
    ctx.beginPath();
    ctx.ellipse(0, -28 + floatY, 11, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = isCharging ? '#ff5555' : 'rgba(230, 230, 255, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, -48 + floatY, 14, 5, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = isHurt ? '#ffffff' : '#8c8ca0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(14, -28 + floatY, 12, -Math.PI * 0.4, Math.PI * 0.4);
    ctx.stroke();

    if (isCharging) {
      ctx.fillStyle = '#ff6b6b';
      ctx.beginPath();
      ctx.arc(14, -28 + floatY, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawSentinelGolem(ctx: CanvasRenderingContext2D, isHurt: boolean, isStomping: boolean) {
    const bob = isStomping ? -6 : 0;

    ctx.fillStyle = isHurt ? '#ffffff' : '#2a2a38';
    ctx.fillRect(-18, -48 + bob, 36, 40);

    ctx.fillStyle = isHurt ? '#ffffff' : '#38384a';
    ctx.fillRect(-24, -44 + bob, 8, 16);
    ctx.fillRect(16, -44 + bob, 8, 16);

    ctx.strokeStyle = isHurt ? '#ff4444' : '#64647c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, -38 + bob);
    ctx.lineTo(-2, -30 + bob);
    ctx.lineTo(-6, -20 + bob);
    ctx.stroke();

    ctx.fillStyle = isStomping ? '#ff4444' : '#d0d0e0';
    ctx.fillRect(-8, -42 + bob, 16, 4);

    ctx.fillStyle = '#1c1c24';
    ctx.fillRect(18, -52 + bob, 8, 36);
    ctx.fillStyle = '#4a4a5e';
    ctx.fillRect(14, -58 + bob, 16, 12);
  }

  private drawBossMaestro(
    ctx: CanvasRenderingContext2D,
    isHurt: boolean,
    phase: number,
    isTelegraphing: boolean
  ) {
    const time = Date.now() * 0.003;
    const floatY = Math.sin(time) * 5;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 10, -60 + floatY);
      ctx.lineTo(i * 16, -180);
      ctx.stroke();
    }

    ctx.fillStyle = isHurt ? '#ffffff' : '#14141e';
    ctx.beginPath();
    ctx.moveTo(0, -68 + floatY);
    ctx.lineTo(-26, -30 + floatY);
    ctx.lineTo(-22, 0);
    ctx.lineTo(22, 0);
    ctx.lineTo(26, -30 + floatY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(235, 235, 245, 0.8)';
    ctx.beginPath();
    ctx.moveTo(-12, -45 + floatY);
    ctx.quadraticCurveTo(-34, -20 + floatY, -28, 6);
    ctx.lineTo(-22, 4);
    ctx.quadraticCurveTo(-28, -20 + floatY, -8, -45 + floatY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = isHurt ? '#ff4444' : '#fafafc';
    ctx.beginPath();
    ctx.arc(0, -68 + floatY, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = phase === 2 ? '#b82a2a' : '#1a1a24';
    ctx.beginPath();
    ctx.arc(-5, -68 + floatY, 2.5, 0, Math.PI * 2);
    ctx.arc(5, -68 + floatY, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = phase === 2 ? '#b82a2a' : '#1a1a24';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-5, -66 + floatY);
    ctx.lineTo(-5, -57 + floatY);
    ctx.moveTo(5, -66 + floatY);
    ctx.lineTo(5, -57 + floatY);
    ctx.stroke();

    ctx.save();
    ctx.translate(18, -45 + floatY);
    ctx.rotate(-0.5 + Math.sin(time * 2) * 0.4);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(26, -26);
    ctx.stroke();

    ctx.fillStyle = phase === 2 ? '#ff4444' : '#a0c4ff';
    ctx.beginPath();
    ctx.arc(26, -26, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private renderProjectile(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    camX: number,
    camY: number,
    proj: Projectile
  ) {
    const pos = worldToScreen(proj.x, proj.y, 16, camX, camY, w, h);

    ctx.save();
    ctx.translate(pos.x, pos.y);

    if (proj.type === 'needle') {
      const angle = Math.atan2(proj.vy * TILT_Y, proj.vx);
      ctx.rotate(angle);

      const grad = ctx.createLinearGradient(-18, 0, 8, 0);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      grad.addColorStop(1, proj.color || '#ffffff');

      ctx.beginPath();
      ctx.moveTo(-18, 0);
      ctx.lineTo(10, 0);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 3.5;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(8, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (proj.type === 'wave') {
      const angle = Math.atan2(proj.vy * TILT_Y, proj.vx);
      ctx.rotate(angle);

      ctx.beginPath();
      ctx.arc(0, 0, proj.radius * 1.4, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.strokeStyle = proj.color || '#ffffff';
      ctx.lineWidth = 4;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, proj.radius, 0, Math.PI * 2);
      ctx.fillStyle = proj.color || '#ffffff';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, 0, proj.radius * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }

    ctx.restore();
  }

  private renderParticles(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    camX: number,
    camY: number,
    particles: Particle[]
  ) {
    particles.forEach((p) => {
      const pos = worldToScreen(p.x, p.y, p.z, camX, camY, w, h);

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;

      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'spark') {
        ctx.beginPath();
        ctx.moveTo(pos.x - p.size, pos.y);
        ctx.lineTo(pos.x + p.size, pos.y);
        ctx.moveTo(pos.x, pos.y - p.size);
        ctx.lineTo(pos.x, pos.y + p.size);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (p.shape === 'petal') {
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y, p.size, p.size * 0.5, 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'note') {
        ctx.font = `${Math.round(p.size * 3)}px serif`;
        ctx.fillText('♪', pos.x, pos.y);
      } else {
        ctx.fillRect(pos.x - p.size / 2, pos.y - p.size / 2, p.size, p.size);
      }

      ctx.restore();
    });
  }

  private renderAmbientAtmosphere(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    camX: number,
    camY: number,
    ambientParticles: Particle[]
  ) {
    ambientParticles.forEach((p) => {
      const pos = worldToScreen(p.x, p.y, p.z, camX, camY, w, h);
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  private renderDamageNumbers(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    camX: number,
    camY: number,
    damageNumbers: DamageNumber[]
  ) {
    damageNumbers.forEach((dn) => {
      const pos = worldToScreen(dn.x, dn.y, dn.z, camX, camY, w, h);
      const alpha = Math.min(1, dn.timer * 2.5);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = dn.isCrit ? 'bold 18px "Space Grotesk", sans-serif' : '600 14px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.lineWidth = 3;
      ctx.strokeText(dn.text, pos.x, pos.y);

      ctx.fillStyle = dn.color;
      ctx.fillText(dn.text, pos.x, pos.y);

      ctx.restore();
    });
  }

  private renderCinematicVignette(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    locked: boolean
  ) {
    const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.35, w / 2, h / 2, w * 0.8);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, locked ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.45)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }
}
