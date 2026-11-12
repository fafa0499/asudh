import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from '../game/engine';
import { GameRenderer, screenToWorld } from '../game/renderer';
import { soundManager } from '../audio/soundManager';
import { HUD } from './HUD';
import { BossBar } from './BossBar';
import { SkillReplaceModal } from './SkillReplaceModal';
import { RewardModal } from './RewardModal';
import { PauseModal } from './PauseModal';
import { ControlsGuideModal } from './ControlsGuideModal';
import { GameOverModal } from './GameOverModal';
import { ShakeLevel } from '../types/game';
import { PASSIVE_CATALOG } from '../game/passives';
import { SKILL_CATALOG } from '../game/skills';

export const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const rendererRef = useRef<GameRenderer>(new GameRenderer());
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  // UI state synchronization
  const [, setFrameTick] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => localStorage.getItem('echoes_of_cinder_muted') === 'true');
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isVictory, setIsVictory] = useState<boolean>(false);
  const [shakeLevel, setShakeLevel] = useState<ShakeLevel>(() => (localStorage.getItem('echoes_of_cinder_shake') as ShakeLevel) || 'low');
  const [inGame, setInGame] = useState<boolean>(false);
  const [hasSave, setHasSave] = useState<boolean>(() => Boolean(localStorage.getItem('echoes_of_cinder_resume_v1')));
  const [showMenuOptions, setShowMenuOptions] = useState<boolean>(false);

  // Initialize engine once
  if (!engineRef.current) {
    engineRef.current = new GameEngine();
    engineRef.current.onShake = (amount: number) => {
      rendererRef.current.triggerShake(amount);
    };
  }

  const engine = engineRef.current;

  // Handle Audio Init on first user gesture
  const initAudio = useCallback(() => {
    soundManager.init();
    soundManager.resume();
  }, []);

  const handleToggleMute = useCallback(() => {
    initAudio();
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
    localStorage.setItem('echoes_of_cinder_muted', String(muted));
  }, [initAudio]);

  const handlePause = useCallback(() => {
    if (engine) {
      engine.isPaused = !engine.isPaused;
      setIsPaused(engine.isPaused);
    }
  }, [engine]);

  const handleRestart = useCallback(() => {
    if (engine) {
      engine.restartGame();
      setIsGameOver(false);
      setIsVictory(false);
      setIsPaused(false);
    }
  }, [engine]);

  const handleChangeShakeLevel = useCallback((level: ShakeLevel) => {
    setShakeLevel(level);
    localStorage.setItem('echoes_of_cinder_shake', level);
    rendererRef.current.shakeLevel = level;
  }, []);



  // Main Render & Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let uiUpdateAccumulator = 0;

    const loop = (currentTime: number) => {
      const dt = Math.min(0.064, (currentTime - lastTimeRef.current) / 1000);
      lastTimeRef.current = currentTime;

      const width = canvas.width;
      const height = canvas.height;

      // Keep the game frozen behind the main menu.
      if (!inGame) {
        requestRef.current = requestAnimationFrame(loop);
        return;
      }
      // Update engine physics & AI
      engine.update(dt);
      rendererRef.current.updateShake(dt);

      // Render 2.5D Oblique frame
      rendererRef.current.render(
        ctx,
        width,
        height,
        engine.camX,
        engine.camY,
        engine.currentRoom,
        engine.player,
        engine.enemies,
        engine.projectiles,
        engine.slashes,
        engine.telegraphs,
        engine.particles,
        engine.damageNumbers,
        engine.roomLocked,
        engine.ambientParticles
      );

      // Sync React UI state at ~15fps
      uiUpdateAccumulator += dt;
      if (uiUpdateAccumulator > 0.06) {
        uiUpdateAccumulator = 0;
        setFrameTick((prev) => prev + 1);

        if (engine.isGameOver !== isGameOver) {
          setIsGameOver(engine.isGameOver);
        }
        if (engine.isVictory !== isVictory) {
          setIsVictory(engine.isVictory);
        }
      }

      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [engine, isGameOver, isVictory, inGame]);

  // Resume save: keep the complete serializable run state in this browser profile.
  const saveRun = useCallback(() => {
    if (!inGame || engine.isGameOver || engine.isVictory) return;
    try {
      const snapshot = JSON.parse(JSON.stringify(engine, (key, value) => typeof value === 'function' ? undefined : value));
      snapshot.acquiredPassives = engine.acquiredPassives.map((item) => item.id);
      snapshot.acquiredEquipment = engine.acquiredEquipment.map((item) => item.id);
      localStorage.setItem('echoes_of_cinder_resume_v1', JSON.stringify({ version: 1, savedAt: Date.now(), snapshot }));
      setHasSave(true);
    } catch (error) { console.warn('Resume save failed:', error); }
  }, [engine, inGame]);

  const loadRun = useCallback(() => {
    try {
      const raw = localStorage.getItem('echoes_of_cinder_resume_v1');
      if (!raw) return false;
      const payload = JSON.parse(raw);
      if (payload.version !== 1 || !payload.snapshot) return false;
      const snapshot = payload.snapshot;
      Object.assign(engine, snapshot);
      engine.acquiredPassives = (snapshot.acquiredPassives || []).map((id: string) => PASSIVE_CATALOG[id]).filter(Boolean);
      engine.acquiredEquipment = (snapshot.acquiredEquipment || []).map((id: string) => {
        const base = PASSIVE_CATALOG[id.split('__copy_')[0]];
        return base ? { ...base, id } : null;
      }).filter(Boolean);
      const savedRewards = snapshot.pendingRewards || [];
      engine.pendingRewards = savedRewards.map((item: any) => {
        if (item.category === 'passive') {
          const passiveId = item.passive?.id;
          return passiveId && PASSIVE_CATALOG[passiveId] ? { ...item, passive: PASSIVE_CATALOG[passiveId] } : null;
        }
        if (item.category === 'skill') {
          const skillId = item.skill?.id;
          return skillId ? { ...item, skill: SKILL_CATALOG[skillId] || item.skill } : item;
        }
        if (item.category === 'equipment') {
          const equipmentId = item.equipment?.id;
          const base = equipmentId ? PASSIVE_CATALOG[equipmentId.split('__copy_')[0]] : null;
          return base ? { ...item, equipment: { ...base, id: equipmentId } } : null;
        }
        if (item.category === 'stat') {
          const apply = (stats: any) => {
            switch (item.id) {
              case 'stat_atk_boost': stats.baseDamage = Math.round(stats.baseDamage * 1.3); break;
              case 'stat_crit_boost': stats.critRate = Math.min(0.85, stats.critRate + 0.18); stats.critDamage += 0.4; break;
              case 'stat_speed_agility': stats.speed = Math.round(stats.speed * 1.25); stats.dodgeCooldown = Math.max(0.45, stats.dodgeCooldown * 0.7); break;
              case 'stat_barrier_shield': stats.barrier = Math.max(stats.barrier, 50); break;
              case 'stat_def_boost': stats.defense += 16; stats.dodgeRate = Math.min(0.6, stats.dodgeRate + 0.06); break;
              case 'green_gate_vitality': stats.maxHp += 30; break;
            }
          };
          return { ...item, apply };
        }
        return null;
      }).filter(Boolean);
      if (engine.currentRoom.pickups?.length && engine.pendingRewards?.length) engine.currentRoom.pickups[0].reward = engine.pendingRewards[0];
      engine.onShake = (amount: number) => rendererRef.current.triggerShake(amount);
      rendererRef.current.shakeLevel = shakeLevel;
      engine.isPaused = false;
      setIsGameOver(Boolean(engine.isGameOver));
      setIsVictory(Boolean(engine.isVictory));
      setInGame(true);
      return true;
    } catch (error) { console.warn('Resume load failed:', error); return false; }
  }, [engine, shakeLevel]);

  useEffect(() => {
    if (isGameOver || isVictory) {
      localStorage.removeItem('echoes_of_cinder_resume_v1');
      setHasSave(false);
    }
  }, [isGameOver, isVictory]);

  useEffect(() => {
    if (!inGame) return;
    const timer = window.setInterval(saveRun, 1500);
    const onExit = () => saveRun();
    window.addEventListener('beforeunload', onExit);
    document.addEventListener('visibilitychange', onExit);
    return () => { window.clearInterval(timer); window.removeEventListener('beforeunload', onExit); document.removeEventListener('visibilitychange', onExit); saveRun(); };
  }, [inGame, saveRun]);

  // Window Resize & Mouse/Keyboard Event Listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const mouseScreenX = (e.clientX - rect.left) * dpr;
      const mouseScreenY = (e.clientY - rect.top) * dpr;

      engine.mouseScreenPos = { x: mouseScreenX, y: mouseScreenY };

      engine.mouseWorldPos = screenToWorld(
        mouseScreenX,
        mouseScreenY,
        engine.camX,
        engine.camY,
        canvas.width,
        canvas.height
      );
    };

    const handleMouseDown = (e: MouseEvent) => {
      initAudio();
      if (e.button === 0) {
        engine.mouseLeftDown = true;
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        engine.mouseLeftDown = false;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      initAudio();
      engine.keys[e.code] = true;

      if (e.code === 'Space') {
        e.preventDefault();
        engine.performDodge();
      } else if (e.code === 'KeyF' && !e.repeat) {
        if (!engine.isPaused && !engine.rewardObjectActivated && !engine.pendingSkillReplace && !engine.pendingBranchConfirmation && !engine.isVictory) {
          engine.interactPressed = true;
        }
      } else if (e.code === 'KeyQ') {
        engine.castSkill('q');
      } else if (e.code === 'KeyE') {
        engine.castSkill('e');
      } else if (e.code === 'KeyR') {
        engine.castSkill('r');
      } else if (e.code === 'Escape') {
        handlePause();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      engine.keys[e.code] = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [engine, handlePause, initAudio]);

  const startNewGame = () => {
    if (hasSave && !window.confirm('開始新遊戲會覆蓋目前的續玩進度，確定要開始嗎？')) return;
    engine.restartGame();
    localStorage.removeItem('echoes_of_cinder_resume_v1');
    setHasSave(false); setIsGameOver(false); setIsVictory(false); setIsPaused(false); setInGame(true);
  };

  const boss = engine.enemies.find((e) => e.type === 'boss_maestro' && !e.isDead);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-neutral-950 font-sans cursor-crosshair">
      {/* 2.5D Oblique Game Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {!inGame && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-neutral-950/95 p-6">
          <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900/95 p-8 text-center shadow-2xl">
            <div className="mb-3 text-[10px] tracking-[0.35em] text-neutral-500">ECHOES OF CINDER</div>
            <h1 className="mb-2 font-serif-title text-4xl font-bold text-neutral-100">灰燼迴響</h1>
            <p className="mb-8 text-xs tracking-widest text-neutral-500">A HAND-DRAWN ACTION ROGUELIKE</p>
            <div className="flex flex-col gap-3">
              <button onClick={startNewGame} className="rounded-xl bg-neutral-100 px-5 py-3 font-semibold text-neutral-950 hover:bg-white">開始新遊戲</button>
              <button disabled={!hasSave} onClick={() => { if (!loadRun()) { setHasSave(false); alert('存檔無法讀取，請開始新遊戲。'); } }} className="rounded-xl border border-neutral-700 px-5 py-3 text-neutral-200 enabled:hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-35">繼續遊戲</button>
              <button onClick={() => setShowMenuOptions((v) => !v)} className="rounded-xl border border-neutral-800 px-5 py-3 text-neutral-400 hover:bg-neutral-800">選項</button>
              {showMenuOptions && <div className="mt-1 rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-left">
                <div className="mb-3 flex items-center justify-between text-sm text-neutral-300"><span>音效</span><button onClick={handleToggleMute} className="rounded-lg border border-neutral-700 px-3 py-1 text-xs">{isMuted ? '已靜音' : '開啟'}</button></div>
                <div className="text-xs text-neutral-400">螢幕震動</div><div className="mt-2 grid grid-cols-2 gap-2">{(['off','low','medium','high'] as ShakeLevel[]).map((level) => <button key={level} onClick={() => handleChangeShakeLevel(level)} className={`rounded-lg border px-2 py-2 text-xs ${shakeLevel === level ? 'border-neutral-300 bg-neutral-200 text-neutral-950' : 'border-neutral-800 text-neutral-400'}`}>{({off:'關閉',low:'輕微',medium:'普通',high:'強烈'})[level]}</button>)}</div>
              </div>}
            </div>
            <p className="mt-6 text-[10px] text-neutral-600">進度儲存在目前瀏覽器與裝置中</p>
          </div>
        </div>
      )}


      {/* Main Simplified HUD (HP, MP, Character Stats, Attack Combo & Skills) */}
      {inGame && <HUD
        player={engine.player}
        acquiredPassives={engine.acquiredPassives}
        acquiredEquipment={engine.acquiredEquipment}
        equippedEquipmentIds={engine.equippedEquipmentIds}
        onToggleEquipment={(id) => engine.toggleEquipment(id)}
        currentDepth={engine.currentDepth}
        currentWave={engine.currentWave}
        totalWaves={engine.totalWaves}
      />}

      {/* Boss Health Bar */}
      {inGame && boss && <BossBar boss={boss} />}

      {/* Active Skill 1-Time Slot Replacement Modal (Triggered when 3 slots are full upon acquiring new skill) */}
      {inGame && engine.pendingSkillReplace && (
        <SkillReplaceModal
          pending={engine.pendingSkillReplace}
          player={engine.player}
          onReplace={(slot) => {
            engine.replaceEquippedSkill(slot);
            setFrameTick((v) => v + 1);
          }}
          onCancel={() => {
            engine.cancelSkillReplace();
            setFrameTick((v) => v + 1);
          }}
        />
      )}

      {/* Reward choices only open after the player approaches the physical altar and presses F. */}
      {inGame && engine.rewardObjectActivated && engine.pendingRewards && !engine.pendingSkillReplace && (
        <RewardModal
          rewards={engine.pendingRewards}
          roomDepth={engine.currentDepth}
          onSelect={(reward) => {
            engine.selectReward(reward);
            setFrameTick((v) => v + 1);
          }}
          onClose={() => {
            engine.rewardObjectActivated = false;
            setFrameTick((v) => v + 1);
          }}
        />
      )}

      {/* Door selection requires a separate confirmation before room transition. */}
      {inGame && engine.pendingBranchConfirmation && (
        <div className="absolute inset-0 z-45 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl border border-neutral-700 bg-neutral-900 p-7 text-center shadow-2xl">
            <div className="text-[10px] tracking-widest text-neutral-400 font-mono-combat mb-2">ROOM ENTRY CONFIRMATION</div>
            <h2 className="text-xl font-serif-title font-bold text-neutral-100 mb-3">即將進入：{engine.pendingBranchConfirmation.nameZh}</h2>
            <p className="text-sm text-neutral-400 mb-6">{engine.pendingBranchConfirmation.description}</p>
            <div className="flex gap-3">
              <button onClick={() => { engine.cancelBranchConfirmation(); setFrameTick((v) => v + 1); }} className="flex-1 rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-neutral-300 hover:bg-neutral-800">取消</button>
              <button onClick={() => { engine.confirmBranchSelection(); setFrameTick((v) => v + 1); }} className="flex-1 rounded-xl bg-neutral-100 px-4 py-3 text-sm font-bold text-neutral-950 hover:bg-white">確認進入</button>
            </div>
          </div>
        </div>
      )}

      {/* Pause & System Settings Modal (Contains Screen Shake and Volume Controls) */}
      {inGame && isPaused && (
        <PauseModal
          onResume={handlePause}
          onRestart={handleRestart}
          onOpenGuide={() => setShowGuide(true)}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          shakeLevel={shakeLevel}
          onChangeShakeLevel={handleChangeShakeLevel}
        />
      )}

      {/* Controls & Codex Guide Modal */}
      {inGame && showGuide && <ControlsGuideModal onClose={() => setShowGuide(false)} />}

      {/* Game Over / Victory Modal */}
      {inGame && (isGameOver || isVictory) && (
        <GameOverModal
          isVictory={isVictory}
          depth={engine.currentDepth}
          enemiesDefeated={engine.totalEnemiesDefeated}
          totalDamage={engine.totalDamageDealt}
          timeSeconds={engine.runTimeSeconds}
          acquiredPassives={engine.acquiredPassives}
          acquiredSkills={engine.player.skills.acquiredSkills}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
};
