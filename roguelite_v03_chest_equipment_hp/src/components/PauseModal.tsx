import React from 'react';
import { Play, RotateCcw, Volume2, VolumeX, HelpCircle, Activity } from 'lucide-react';
import { ShakeLevel } from '../types/game';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onOpenGuide: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  shakeLevel: ShakeLevel;
  onChangeShakeLevel: (level: ShakeLevel) => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onOpenGuide,
  isMuted,
  onToggleMute,
  shakeLevel,
  onChangeShakeLevel,
}) => {
  const shakeOptions: { level: ShakeLevel; label: string; desc: string }[] = [
    { level: 'off', label: '關閉', desc: '完全不震動' },
    { level: 'low', label: '輕微 (預設)', desc: '僅少數重擊微震' },
    { level: 'medium', label: '普通', desc: '適度打擊回饋' },
    { level: 'high', label: '強烈', desc: '明顯震動效果' },
  ];

  return (
    <div className="absolute inset-0 bg-neutral-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 z-40 select-none animate-fadeIn">
      <div className="bg-neutral-900/95 border border-neutral-800 rounded-2xl p-6 md:p-8 max-w-md w-full flex flex-col items-center shadow-2xl">
        <span className="text-[10px] font-mono-combat text-neutral-400 tracking-widest uppercase mb-1">
          ECHOES OF CINDER • SYSTEM MENU
        </span>
        <h2 className="font-serif-title text-2xl font-bold text-neutral-100 mb-5">
          遊戲暫停 (PAUSED)
        </h2>

        {/* Screen Shake Control Section */}
        <div className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl p-3.5 mb-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-mono-combat text-neutral-300">
            <span className="flex items-center gap-1.5 text-neutral-200 font-semibold">
              <Activity className="w-3.5 h-3.5 text-neutral-400" />
              螢幕震動設定
            </span>
            <span className="text-[10px] text-neutral-400">集中強度管理</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
            {shakeOptions.map((opt) => {
              const active = shakeLevel === opt.level;
              return (
                <button
                  key={opt.level}
                  onClick={() => onChangeShakeLevel(opt.level)}
                  className={`py-1.5 px-2 rounded-lg text-center font-mono-combat transition-all cursor-pointer ${
                    active
                      ? 'bg-neutral-200 text-neutral-950 font-bold shadow'
                      : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 border border-neutral-800'
                  }`}
                >
                  <div className="text-[11px] leading-tight">{opt.label}</div>
                  <div className="text-[8.5px] opacity-75 truncate">{opt.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 w-full font-mono-combat text-xs">
          <button
            onClick={onResume}
            className="w-full py-2.5 px-4 rounded-xl bg-neutral-100 hover:bg-white text-neutral-950 font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            繼續遊戲 (Resume)
          </button>


          <button
            onClick={onOpenGuide}
            className="w-full py-2.5 px-4 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-sky-300" />
            操作指南 (Controls Guide)
          </button>

          <button
            onClick={onToggleMute}
            className="w-full py-2.5 px-4 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-300" />}
            {isMuted ? '解除靜音 (Unmute)' : '開啟靜音 (Mute Audio)'}
          </button>

          <button
            onClick={onRestart}
            className="w-full py-2.5 px-4 rounded-xl bg-neutral-950 hover:bg-red-950/60 border border-neutral-700 hover:border-red-700 text-neutral-300 hover:text-red-200 transition-colors flex items-center justify-center gap-2 mt-1 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            重新開始冒險 (Restart Run)
          </button>
        </div>

        <div className="text-[11px] text-neutral-500 mt-5 font-mono-combat text-center">
          提示：按鍵盤 <kbd className="px-1.5 py-0.5 bg-neutral-800 rounded border border-neutral-700 text-neutral-300">ESC</kbd> 隨時返回戰鬥
        </div>
      </div>
    </div>
  );
};
