import React from 'react';
import { RewardItem } from '../types/game';
import {
  Activity,
  Check,
  Flame,
  Heart,
  Shield,
  Sparkles,
  Wind,
  Zap,
} from 'lucide-react';

interface RewardModalProps {
  rewards: RewardItem[];
  onSelect: (reward: RewardItem) => void;
  roomDepth: number;
  onClose: () => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Activity: <Activity className="w-6 h-6 text-neutral-100" />,
  Zap: <Zap className="w-6 h-6 text-amber-300" />,
  Wind: <Wind className="w-6 h-6 text-neutral-200" />,
  Sparkles: <Sparkles className="w-6 h-6 text-sky-200" />,
  Shield: <Shield className="w-6 h-6 text-sky-300" />,
  Heart: <Heart className="w-6 h-6 text-rose-300" />,
  Flame: <Flame className="w-6 h-6 text-rose-400" />,
};

export const RewardModal: React.FC<RewardModalProps> = ({
  rewards,
  onSelect,
  roomDepth,
  onClose,
}) => {
  return (
    <div className="absolute inset-0 bg-neutral-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 z-30 select-none animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-8">
        <span className="text-xs font-mono-combat text-neutral-400 tracking-widest uppercase mb-1">
          CHAMBER DEPTH {String(roomDepth).padStart(2, '0')} • VICTORY
        </span>
        <h2 className="font-serif-title text-2xl md:text-3xl font-bold text-neutral-100 tracking-wider">
          戰利諧波 • 選擇獎勵
        </h2>
        <p className="text-neutral-400 text-xs md:text-sm mt-1 max-w-lg">
          擊破虛空殘影汲取的戰鬥精華。請選擇一項以構建你的戰鬥模組。
        </p>
      </div>

      <button onClick={onClose} className="absolute top-6 right-6 px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-300 text-xs hover:bg-neutral-800">稍後再選</button>

      {/* Rewards Grid (Distinct Categories) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
        {rewards.map((r) => {
          const isSkill = r.category === 'skill';
          const isPassive = r.category === 'passive';
          const isStat = r.category === 'stat';
          const isEquipment = r.category === 'equipment';

          return (
            <div
              key={r.id}
              onClick={() => onSelect(r)}
              className={`group cursor-pointer relative bg-gradient-to-b from-neutral-900/90 to-neutral-950/95 border rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1.5 hover:shadow-2xl ${
                isSkill
                  ? 'border-rose-400/80 hover:border-rose-300 ring-1 ring-rose-400/20'
                  : isEquipment
                  ? 'border-amber-300/80 hover:border-amber-200 ring-1 ring-amber-300/20'
                  : isPassive
                  ? 'border-amber-400/80 hover:border-amber-300 ring-1 ring-amber-400/20'
                  : 'border-neutral-700 hover:border-neutral-400'
              }`}
            >
              <div>
                {/* Category & Icon */}
                <div className="flex justify-between items-center mb-4">
                  <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 group-hover:scale-110 transition-transform">
                    {ICON_MAP[r.icon] || <Sparkles className="w-6 h-6 text-neutral-200" />}
                  </div>
                  <span
                    className={`text-[10px] font-mono-combat px-2.5 py-1 rounded-full uppercase tracking-wider font-bold ${
                      isSkill
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : isEquipment || isPassive
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-neutral-800 text-neutral-200 border border-neutral-700'
                    }`}
                  >
                    {isSkill ? '主動技能' : isEquipment ? '裝備' : isPassive ? '攻擊被動' : '基礎能力'}
                  </span>
                </div>

                <div className="text-[11px] font-mono-combat text-neutral-400 tracking-wider mb-0.5">
                  {r.synergyTag}
                </div>
                <h3 className="font-serif-title text-lg font-bold text-neutral-100 group-hover:text-white transition-colors">
                  {r.nameZh}
                </h3>
                <div className="text-xs font-mono-combat text-neutral-400 mb-3 italic">
                  {r.title}
                </div>

                <p className="text-neutral-300 text-xs md:text-sm leading-relaxed border-t border-neutral-800/80 pt-3">
                  {r.description}
                </p>
              </div>

              {/* Action Button */}
              <button
                type="button"
                className="mt-6 w-full py-2.5 px-4 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-200 font-mono-combat text-xs font-semibold group-hover:bg-neutral-100 group-hover:text-neutral-950 group-hover:border-white transition-all flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                獲取此獎勵 (Select)
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
