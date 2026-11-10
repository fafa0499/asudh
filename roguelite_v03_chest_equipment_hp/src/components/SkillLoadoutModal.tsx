import React from 'react';
import { SkillDefinition, SkillInventory, SkillSlot } from '../types/game';
import { SKILL_CATALOG } from '../game/skills';
import {
  Activity,
  Flame,
  Shield,
  Sparkles,
  Wind,
  X,
  Zap,
  CheckCircle2,
} from 'lucide-react';

interface SkillLoadoutModalProps {
  inventory: SkillInventory;
  onEquip: (skillId: string, slot: SkillSlot) => void;
  onUnequip: (slot: SkillSlot) => void;
  onClose: () => void;
}

const SKILL_ICONS: Record<string, React.ReactNode> = {
  Zap: <Zap className="w-5 h-5 text-amber-300" />,
  Wind: <Wind className="w-5 h-5 text-sky-300" />,
  Activity: <Activity className="w-5 h-5 text-neutral-200" />,
  Sparkles: <Sparkles className="w-5 h-5 text-sky-200" />,
  Shield: <Shield className="w-5 h-5 text-sky-300" />,
  Flame: <Flame className="w-5 h-5 text-rose-400" />,
};

export const SkillLoadoutModal: React.FC<SkillLoadoutModalProps> = ({
  inventory,
  onEquip,
  onUnequip,
  onClose,
}) => {
  const [selectedSkillId, setSelectedSkillId] = React.useState<string | null>(
    inventory.acquiredSkills.length > 0 ? inventory.acquiredSkills[0] : null
  );

  const selectedSkill: SkillDefinition | null = selectedSkillId
    ? SKILL_CATALOG[selectedSkillId]
    : null;

  const SLOTS: SkillSlot[] = ['q', 'e', 'r'];

  return (
    <div className="absolute inset-0 bg-neutral-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 z-40 select-none animate-fadeIn">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 max-w-2xl w-full flex flex-col shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <span className="text-[10px] font-mono-combat text-neutral-400 tracking-widest uppercase">
            ACTIVE SKILLS CODEX & LOADOUT
          </span>
          <h2 className="font-serif-title text-2xl font-bold text-neutral-100">
            主動技能庫與戰鬥配置
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            從已收集的靈魂技能中，為 Q、E、R 槽位配置施放技能。
          </p>
        </div>

        {/* 3 Equipped Slots Display */}
        <div className="grid grid-cols-3 gap-3 mb-6 bg-neutral-950/90 p-4 rounded-xl border border-neutral-800">
          {SLOTS.map((slot) => {
            const equippedId = inventory.equipped[slot];
            const skill = equippedId ? SKILL_CATALOG[equippedId] : null;

            return (
              <div
                key={slot}
                className="flex flex-col items-center p-3 rounded-lg bg-neutral-900 border border-neutral-800"
              >
                <div className="flex justify-between w-full items-center mb-1 text-xs font-mono-combat">
                  <span className="font-bold text-neutral-300 uppercase px-1.5 py-0.5 rounded bg-neutral-800">
                    鍵位 [{slot.toUpperCase()}]
                  </span>
                  {skill && (
                    <button
                      onClick={() => onUnequip(slot)}
                      className="text-[10px] text-neutral-400 hover:text-red-400 transition-colors underline"
                    >
                      卸下
                    </button>
                  )}
                </div>

                {skill ? (
                  <div className="flex flex-col items-center text-center mt-1">
                    <div className="p-2 bg-neutral-950 rounded-lg border border-neutral-700 mb-1">
                      {SKILL_ICONS[skill.icon] || <Sparkles className="w-5 h-5" />}
                    </div>
                    <span className="font-serif-title text-xs font-bold text-neutral-100">
                      {skill.nameZh}
                    </span>
                    <span className="text-[10px] font-mono-combat text-neutral-400">
                      {skill.resonanceCost} MP • {skill.cooldown}s CD
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-neutral-500 py-3">
                    <span className="text-xs font-mono-combat">未裝備 (Empty)</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Collected Skills List & Details */}
        <div className="flex flex-col md:flex-row gap-4 border-t border-neutral-800 pt-4">
          {/* Left: Acquired Skills List */}
          <div className="flex-1 max-h-52 overflow-y-auto space-y-2 pr-1">
            <span className="text-[10px] font-mono-combat text-neutral-400 uppercase block mb-1">
              已解鎖技能收藏庫 ({inventory.acquiredSkills.length})
            </span>

            {inventory.acquiredSkills.length === 0 ? (
              <div className="p-4 rounded-xl bg-neutral-950/60 border border-dashed border-neutral-800 text-center text-xs text-neutral-400 font-mono-combat">
                目前尚未取得主動技能。探索「寶箱房」或完成「精英試煉」即可解鎖！
              </div>
            ) : (
              inventory.acquiredSkills.map((id) => {
                const s = SKILL_CATALOG[id];
                if (!s) return null;
                const isSelected = selectedSkillId === id;
                const isEquippedSlot = SLOTS.find((slot) => inventory.equipped[slot] === id);

                return (
                  <div
                    key={id}
                    onClick={() => setSelectedSkillId(id)}
                    className={`cursor-pointer p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-neutral-800 border-neutral-400'
                        : 'bg-neutral-950/80 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-neutral-900 rounded-lg">
                        {SKILL_ICONS[s.icon] || <Sparkles className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-serif-title text-xs font-bold text-neutral-100">
                          {s.nameZh}
                        </div>
                        <div className="text-[10px] font-mono-combat text-neutral-400">
                          {s.title}
                        </div>
                      </div>
                    </div>

                    {isEquippedSlot && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono-combat font-bold bg-neutral-800 text-neutral-200 border border-neutral-700">
                        已裝備 [{isEquippedSlot.toUpperCase()}]
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Selected Skill Detail & Equip Buttons */}
          <div className="w-full md:w-64 bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex flex-col justify-between">
            {selectedSkill ? (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-serif-title text-sm font-bold text-neutral-100">
                    {selectedSkill.nameZh}
                  </h4>
                  <span className="text-[10px] font-mono-combat text-neutral-400">
                    {selectedSkill.resonanceCost} MP
                  </span>
                </div>
                <div className="text-[11px] font-mono-combat text-neutral-400 mb-2">
                  冷卻: {selectedSkill.cooldown}s • 傷害: {Math.round(selectedSkill.damageMultiplier * 100)}%
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed mb-4">
                  {selectedSkill.description}
                </p>

                {/* Equip Slot Selector */}
                <div>
                  <span className="text-[10px] font-mono-combat text-neutral-400 block mb-1.5">
                    裝備至技能欄位：
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 font-mono-combat text-xs">
                    {SLOTS.map((slot) => {
                      const isAlreadyEquippedHere = inventory.equipped[slot] === selectedSkill.id;

                      return (
                        <button
                          key={slot}
                          onClick={() => onEquip(selectedSkill.id, slot)}
                          className={`py-1.5 px-2 rounded-lg font-bold border transition-colors ${
                            isAlreadyEquippedHere
                              ? 'bg-neutral-200 text-neutral-950 border-white'
                              : 'bg-neutral-900 text-neutral-200 border-neutral-700 hover:bg-neutral-800'
                          }`}
                        >
                          槽位 {slot.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-neutral-400 font-mono-combat">
                請在左側選擇技能以檢視詳情
              </div>
            )}
          </div>
        </div>

        {/* Done Button */}
        <button
          onClick={onClose}
          className="mt-6 w-full py-2.5 px-4 rounded-xl bg-neutral-100 hover:bg-white text-neutral-950 font-bold font-mono-combat text-xs transition-colors flex items-center justify-center gap-1.5"
        >
          <CheckCircle2 className="w-4 h-4" />
          完成配置 (Done)
        </button>
      </div>
    </div>
  );
};
