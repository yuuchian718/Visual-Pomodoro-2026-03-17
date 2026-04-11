import React from 'react';
import {formatTomatoDurationLabel, type TomatoHarvestEntry} from '../lib/tomato-harvest';
import {TomatoVisual} from './TomatoVisual';

const DELETE_FEEDBACK_MS = 160;
const LONG_PRESS_MS = 600;
const MOVE_CANCEL_PX = 8;

type PressState = {
  id: string;
  pointerId: number;
  pointerType: string;
  startX: number;
  startY: number;
  longPressTriggered: boolean;
};

interface TomatoTrayExpandedLayerProps {
  entries: TomatoHarvestEntry[];
  title: string;
  closeLabel: string;
  countLabel: string;
  totalDurationLabel: string;
  clearLabel: string;
  clearConfirmLabel: string;
  onClose: () => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

export const TomatoTrayExpandedLayer: React.FC<TomatoTrayExpandedLayerProps> = ({
  entries,
  title,
  closeLabel,
  countLabel,
  totalDurationLabel,
  clearLabel,
  clearConfirmLabel,
  onClose,
  onDelete,
  onClearAll,
}) => {
  const [visibleLabels, setVisibleLabels] = React.useState<Record<string, string>>({});
  const [deletingIds, setDeletingIds] = React.useState<Record<string, true>>({});
  const labelTimersRef = React.useRef<Record<string, number>>({});
  const deleteTimersRef = React.useRef<Record<string, number>>({});
  const pressRef = React.useRef<PressState | null>(null);
  const longPressTimerRef = React.useRef<number | null>(null);
  const clearConfirmTimerRef = React.useRef<number | null>(null);
  const [clearConfirmArmed, setClearConfirmArmed] = React.useState(false);

  const trayEntries = React.useMemo(
    () => [...entries].filter((entry) => entry.damageTier === 'FULL').sort((a, b) => b.createdAt - a.createdAt),
    [entries],
  );

  const formatDuration = React.useCallback((seconds: number): string => {
    const safe = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    if (hours > 0) {
      return minutes > 0 ? `${hours}h${minutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
  }, []);

  const trayTotalDurationLabel = React.useMemo(() => {
    const totalSeconds = trayEntries.reduce((sum, entry) => sum + Math.max(0, entry.targetMinutes * 60), 0);
    return formatDuration(totalSeconds);
  }, [formatDuration, trayEntries]);

  const handleClearAllClick = React.useCallback(() => {
    if (trayEntries.length === 0) {
      return;
    }
    if (clearConfirmArmed) {
      if (clearConfirmTimerRef.current !== null) {
        window.clearTimeout(clearConfirmTimerRef.current);
        clearConfirmTimerRef.current = null;
      }
      setClearConfirmArmed(false);
      onClearAll();
      return;
    }
    setClearConfirmArmed(true);
    if (clearConfirmTimerRef.current !== null) {
      window.clearTimeout(clearConfirmTimerRef.current);
    }
    clearConfirmTimerRef.current = window.setTimeout(() => {
      setClearConfirmArmed(false);
      clearConfirmTimerRef.current = null;
    }, 1500);
  }, [clearConfirmArmed, onClearAll, trayEntries.length]);

  const clearLongPressTimer = React.useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

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

  const triggerDelete = React.useCallback(
    (id: string) => {
      clearLongPressTimer();
      setVisibleLabels((prev) => {
        if (prev[id] === undefined) return prev;
        const next = {...prev};
        delete next[id];
        return next;
      });

      setDeletingIds((prev) => ({...prev, [id]: true}));
      if (deleteTimersRef.current[id] !== undefined) {
        window.clearTimeout(deleteTimersRef.current[id]);
      }
      deleteTimersRef.current[id] = window.setTimeout(() => {
        onDelete(id);
        setDeletingIds((prev) => {
          if (!prev[id]) return prev;
          const next = {...prev};
          delete next[id];
          return next;
        });
        delete deleteTimersRef.current[id];
      }, DELETE_FEEDBACK_MS);
    },
    [clearLongPressTimer, onDelete],
  );

  React.useEffect(() => {
    return () => {
      (Object.values(labelTimersRef.current) as number[]).forEach((timerId) => window.clearTimeout(timerId));
      (Object.values(deleteTimersRef.current) as number[]).forEach((timerId) => window.clearTimeout(timerId));
      labelTimersRef.current = {};
      deleteTimersRef.current = {};
      clearLongPressTimer();
      if (clearConfirmTimerRef.current !== null) {
        window.clearTimeout(clearConfirmTimerRef.current);
        clearConfirmTimerRef.current = null;
      }
      pressRef.current = null;
    };
  }, [clearLongPressTimer]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-[1px]"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-[min(92vw,840px)] rounded-2xl border border-white/18 bg-black/55 p-4 shadow-2xl shadow-black/45 backdrop-blur-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md border border-white/15 bg-white/[0.06] px-2 py-1 text-[11px] font-medium text-white/80 transition hover:bg-white/[0.12]"
        >
          {closeLabel}
        </button>
        <button
          type="button"
          onClick={handleClearAllClick}
          disabled={trayEntries.length === 0}
          className="absolute right-3 top-[3.35rem] shrink-0 whitespace-nowrap rounded-md border border-white/14 bg-white/[0.06] px-2.5 py-1.5 text-[10px] font-medium text-white/78 transition hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {clearConfirmArmed ? clearConfirmLabel : clearLabel}
        </button>
        <div className="mx-auto mb-3 w-full max-w-[560px] pr-14">
          <p className="text-center text-sm font-semibold text-white/90">{title}</p>
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-white/82 max-[520px]:grid-cols-1 max-[520px]:gap-y-2">
            <p className="flex items-baseline justify-between text-[12px] max-[520px]:justify-start max-[520px]:gap-2">
              <span className="text-white/62">{countLabel}</span>
              <span className="font-semibold tabular-nums text-white/92">{trayEntries.length}</span>
            </p>
            <p className="flex items-baseline justify-between text-[12px] max-[520px]:justify-start max-[520px]:gap-2">
              <span className="text-white/62">{totalDurationLabel}</span>
              <span className="font-semibold tabular-nums text-white/92">{trayTotalDurationLabel}</span>
            </p>
          </div>
        </div>
        <div className="max-h-[68vh] overflow-y-auto rounded-xl border border-white/12 bg-white/[0.03] p-3">
          <div className="grid grid-cols-4 gap-2 max-md:grid-cols-3 max-sm:grid-cols-2">
            {trayEntries.map((entry) => {
              const isDeleting = deletingIds[entry.id] === true;
              return (
                <button
                  key={entry.id}
                  type="button"
                  className="relative flex h-20 items-center justify-center rounded-lg border border-white/10 bg-black/20 p-1 transition hover:bg-white/[0.06] focus:outline-none"
                  onPointerEnter={(event) => {
                    if (event.pointerType !== 'mouse') return;
                    if (isDeleting) return;
                    showLabel(entry.id, formatTomatoDurationLabel(entry), 'hover');
                  }}
                  onPointerLeave={(event) => {
                    if (event.pointerType !== 'mouse') return;
                    hideLabel(entry.id);
                  }}
                  onPointerDown={(event) => {
                    if (isDeleting) return;
                    if (event.button !== 0 && event.pointerType !== 'touch') {
                      return;
                    }

                    pressRef.current = {
                      id: entry.id,
                      pointerId: event.pointerId,
                      pointerType: event.pointerType,
                      startX: event.clientX,
                      startY: event.clientY,
                      longPressTriggered: false,
                    };

                    clearLongPressTimer();
                    longPressTimerRef.current = window.setTimeout(() => {
                      if (!pressRef.current || pressRef.current.id !== entry.id) {
                        return;
                      }
                      pressRef.current.longPressTriggered = true;
                      triggerDelete(entry.id);
                    }, LONG_PRESS_MS);
                  }}
                  onPointerMove={(event) => {
                    const press = pressRef.current;
                    if (!press || press.pointerId !== event.pointerId || press.id !== entry.id) {
                      return;
                    }
                    const moved = Math.hypot(event.clientX - press.startX, event.clientY - press.startY);
                    if (moved > MOVE_CANCEL_PX) {
                      clearLongPressTimer();
                    }
                  }}
                  onPointerUp={(event) => {
                    const press = pressRef.current;
                    if (!press || press.pointerId !== event.pointerId || press.id !== entry.id) {
                      return;
                    }
                    pressRef.current = null;
                    clearLongPressTimer();

                    if (press.longPressTriggered) {
                      return;
                    }

                    if (press.pointerType === 'mouse') {
                      return;
                    }

                    const moved = Math.hypot(event.clientX - press.startX, event.clientY - press.startY);
                    if (moved > MOVE_CANCEL_PX) {
                      return;
                    }

                    showLabel(entry.id, formatTomatoDurationLabel(entry), 'tap');
                  }}
                  onPointerCancel={() => {
                    pressRef.current = null;
                    clearLongPressTimer();
                  }}
                >
                  {visibleLabels[entry.id] !== undefined && !isDeleting && (
                    <span className="absolute left-1/2 top-1 z-20 -translate-x-1/2 rounded-full border border-white/20 bg-black/55 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-white shadow-[0_4px_10px_rgba(0,0,0,0.35)]">
                      {visibleLabels[entry.id]}
                    </span>
                  )}
                  <span
                    className={`transition-all duration-150 ${
                      isDeleting ? 'translate-y-[8px] scale-90 opacity-0' : 'translate-y-0 scale-100 opacity-100'
                    }`}
                  >
                    <TomatoVisual sizePx={40} damageTier="FULL" disableOuterShadow emphasizeStem className="" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
