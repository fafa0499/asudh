import React from 'react';
import { RoomBranchOption } from '../types/game';
import {
  Activity,
  ArrowRight,
  Crown,
  Flame,
  Heart,
  Shield,
  Sparkles,
  Star,
  Swords,
  Zap,
} from 'lucide-react';

interface RoomBranchModalProps {
  branches: RoomBranchOption[];
  onSelectBranch: (branch: RoomBranchOption) => void;
  currentDepth: number;
}

const TYPE_ICON_MAP: Record<string, React.ReactNode> = {
  normal: <Swords className="w-6 h-6 text-neutral-300" />,
  elite: <Flame className="w-6 h-6 text-rose-400" />,
  chest: <Sparkles className="w-6 h-6 text-sky-300" />,
  stat_upgrade: <Star className="w-6 h-6 text-amber-300" />,
  fountain: <Heart className="w-6 h-6 text-emerald-300" />,
  boss: <Crown className="w-6 h-6 text-amber-400 animate-pulse" />,
};

export const RoomBranchModal: React.FC<RoomBranchModalProps> = ({
  branches,
  onSelectBranch,
  currentDepth,
}) => {
  return (
    <div className="absolute inset-0 bg-neutral-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 z-35 select-none animate-fadeIn">
      {/* Title */}
      <div className="flex flex-col items-center text-center mb-8">
        <span className="text-xs font-mono-combat text-neutral-400 tracking-widest uppercase mb-1">
          CHAMBER CLEARED • EXPEDITION FORK
        </span>
        <h2 className="font-serif-title text-2xl md:text-3xl font-bold text-neutral-100 tracking-wider">
          分流之扉 • 選擇下一步冒險
        </h2>
        <p className="text-neutral-400 text-xs md:text-sm mt-1 max-w-md">
          前方的走廊在此分岔，命運取決於你的抉擇。請選擇下一個探索房間。
        </p>
      </div>

      {/* Branches List Grid */}
      <div className={`grid gap-6 max-w-4xl w-full ${branches.length === 1 ? 'grid-cols-1 max-w-md' : branches.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
        {branches.map((b) => {
          const isBoss = b.type === 'boss';
          const isElite = b.type === 'elite';
          const isSpecial = b.type === 'chest' || b.type === 'upgrade' || b.type === 'fountain';

          return (
            <div
              key={b.id}
              onClick={() => onSelectBranch(b)}
              className={`group cursor-pointer relative bg-gradient-to-b from-neutral-900/90 to-neutral-950/95 border rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1.5 hover:shadow-2xl ${
                isBoss
                  ? 'border-amber-400/90 ring-1 ring-amber-400/30'
                  : isElite
                  ? 'border-rose-500/80 hover:border-rose-400'
                  : b.type === 'fountain'
                  ? 'border-emerald-500/80 hover:border-emerald-300'
                  : isSpecial
                  ? 'border-sky-500/70 hover:border-sky-300'
                  : 'border-neutral-700 hover:border-neutral-400'
              }`}
            >
              <div>
                {/* Header Badge & Danger Rating */}
                <div className="flex justify-between items-center mb-3">
                  <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 group-hover:scale-110 transition-transform">
                    {TYPE_ICON_MAP[b.type] || <Swords className="w-6 h-6 text-neutral-300" />}
                  </div>

                  {/* Danger Stars */}
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-mono-combat text-neutral-400 uppercase">
                      危險度
                    </span>
                    <div className="flex gap-0.5 text-xs">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={
                            i < b.dangerLevel
                              ? isBoss || isElite
                                ? 'text-rose-400 font-bold'
                                : 'text-neutral-200'
                              : 'text-neutral-700'
                          }
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Room Names */}
                <span className="text-[11px] font-mono-combat text-neutral-400 tracking-wider">
                  深度 {currentDepth + 1}
                </span>
                <h3 className="font-serif-title text-lg font-bold text-neutral-100 group-hover:text-white transition-colors">
                  {b.nameZh}
                </h3>
                <div className="text-xs font-mono-combat text-neutral-400 mb-3 italic">
                  {b.name}
                </div>

                {/* Description */}
                <p className="text-neutral-300 text-xs leading-relaxed border-t border-neutral-800/80 pt-3 mb-3">
                  {b.description}
                </p>

                {/* Expected Reward Tendency */}
                <div className="bg-neutral-950/80 border border-neutral-800/80 p-2.5 rounded-lg text-[11px] font-mono-combat text-neutral-300">
                  <span className="text-neutral-400 block text-[10px] uppercase mb-0.5">
                    預期獎勵傾向：
                  </span>
                  <span className="text-neutral-200 font-medium">{b.rewardTypeDesc}</span>
                </div>
              </div>

              {/* Enter Button */}
              <button
                type="button"
                className="mt-6 w-full py-2.5 px-4 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-200 font-mono-combat text-xs font-semibold group-hover:bg-neutral-100 group-hover:text-neutral-950 group-hover:border-white transition-all flex items-center justify-center gap-2"
              >
                <span>踏入此房間 (Enter)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
