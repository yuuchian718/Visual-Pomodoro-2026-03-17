import React from 'react';
import type {TomatoDamageTier} from '../lib/tomato-harvest';

interface TomatoVisualProps {
  sizePx: number;
  damageTier?: TomatoDamageTier;
  className?: string;
  disableOuterShadow?: boolean;
  emphasizeStem?: boolean;
}

const damageClipPath: Record<TomatoDamageTier, string | undefined> = {
  FULL: undefined,
  LIGHT:
    'polygon(0% 0%, 82% 0%, 79% 4.5%, 78% 9.5%, 79.5% 14%, 83% 17.5%, 88% 20%, 94% 22%, 100% 24%, 100% 100%, 0% 100%)',
  HALF:
    'polygon(0% 0%, 79% 0%, 75.5% 5%, 73.5% 11%, 75.5% 16%, 80% 20.5%, 86% 23%, 94% 25%, 100% 27%, 100% 61%, 95.5% 66.5%, 92.5% 73%, 92% 79%, 94.5% 85%, 99% 90%, 100% 92%, 100% 100%, 0% 100%)',
  HEAVY:
    'polygon(0% 0%, 77% 0%, 73% 5.5%, 71% 12.5%, 73.5% 18%, 79% 23%, 86% 26%, 95% 28%, 100% 30%, 100% 58%, 95% 64.5%, 91.5% 71.5%, 90.5% 79%, 93% 86%, 98.5% 91%, 100% 93.5%, 100% 100%, 26% 100%, 20% 97%, 14.5% 91.5%, 12.5% 84.5%, 14.5% 77.5%, 19.5% 72.5%, 0% 70%)',
};

export const TomatoVisual: React.FC<TomatoVisualProps> = ({
  sizePx,
  damageTier = 'FULL',
  className = '',
  disableOuterShadow = false,
  emphasizeStem = false,
}) => {
  const clipPath = damageClipPath[damageTier];
  const isFull = damageTier === 'FULL';
  const heightPx = Math.round(sizePx * 0.92);

  return (
    <div className={`relative ${className}`} style={{width: `${sizePx}px`, height: `${heightPx}px`}}>
      <div
        className="absolute inset-0"
        style={{
          clipPath,
          filter: undefined,
        }}
      >
        <div
          className="absolute inset-0 rounded-[45%] border border-red-950/40 bg-[radial-gradient(circle_at_28%_24%,rgba(255,228,186,0.5)_0%,rgba(250,95,74,0.95)_36%,rgba(199,36,24,0.96)_100%)]"
          style={{
            boxShadow:
              'inset -8px -10px 16px rgba(110,18,12,0.55), inset 4px 5px 10px rgba(255,235,214,0.28)' +
              (isFull && !disableOuterShadow ? ', 0 8px 16px rgba(0,0,0,0.28)' : ''),
          }}
        />
        <span className="absolute left-[22%] top-[17%] h-[24%] w-[30%] rounded-full bg-white/28 blur-[0.5px]" />
      </div>

      <span
        className="absolute rounded-full bg-[linear-gradient(180deg,#4fa049_0%,#2f7d34_100%)] shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
        style={{
          left: emphasizeStem ? '38%' : '39%',
          top: emphasizeStem ? '-28%' : '-16%',
          width: emphasizeStem ? '26%' : '20%',
          height: emphasizeStem ? '36%' : '24%',
        }}
      />
      <span
        className="absolute rotate-[-28deg] rounded-full bg-[linear-gradient(180deg,#6dbb5e_0%,#3f8f43_100%)] shadow-[0_2px_4px_rgba(0,0,0,0.25)]"
        style={{
          left: '22%',
          top: emphasizeStem ? '-15%' : '-10%',
          width: '22%',
          height: emphasizeStem ? '22%' : '18%',
        }}
      />
      <span
        className="absolute rotate-[28deg] rounded-full bg-[linear-gradient(180deg,#6dbb5e_0%,#3f8f43_100%)] shadow-[0_2px_4px_rgba(0,0,0,0.25)]"
        style={{
          left: '52%',
          top: emphasizeStem ? '-15%' : '-10%',
          width: '22%',
          height: emphasizeStem ? '22%' : '18%',
        }}
      />
    </div>
  );
};
