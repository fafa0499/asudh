import React from 'react';
import { X, MousePointer, Shield, Sparkles, Move, Zap, Swords, Compass } from 'lucide-react';

interface ControlsGuideModalProps {
  onClose: () => void;
}

export const ControlsGuideModal: React.FC<ControlsGuideModalProps> = ({ onClose }) => {
  return (
    <div className="absolute inset-0 bg-neutral-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 z-40 select-none animate-fadeIn">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 max-w-xl w-full flex flex-col shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <span className="text-[10px] font-mono-combat text-neutral-400 tracking-widest uppercase mb-1">
          OPERATIONAL CODEX & ADVENTURE GUIDE
        </span>
        <h2 className="font-serif-title text-2xl font-bold text-neutral-100 mb-4">
          操作指南與冒險法則
        </h2>

        <div className="flex flex-col gap-3 font-mono-combat text-xs text-neutral-300 divide-y divide-neutral-800/80">
          {/* Movement */}
          <div className="flex items-center justify-between py-2">
            <span className="flex items-center gap-2 text-neutral-200">
              <Move className="w-4 h-4 text-neutral-400" />
              螢幕直覺移動 (W上 / S下 / A左 / D右)
            </span>
            <div className="flex gap-1">
              {['W', 'A', 'S', 'D'].map((k) => (
                <kbd key={k} className="px-2 py-1 bg-neutral-950 border border-neutral-700 rounded text-neutral-200 font-bold">
                  {k}
                </kbd>
              ))}
            </div>
          </div>

          {/* Aim & Attack */}
          <div className="flex items-center justify-between py-2">
            <span className="flex items-center gap-2 text-neutral-200">
              <MousePointer className="w-4 h-4 text-neutral-400" />
              朝向瞄準 / 雙刀三段普通攻擊
            </span>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">滑鼠指向</span>
              <kbd className="px-2.5 py-1 bg-neutral-950 border border-neutral-700 rounded text-neutral-200 font-bold">
                滑鼠左鍵
              </kbd>
            </div>
          </div>

          {/* Dodge */}
          <div className="flex items-center justify-between py-2">
            <span className="flex items-center gap-2 text-neutral-200">
              <Shield className="w-4 h-4 text-sky-300" />
              無敵閃避 (Dash & I-Frames)
            </span>
            <kbd className="px-4 py-1 bg-neutral-950 border border-neutral-700 rounded text-neutral-200 font-bold">
              空白鍵 (SPACE)
            </kbd>
          </div>

          {/* Interaction */}
          <div className="flex items-center justify-between py-2">
            <span className="flex items-center gap-2 text-neutral-200">
              <Compass className="w-4 h-4 text-emerald-400" />
              場景互動 / 拾取獎勵 / 踏入門扉
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400">靠近走入 或</span>
              <kbd className="px-2.5 py-1 bg-neutral-950 border border-neutral-700 rounded text-neutral-200 font-bold">
                F 鍵
              </kbd>
            </div>
          </div>

          {/* Active Skills & Loadout */}
          <div className="flex flex-col gap-2 py-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-neutral-200">
                <Zap className="w-4 h-4 text-amber-300" />
                已裝備主動技能
              </span>
              <div className="flex gap-1.5">
                {['Q', 'E', 'R'].map((k) => (
                  <kbd key={k} className="px-2 py-1 bg-neutral-950 border border-neutral-700 rounded text-neutral-200 font-bold">
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between text-neutral-400">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-400" />
                新技能拾取與槽位替換
              </span>
              <span className="text-[11px] text-neutral-400">
                拾取自動裝備 / 滿槽即時替換
              </span>
            </div>
          </div>

          {/* Key Combat & Roguelite Features */}
          <div className="pt-3 text-[11px] text-neutral-400 space-y-2">
            <p>
              ✦ <strong className="text-neutral-200">受擊硬直 (Hitstun) 與 霸體 (Super Armor)</strong>：
              普通小怪受到攻擊會進入受擊硬直、被擊退並中斷前搖；<strong>精英怪、石像魔像與傀儡樂師具備霸體</strong>，不可被打斷技能，請妥善運用閃避應對！
            </p>
            <p>
              ✦ <strong className="text-neutral-200">場景實體掉落與門扉分流</strong>：
              戰鬥獲勝或開啟寶箱後，場景中央降下實體獎勵台，走向拾取後解鎖通往北側的實體門扉，由你親自操控角色走入下一步的冒險方向。
            </p>
            <p>
              ✦ <strong className="text-neutral-200">攻擊動作模組變化</strong>：
              透過獎勵可獲取「替換型被動」（例如將第 3 段橫斬替換為直線貫穿突刺、第 2 段替換為雙刃旋風）與「追加型被動」（如第 3 段追加衝擊波），獨立顯示於招式提示欄。
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-2.5 px-4 rounded-xl bg-neutral-100 hover:bg-white text-neutral-950 font-bold font-mono-combat text-xs transition-colors"
        >
          我已知悉 (Close)
        </button>
      </div>
    </div>
  );
};
