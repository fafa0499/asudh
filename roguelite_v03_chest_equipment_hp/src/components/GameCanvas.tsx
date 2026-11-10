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
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isVictory, setIsVictory] = useState<boolean>(false);
  const [shakeLevel, setShakeLevel] = useState<ShakeLevel>('low');

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
  }, [engine, isGameOver, isVictory]);

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

  const boss = engine.enemies.find((e) => e.type === 'boss_maestro' && !e.isDead);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-neutral-950 font-sans cursor-crosshair">
      {/* 2.5D Oblique Game Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* Main Simplified HUD (HP, MP, Character Stats, Attack Combo & Skills) */}
      <HUD
        player={engine.player}
        acquiredPassives={engine.acquiredPassives}
        acquiredEquipment={engine.acquiredEquipment}
        equippedEquipmentIds={engine.equippedEquipmentIds}
        onToggleEquipment={(id) => engine.toggleEquipment(id)}
      />

      {/* Boss Health Bar */}
      {boss && <BossBar boss={boss} />}

      {/* Active Skill 1-Time Slot Replacement Modal (Triggered when 3 slots are full upon acquiring new skill) */}
      {engine.pendingSkillReplace && (
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
      {engine.rewardObjectActivated && engine.pendingRewards && !engine.pendingSkillReplace && (
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
      {engine.pendingBranchConfirmation && (
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
      {isPaused && (
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
      {showGuide && <ControlsGuideModal onClose={() => setShowGuide(false)} />}

      {/* Game Over / Victory Modal */}
      {(isGameOver || isVictory) && (
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
