import React from 'react';
import {formatTomatoDurationLabel} from '../lib/tomato-harvest';
import type {TomatoHarvestEntry} from '../lib/tomato-harvest';
import {TomatoVisual} from './TomatoVisual';

type IncomingTrayGhost = {
  id: string;
  startXLocal: number;
  startYLocal: number;
  targetXLocal: number;
  targetYLocal: number;
  sizePx: number;
  animate: boolean;
};

type IncomingStoreTarget = {
  id: string;
  xLocal: number;
  yLocal: number;
};

interface TomatoTrayLayerProps {
  entries: TomatoHarvestEntry[];
  containerRef?: React.RefObject<HTMLDivElement | null>;
  incomingGhost?: IncomingTrayGhost | null;
  incomingStorePreviewId?: string | null;
  onIncomingStoreTargetResolved?: (target: IncomingStoreTarget | null) => void;
}

export const TomatoTrayLayer: React.FC<TomatoTrayLayerProps> = ({
  entries,
  containerRef,
  incomingGhost,
  incomingStorePreviewId,
  onIncomingStoreTargetResolved,
}) => {
  const [visibleLabels, setVisibleLabels] = React.useState<Record<string, string>>({});
  const labelTimersRef = React.useRef<Record<string, number>>({});
  const trayBodyRef = React.useRef<HTMLDivElement | null>(null);
  const previewSlotRef = React.useRef<HTMLSpanElement | null>(null);
  const pressRef = React.useRef<{
    id: string;
    pointerId: number;
    pointerType: string;
    startX: number;
    startY: number;
  } | null>(null);
  const trayFullEntries = entries.filter((entry) => entry.damageTier === 'FULL');
  const shouldPreviewIncoming =
    Boolean(incomingStorePreviewId) && !trayFullEntries.some((entry) => entry.id === incomingStorePreviewId);

  const trayRenderItems = React.useMemo(() => {
    const base = trayFullEntries.map((entry) => ({
      id: entry.id,
      entry,
      isPreview: false,
    }));
    if (!shouldPreviewIncoming || !incomingStorePreviewId) {
      return base.slice(-16);
    }
    base.push({
      id: `preview-${incomingStorePreviewId}`,
      entry: null,
      isPreview: true,
    });
    return base.slice(-16);
  }, [incomingStorePreviewId, shouldPreviewIncoming, trayFullEntries]);

  const hideLabel = React.useCallback((id: string) => {
    if (labelTimersRef.current[id] !== undefined) {
      window.clearTimeout(labelTimersRef.current[id]);
      delete labelTimersRef.current[id];
    }
    setVisibleLabels((prev) => {
      if (prev[id] === undefined) return prev;
      const next = {...prev};
      delete next[id];
      return next;
    });
  }, []);

  const showLabel = React.useCallback((id: string, value: string, mode: 'hover' | 'tap') => {
    setVisibleLabels((prev) => ({
      ...prev,
      [id]: value,
    }));

    if (labelTimersRef.current[id] !== undefined) {
      window.clearTimeout(labelTimersRef.current[id]);
      delete labelTimersRef.current[id];
    }

    if (mode === 'hover') {
      return;
    }

    labelTimersRef.current[id] = window.setTimeout(() => {
      setVisibleLabels((prev) => {
        const next = {...prev};
        delete next[id];
        return next;
      });
      delete labelTimersRef.current[id];
    }, 1100);
  }, []);

  React.useEffect(() => {
    return () => {
      (Object.values(labelTimersRef.current) as number[]).forEach((timerId) => {
        window.clearTimeout(timerId);
      });
      labelTimersRef.current = {};
    };
  }, []);

  React.useLayoutEffect(() => {
    if (!onIncomingStoreTargetResolved) {
      return;
    }
    if (!shouldPreviewIncoming || !incomingStorePreviewId) {
      onIncomingStoreTargetResolved(null);
      return;
    }

    const trayBody = trayBodyRef.current;
    const previewSlot = previewSlotRef.current;
    if (!trayBody || !previewSlot) {
      onIncomingStoreTargetResolved(null);
      return;
    }

    const trayRect = trayBody.getBoundingClientRect();
    const slotRect = previewSlot.getBoundingClientRect();
    onIncomingStoreTargetResolved({
      id: incomingStorePreviewId,
      xLocal: slotRect.left - trayRect.left + slotRect.width / 2,
      yLocal: slotRect.top - trayRect.top + slotRect.height / 2,
    });
  }, [incomingStorePreviewId, onIncomingStoreTargetResolved, shouldPreviewIncoming, trayRenderItems.length]);

  if (trayFullEntries.length === 0 && !shouldPreviewIncoming) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute left-1/2 top-3 z-[15] w-[min(82vw,560px)] -translate-x-1/2 max-md:top-2 max-md:w-[min(90vw,360px)]"
    >
      <div
        ref={trayBodyRef}
        className="relative rounded-2xl border border-white/12 bg-white/[0.05] px-3 py-2 shadow-[0_6px_16px_rgba(0,0,0,0.2)] backdrop-blur-lg"
      >
        <div className="flex max-h-[90px] flex-wrap content-start items-end justify-center gap-x-2.5 gap-y-1 overflow-visible max-md:max-h-[80px] max-md:gap-x-1.5 max-md:gap-y-0.5">
          {trayRenderItems.map((item) => (
            <span
              key={item.id}
              ref={item.isPreview ? previewSlotRef : undefined}
              className="pointer-events-auto relative block h-10 w-9 shrink-0 max-md:h-9 max-md:w-8"
              title={item.entry ? formatTomatoDurationLabel(item.entry) : undefined}
              aria-hidden={item.isPreview ? true : undefined}
              onPointerEnter={(event) => {
                if (!item.entry) return;
                if (event.pointerType !== 'mouse') return;
                showLabel(item.entry.id, formatTomatoDurationLabel(item.entry), 'hover');
              }}
              onPointerLeave={(event) => {
                if (!item.entry) return;
                if (event.pointerType !== 'mouse') return;
                hideLabel(item.entry.id);
              }}
              onPointerDown={(event) => {
                if (!item.entry) return;
                if (event.button !== 0 && event.pointerType !== 'touch') {
                  return;
                }
                pressRef.current = {
                  id: item.entry.id,
                  pointerId: event.pointerId,
                  pointerType: event.pointerType,
                  startX: event.clientX,
                  startY: event.clientY,
                };
              }}
              onPointerUp={(event) => {
                if (!item.entry) return;
                const press = pressRef.current;
                if (!press || press.pointerId !== event.pointerId || press.id !== item.entry.id) {
                  return;
                }
                pressRef.current = null;
                if (press.pointerType === 'mouse') {
                  return;
                }
                const moved = Math.hypot(event.clientX - press.startX, event.clientY - press.startY);
                if (moved > 8) {
                  return;
                }
                showLabel(item.entry.id, formatTomatoDurationLabel(item.entry), 'tap');
              }}
              onPointerCancel={() => {
                pressRef.current = null;
              }}
              style={item.isPreview ? {visibility: 'hidden', pointerEvents: 'none'} : undefined}
            >
              {item.entry && visibleLabels[item.entry.id] !== undefined && (
                <span className="absolute left-1/2 top-[-34%] z-20 -translate-x-1/2 rounded-full border border-white/22 bg-black/52 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-white shadow-[0_4px_10px_rgba(0,0,0,0.35)]">
                  {visibleLabels[item.entry.id]}
                </span>
              )}
              <TomatoVisual
                sizePx={34}
                damageTier="FULL"
                disableOuterShadow
                emphasizeStem
                className="absolute bottom-[-7px] left-1/2 -translate-x-1/2 max-md:bottom-[-5px] max-md:scale-[0.9] max-md:origin-bottom"
              />
            </span>
          ))}
        </div>
        {incomingGhost && (
          <div
            className="pointer-events-none absolute z-40"
            style={{
              left: incomingGhost.animate ? incomingGhost.targetXLocal : incomingGhost.startXLocal,
              top: incomingGhost.animate ? incomingGhost.targetYLocal : incomingGhost.startYLocal,
              transform: 'translate(-50%, -50%)',
              opacity: incomingGhost.animate ? 0.82 : 0.98,
              transition: 'left 190ms ease-out, top 190ms ease-out, opacity 190ms ease-out',
            }}
          >
            <TomatoVisual sizePx={incomingGhost.sizePx} damageTier="FULL" />
          </div>
        )}
        <div className="mt-1 h-[2px] rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.06)_18%,rgba(255,255,255,0.12)_50%,rgba(255,255,255,0.06)_82%,rgba(255,255,255,0)_100%)] opacity-72 animate-[pulse_6.2s_ease-in-out_infinite]" />
        <div className="pointer-events-none absolute bottom-[6px] left-5 right-5 z-10 h-[4px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.11)_0%,rgba(255,255,255,0.05)_42%,rgba(255,255,255,0.00)_78%)] opacity-58 blur-[1px] animate-[pulse_7.4s_ease-in-out_infinite]" />
      </div>
    </div>
  );
};
