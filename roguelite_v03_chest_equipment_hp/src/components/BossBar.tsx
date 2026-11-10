import React from 'react';
import { Enemy } from '../types/game';

interface BossBarProps {
  boss: Enemy;
}

export const BossBar: React.FC<BossBarProps> = ({ boss }) => {
  const hpPct = Math.max(0, Math.min(100, (boss.hp / boss.maxHp) * 100));
  const isPhase2 = boss.phase === 2;

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 pointer-events-none z-20 flex flex-col items-center select-none animate-fadeIn">
      {/* Boss Identity */}
      <div className="flex items-center justify-between w-full mb-1 text-xs font-mono-combat">
        <div className="flex items-center gap-2">
          <span className="font-serif-title text-base font-bold text-neutral-100 tracking-wider">
            {boss.name}
          </span>
          <span className="text-neutral-400 font-normal">傀儡樂師 • 終焉指揮</span>
        </div>
        <span
          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest ${
            isPhase2
              ? 'bg-red-950/80 border border-red-700/80 text-red-300 animate-pulse'
              : 'bg-neutral-900 border border-neutral-700 text-neutral-300'
          }`}
        >
          {isPhase2 ? 'PHASE II : DESPERATION' : 'PHASE I : ADAGIO'}
        </span>
      </div>

      {/* Main Boss Health Gauge */}
      <div className="relative w-full h-4 bg-neutral-950/90 rounded border border-neutral-700/80 p-0.5 shadow-2xl backdrop-blur-md">
        <div
          className={`h-full transition-all duration-150 ease-out rounded-xs ${
            isPhase2
              ? 'bg-gradient-to-r from-red-600 via-rose-400 to-white'
              : 'bg-gradient-to-r from-neutral-500 via-neutral-300 to-white'
          }`}
          style={{ width: `${hpPct}%` }}
        />

        {/* 50% Phase Marker Notch */}
        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-neutral-950 z-10" />
      </div>

      {/* HP Numbers */}
      <div className="flex justify-between w-full text-[11px] font-mono-combat text-neutral-400 mt-1">
        <span>HP {Math.max(0, boss.hp)} / {boss.maxHp}</span>
        <span>{Math.round(hpPct)}%</span>
      </div>
    </div>
  );
};
