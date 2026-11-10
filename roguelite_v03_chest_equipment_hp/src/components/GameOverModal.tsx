import React from 'react';
import { PassiveDefinition } from '../types/game';
import { SKILL_CATALOG } from '../game/skills';
import { RotateCcw, Trophy, Skull } from 'lucide-react';

interface GameOverModalProps {
  isVictory: boolean;
  depth: number;
  enemiesDefeated: number;
  totalDamage: number;
  timeSeconds: number;
  acquiredPassives: PassiveDefinition[];
  acquiredSkills: string[];
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isVictory,
  depth,
  enemiesDefeated,
  totalDamage,
  timeSeconds,
  acquiredPassives,
  acquiredSkills,
  onRestart,
}) => {
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="absolute inset-0 bg-neutral-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 z-50 select-none animate-fadeIn">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 max-w-lg w-full flex flex-col items-center shadow-2xl">
        {/* Header Icon */}
        <div className="mb-3 p-4 rounded-full bg-neutral-950 border border-neutral-800">
          {isVictory ? (
            <Trophy className="w-8 h-8 text-neutral-100 animate-bounce" />
          ) : (
            <Skull className="w-8 h-8 text-neutral-400" />
          )}
        </div>

        <span className="text-[10px] font-mono-combat text-neutral-400 tracking-widest uppercase mb-1">
          {isVictory ? 'PERFECT CONCERTO • VICTORY' : 'SONG FADED • DEFEAT'}
        </span>
        <h2 className="font-serif-title text-2xl md:text-3xl font-bold text-neutral-100 mb-2 text-center">
          {isVictory ? '傀儡絕響 • 虛空破曉' : '殘燼熄滅 • 琴音歸寂'}
        </h2>
        <p className="text-xs text-neutral-400 text-center mb-6">
          {isVictory
            ? '你已成功擊破傀儡樂師，本輪冒險正式結束。'
            : '少女在無盡的黑白深處倒下，但殘響未止，準備好再次奏響旅程。'}
        </p>

        {/* Run Statistics Grid */}
        <div className="grid grid-cols-2 gap-3 w-full bg-neutral-950/80 p-4 rounded-xl border border-neutral-800 mb-6 font-mono-combat text-xs">
          <div>
            <div className="text-[10px] text-neutral-400 uppercase">探索深度 (Depth)</div>
            <div className="text-base font-bold text-neutral-100">{depth}</div>
          </div>
          <div>
            <div className="text-[10px] text-neutral-400 uppercase">擊敗敵人數 (Kills)</div>
            <div className="text-base font-bold text-neutral-100">{enemiesDefeated}</div>
          </div>
          <div>
            <div className="text-[10px] text-neutral-400 uppercase">累積傷害 (Total DMG)</div>
            <div className="text-base font-bold text-neutral-100">{totalDamage.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[10px] text-neutral-400 uppercase">存活時間 (Time)</div>
            <div className="text-base font-bold text-neutral-100">{formatTime(timeSeconds)}</div>
          </div>
        </div>

        {/* Build Review: Passives & Skills */}
        {(acquiredPassives.length > 0 || acquiredSkills.length > 0) && (
          <div className="w-full mb-6">
            <div className="text-[10px] font-mono-combat text-neutral-400 uppercase mb-2">
              本輪流派構築 (被動 {acquiredPassives.length} • 技能 {acquiredSkills.length})
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
              {acquiredPassives.map((p, idx) => (
                <span
                  key={`p_${p.id}_${idx}`}
                  className="text-[10px] font-mono-combat px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/80 text-amber-200"
                >
                  <strong>{p.nameZh}</strong>
                </span>
              ))}
              {acquiredSkills.map((sId, idx) => {
                const sk = SKILL_CATALOG[sId];
                if (!sk) return null;
                return (
                  <span
                    key={`s_${sId}_${idx}`}
                    className="text-[10px] font-mono-combat px-2 py-0.5 rounded bg-rose-950/60 border border-rose-800/80 text-rose-200"
                  >
                    <strong>[技] {sk.nameZh}</strong>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full font-mono-combat text-xs">


          <button
            onClick={onRestart}
            className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
              isVictory
                ? 'bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-neutral-200'
                : 'bg-neutral-100 hover:bg-white text-neutral-950'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            重燃殘燼 (Restart Run)
          </button>
        </div>
      </div>
    </div>
  );
};
