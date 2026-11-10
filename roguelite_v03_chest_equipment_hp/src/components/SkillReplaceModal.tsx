import React from 'react';
import { PendingSkillReplace, Player, SkillSlot } from '../types/game';
import { SKILL_CATALOG } from '../game/skills';
import { ArrowRightLeft, Sparkles, X } from 'lucide-react';

interface SkillReplaceModalProps {
  pending: PendingSkillReplace;
  player: Player;
  onReplace: (slot: SkillSlot) => void;
  onCancel: () => void;
}

export const SkillReplaceModal: React.FC<SkillReplaceModalProps> = ({
  pending,
  player,
  onReplace,
  onCancel,
}) => {
  const newSkill = pending.newSkill;
  const equipped = player.skills.equipped;

  const slots: SkillSlot[] = ['q', 'e', 'r'];

  return (
    <div className="absolute inset-0 bg-neutral-950/85 backdrop-blur-md flex flex-col items-center justify-center p-4 md:p-6 z-50 select-none animate-fadeIn">
      <div className="bg-neutral-900/95 border border-neutral-700/80 rounded-2xl p-6 md:p-8 max-w-2xl w-full flex flex-col items-center shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-2 text-xs font-mono-combat text-amber-300 tracking-wider mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>技能欄位已滿 • 裝備槽位替換</span>
        </div>
        <h2 className="font-serif-title text-2xl font-bold text-neutral-100 mb-2 text-center">
          選擇要替換的主動技能
        </h2>
        <p className="text-xs text-neutral-400 font-mono-combat text-center max-w-md mb-6">
          你的 3 個主動技能槽位已滿。請選擇一個目前已裝備的技能進行替換，被替換的舊技能會直接刪除，不會回到技能收藏。若取消，則不取得新技能並保留原配置。
        </p>

        {/* New Skill Banner */}
        <div className="w-full bg-neutral-950/90 border border-neutral-600/80 rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-center gap-4 shadow-lg">
          <div className="w-14 h-14 rounded-xl bg-purple-950/60 border border-purple-500/50 flex flex-col items-center justify-center text-purple-200 shrink-0">
            <span className="text-[10px] uppercase font-mono-combat text-purple-300 font-bold">NEW</span>
            <span className="font-serif-title text-xs font-bold text-neutral-100">
              {newSkill.nameZh.slice(0, 3)}
            </span>
          </div>
          <div className="flex-1 flex flex-col text-left">
            <div className="flex items-center justify-between">
              <span className="font-serif-title text-base font-bold text-neutral-100">
                {newSkill.nameZh}
              </span>
              <div className="flex items-center gap-2 text-[10px] font-mono-combat text-neutral-400">
                <span>消耗: <strong className="text-neutral-200">{newSkill.resonanceCost} MP</strong></span>
                <span>冷卻: <strong className="text-neutral-200">{newSkill.cooldown}s</strong></span>
              </div>
            </div>
            <p className="text-xs text-neutral-300 mt-1 font-mono-combat leading-relaxed">
              {newSkill.description}
            </p>
          </div>
        </div>

        {/* 3 Equipped Slots to Choose For Replacement */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mb-6">
          {slots.map((slot) => {
            const currentSkillId = equipped[slot];
            const currentSkill = currentSkillId ? SKILL_CATALOG[currentSkillId] : null;

            return (
              <div
                key={slot}
                className="bg-neutral-950/80 border border-neutral-800 hover:border-neutral-500 rounded-xl p-4 flex flex-col justify-between transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-neutral-800">
                    <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 text-[10px] font-mono-combat font-bold uppercase">
                      欄位 [{slot.toUpperCase()}]
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono-combat">
                      {currentSkill ? `${currentSkill.resonanceCost} MP` : '空'}
                    </span>
                  </div>

                  {currentSkill ? (
                    <>
                      <div className="font-serif-title text-sm font-bold text-neutral-200 mb-1">
                        {currentSkill.nameZh}
                      </div>
                      <p className="text-[11px] text-neutral-400 font-mono-combat leading-tight line-clamp-3">
                        {currentSkill.description}
                      </p>
                    </>
                  ) : (
                    <div className="text-xs text-neutral-400 italic py-4">空槽位</div>
                  )}
                </div>

                <button
                  onClick={() => onReplace(slot)}
                  className="mt-4 w-full py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-100 text-neutral-300 hover:text-neutral-950 font-mono-combat text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>替換 [{slot.toUpperCase()}] 欄位</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer cancel / keep button */}
        <div className="flex justify-center w-full">
          <button
            onClick={onCancel}
            className="py-2.5 px-6 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-neutral-100 font-mono-combat text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-md"
          >
            <X className="w-4 h-4 text-neutral-400" />
            <span>取消 (放棄更換，不取得此技能，維持原配置)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
