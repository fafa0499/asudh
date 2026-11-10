import React from 'react';
import { PassiveDefinition, Player } from '../types/game';
import { SKILL_CATALOG } from '../game/skills';
import { Shield, Sparkles, Swords } from 'lucide-react';

interface HUDProps {
  player: Player;
  acquiredPassives: PassiveDefinition[];
  acquiredEquipment: PassiveDefinition[];
  equippedEquipmentIds: string[];
  onToggleEquipment: (id: string) => void;
}

export const HUD: React.FC<HUDProps> = ({
  player,
  acquiredPassives,
  acquiredEquipment,
  equippedEquipmentIds,
  onToggleEquipment,
}) => {
  const stats = player.stats;
  const hpPct = Math.max(0, Math.min(100, (stats.hp / stats.maxHp) * 100));
  const resPct = Math.max(0, Math.min(100, (stats.resonance / stats.maxResonance) * 100));

  const dodgeCdRatio = player.dodgeCooldownTimer > 0 
    ? player.dodgeCooldownTimer / stats.dodgeCooldown 
    : 0;


  // Skill slot helper (Q, E, R)
  const renderSkillSlot = (slot: 'q' | 'e' | 'r') => {
    const skillId = player.skills.equipped[slot];
    const skill = skillId ? SKILL_CATALOG[skillId] : null;
    const cd = player.skills.cooldowns[slot];
    const hasEnoughMp = skill ? stats.resonance >= skill.resonanceCost : false;
    const isReady = skill && cd <= 0 && hasEnoughMp;

    return (
      <div className="flex flex-col items-center gap-1">
        <div
          className={`relative w-12 h-12 rounded-xl bg-neutral-900 border flex flex-col items-center justify-center overflow-hidden shadow-inner transition-colors ${
            !skill
              ? 'border-neutral-800 text-neutral-600'
              : isReady
              ? 'border-neutral-500 text-neutral-100 ring-1 ring-neutral-400/20'
              : 'border-neutral-800 text-neutral-500'
          }`}
        >
          <span className="text-[10px] text-neutral-400 font-mono-combat font-bold">
            {slot.toUpperCase()}
          </span>
          <span className="font-serif-title text-[11px] font-bold truncate max-w-[44px]">
            {skill ? skill.nameZh.slice(0, 4) : '空槽'}
          </span>
          {skill && (
            <span className="text-[8.5px] text-neutral-400 font-mono-combat">
              {skill.resonanceCost} MP
            </span>
          )}

          {/* Cooldown Overlay */}
          {cd > 0 && (
            <div className="absolute inset-0 bg-neutral-950/85 flex items-center justify-center text-xs font-mono-combat text-neutral-200 font-bold">
              {cd.toFixed(1)}s
            </div>
          )}
        </div>
        <span className="text-[10px] text-neutral-400 font-mono-combat">
          {skill ? skill.nameZh : '未裝備'}
        </span>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-6 text-neutral-100 z-10 select-none">
      {/* Top Header Row: Simplified Left-only Status Bar (Right side removed entirely) */}
      <div className="flex justify-between items-start gap-4">
        {/* Left: Player Core Status Gauge (HP, MP, Character Stats) */}
        <div className="pointer-events-auto flex flex-col gap-2 bg-neutral-950/80 backdrop-blur-md border border-neutral-800/80 p-3.5 rounded-xl shadow-2xl max-w-sm w-full">
          {/* HP Bar */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-mono-combat">
              <span className="text-neutral-400 flex items-center gap-1 font-semibold">
                HP
                {stats.barrier > 0 && (
                  <span className="text-sky-300 font-medium flex items-center text-[10px]">
                    <Shield className="w-2.5 h-2.5 mr-0.5 inline" />+{stats.barrier}
                  </span>
                )}
              </span>
              <span className="text-neutral-200 font-bold">
                {Math.round(stats.hp)} / {stats.maxHp}
              </span>
            </div>
            <div className="relative w-full h-3 bg-neutral-900 rounded-sm overflow-hidden border border-neutral-800">
              <div
                className="h-full bg-gradient-to-r from-neutral-300 to-white transition-all duration-150 ease-out"
                style={{ width: `${hpPct}%` }}
              />
              {stats.barrier > 0 && (
                <div
                  className="absolute top-0 right-0 h-full bg-sky-400/50 transition-all duration-150"
                  style={{ width: `${Math.min(100, (stats.barrier / stats.maxHp) * 100)}%` }}
                />
              )}
            </div>
          </div>

          {/* MP / Resonance Bar */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-mono-combat">
              <span className="text-neutral-400 flex items-center gap-1 font-semibold">
                <Sparkles className="w-3 h-3 text-neutral-300" />
                MP (共鳴值)
              </span>
              <span className="text-neutral-300">
                {Math.round(stats.resonance)} / {stats.maxResonance}
              </span>
            </div>
            <div className="w-full h-2 bg-neutral-900 rounded-sm overflow-hidden border border-neutral-800">
              <div
                className="h-full bg-gradient-to-r from-neutral-600 via-neutral-300 to-white transition-all duration-150 ease-out"
                style={{ width: `${resPct}%` }}
              />
            </div>
          </div>

          {/* Character 6 Core Stats Grid: DEF, ATK, CRIT Rate, CRIT DMG, Move Speed, Dodge Rate */}
          <div className="grid grid-cols-3 gap-x-2 gap-y-1.5 pt-2 border-t border-neutral-800/60 text-[10.5px] font-mono-combat text-neutral-400">
            {/* 1. 防禦力 (DEF) */}
            <div className="flex items-center justify-between bg-neutral-900/60 px-2 py-1 rounded border border-neutral-800/80">
              <span className="text-neutral-400">防禦 (DEF)</span>
              <strong className="text-neutral-100 font-bold">{Math.round(stats.defense || 0)}</strong>
            </div>

            {/* 2. 攻擊力 (ATK) */}
            <div className="flex items-center justify-between bg-neutral-900/60 px-2 py-1 rounded border border-neutral-800/80">
              <span className="text-neutral-400">攻擊 (ATK)</span>
              <strong className="text-neutral-100 font-bold">{Math.round(stats.baseDamage)}</strong>
            </div>

            {/* 3. 暴擊率 (CRIT Rate) */}
            <div className="flex items-center justify-between bg-neutral-900/60 px-2 py-1 rounded border border-neutral-800/80">
              <span className="text-neutral-400">暴擊率</span>
              <strong className="text-amber-200 font-bold">{Math.round(stats.critRate * 100)}%</strong>
            </div>

            {/* 4. 暴擊傷害倍率 (CRIT DMG) */}
            <div className="flex items-center justify-between bg-neutral-900/60 px-2 py-1 rounded border border-neutral-800/80">
              <span className="text-neutral-400">暴傷倍率</span>
              <strong className="text-amber-200 font-bold">{stats.critDamage.toFixed(2)}x</strong>
            </div>

            {/* 5. 移動速度 (Move Speed) */}
            <div className="flex items-center justify-between bg-neutral-900/60 px-2 py-1 rounded border border-neutral-800/80">
              <span className="text-neutral-400">移速 (SPD)</span>
              <strong className="text-neutral-100 font-bold">{Math.round(stats.speed)}</strong>
            </div>

            {/* 6. 閃避機率 (Dodge Rate) */}
            <div className="flex items-center justify-between bg-neutral-900/60 px-2 py-1 rounded border border-neutral-800/80">
              <span className="text-neutral-400">閃避率</span>
              <strong className="text-sky-200 font-bold">{Math.round((stats.dodgeRate || 0) * 100)}%</strong>
            </div>
          </div>

        </div>

        {/* Right side is intentionally completely empty */}
        <div />
      </div>

      {/* Left equipment rail: chest loot is managed and inspected here. */}
      <div className="pointer-events-auto absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 max-w-40">
        <div className="text-[10px] tracking-widest text-neutral-400 font-mono-combat">裝備</div>
        <div className="flex flex-col gap-1">
          {acquiredEquipment.length === 0 && <div className="text-[10px] text-neutral-600">尚無裝備</div>}
          {acquiredEquipment.map((item) => {
            const isEquipped = equippedEquipmentIds.includes(item.id);
            return (
              <button type="button" key={item.id} title={`${item.nameZh}：${item.description}`} onClick={() => onToggleEquipment(item.id)} className={`w-36 min-h-10 rounded-lg border px-2 py-1 text-left shadow-lg ${isEquipped ? 'bg-neutral-900/95 border-amber-300/70 text-amber-100' : 'bg-neutral-950/80 border-neutral-800 text-neutral-400 hover:border-neutral-500'}`}>
                <span className="block text-[10px] font-semibold">{item.nameZh}</span>
                <span className="block text-[9px] opacity-70">{isEquipped ? '已裝備 · 點擊卸下' : '未裝備 · 點擊裝備'}</span>
              </button>
            );
          })}
        </div>
        <div className="text-[9px] text-neutral-600">裝備上限 3 件</div>
      </div>

      {/* Acquired passive list at bottom-left; hover for full effect description. */}
      {acquiredPassives.length > 0 && (
        <div className="pointer-events-auto absolute left-4 bottom-4 flex flex-col gap-1 max-w-56">
          <div className="text-[10px] tracking-widest text-neutral-400 font-mono-combat">已取得被動</div>
          <div className="flex flex-wrap gap-1">
            {acquiredPassives.map((p) => (
              <span key={p.id} title={`${p.nameZh}：${p.description}`} className="text-[10px] px-2 py-1 rounded bg-neutral-950/90 border border-neutral-700 text-amber-100 cursor-help">{p.nameZh}</span>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Center: Attack Module & Skills Loadout Bar */}
      <div className="pointer-events-auto self-center flex flex-col items-center gap-1.5">
        {/* Dedicated Attack Combo Modifications Prompt (攻擊動作變化提示) */}
        {(stats.step2ReplacedWithSpin ||
          stats.step3ReplacedWithThrust ||
          stats.shockwaveOnHeavy ||
          stats.dashThrustOnDodge) && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-neutral-950/90 border border-neutral-700/80 text-[10px] font-mono-combat text-neutral-300 shadow-xl backdrop-blur-md">
            <span className="text-neutral-400 font-semibold flex items-center gap-1">
              <Swords className="w-3 h-3 text-neutral-300" />
              招式模組變化:
            </span>
            {stats.step2ReplacedWithSpin && (
              <span className="px-1.5 py-0.5 rounded bg-neutral-900 text-sky-200 border border-sky-400/40 font-mono-combat">
                二段 • 雙刃旋風 (替換)
              </span>
            )}
            {stats.step3ReplacedWithThrust && (
              <span className="px-1.5 py-0.5 rounded bg-neutral-900 text-sky-200 border border-sky-400/40 font-mono-combat">
                三段 • 貫穿音刺 (替換)
              </span>
            )}
            {stats.shockwaveOnHeavy && (
              <span className="px-1.5 py-0.5 rounded bg-neutral-900 text-amber-200 border border-amber-400/40 font-mono-combat">
                三段 • 弦刃衝擊波 (追加)
              </span>
            )}
            {stats.dashThrustOnDodge && (
              <span className="px-1.5 py-0.5 rounded bg-neutral-900 text-emerald-200 border border-emerald-400/40 font-mono-combat">
                閃避 • 突刺突進 (追加)
              </span>
            )}
          </div>
        )}

        {/* Combat Action Bar */}
        <div className="flex items-center gap-3 bg-neutral-950/85 backdrop-blur-md border border-neutral-800/90 px-4 py-2.5 rounded-2xl shadow-2xl">
          {/* Dash / Dodge Box */}
          <div className="flex flex-col items-center gap-1">
            <div className="relative w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-700 flex flex-col items-center justify-center text-neutral-200 overflow-hidden shadow-inner">
              <span className="font-serif-title text-xs font-bold text-neutral-100">閃避</span>
              {dodgeCdRatio > 0 && (
                <div
                  className="absolute inset-0 bg-neutral-950/75 flex items-center justify-center text-xs font-mono-combat text-neutral-300"
                  style={{ clipPath: `inset(${100 - dodgeCdRatio * 100}% 0 0 0)` }}
                />
              )}
            </div>
          </div>

          <div className="w-px h-8 bg-neutral-800 mx-1" />

          {/* Q Slot */}
          {renderSkillSlot('q')}

          {/* E Slot */}
          {renderSkillSlot('e')}

          {/* R Slot */}
          {renderSkillSlot('r')}
        </div>
      </div>
    </div>
  );
};
