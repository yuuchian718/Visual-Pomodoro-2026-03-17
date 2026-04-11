import React from 'react';
import type {
  TomatoCustomPosition,
  TomatoHarvestEntry,
  TomatoSizeTier,
} from '../lib/tomato-harvest';
import {formatTomatoDurationLabel} from '../lib/tomato-harvest';
import {TomatoVisual} from './TomatoVisual';

interface TomatoScatterLayerProps {
  entries: TomatoHarvestEntry[];
  onPositionCommit: (id: string, position: TomatoCustomPosition) => void;
  onDelete: (id: string) => void;
  onDeleteAllIncomplete: () => void;
  onStoreToTray: (id: string, pointer: {clientX: number; clientY: number}) => void;
  canStoreToTrayAtPoint: (clientX: number, clientY: number) => boolean;
}

type SafeAnchor = {
  x: number;
  y: number;
  rotate: number;
};

const SAFE_ANCHORS: SafeAnchor[] = [
  {x: 10, y: 16, rotate: -12},
  {x: 18, y: 30, rotate: 10},
  {x: 12, y: 50, rotate: -8},
  {x: 16, y: 74, rotate: 14},
  {x: 84, y: 24, rotate: 10},
  {x: 88, y: 44, rotate: -12},
  {x: 84, y: 66, rotate: 12},
  {x: 76, y: 14, rotate: -8},
  {x: 26, y: 84, rotate: -10},
  {x: 72, y: 84, rotate: 9},
];

const MAX_VISIBLE_TOMATOES = 8;
const DRAG_START_THRESHOLD_PX = 8;
const TAP_VALUE_VISIBLE_MS = 1100;
const LONG_PRESS_DELETE_MS = 600;
const DELETE_FEEDBACK_MS = 150;
const INCOMPLETE_GROUP_CLEAR_FEEDBACK_MS = 165;
const DOUBLE_TAP_WINDOW_MS = 520;
const SAFE_BOUNDS = {
  minX: 6,
  maxX: 94,
  minY: 8,
  maxY: 92,
};
const FORBIDDEN_ZONES: Array<{minX: number; maxX: number; minY: number; maxY: number}> = [
  // Clock area
  {minX: 28, maxX: 72, minY: 16, maxY: 56},
  // Main play button area
  {minX: 39, maxX: 61, minY: 58, maxY: 78},
  // Control buttons area
  {minX: 24, maxX: 76, minY: 78, maxY: 96},
  // Top-right tomato entry area
  {minX: 74, maxX: 99, minY: 2, maxY: 20},
];

const sizeToPx: Record<TomatoSizeTier, number> = {
  XS: 34,
  S: 40,
  M: 46,
  L: 52,
  XL: 58,
  XXL: 64,
};

const hashId = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const allocateAnchors = (entries: TomatoHarvestEntry[]) => {
  const used = new Set<number>();

  return entries.map((entry, order) => {
    const seed = hashId(entry.id) + order * 17;
    let index = seed % SAFE_ANCHORS.length;

    while (used.has(index)) {
      index = (index + 1) % SAFE_ANCHORS.length;
    }

    used.add(index);
    return SAFE_ANCHORS[index];
  });
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const isInsideZone = (
  point: TomatoCustomPosition,
  zone: {minX: number; maxX: number; minY: number; maxY: number},
) =>
  point.xPct >= zone.minX &&
  point.xPct <= zone.maxX &&
  point.yPct >= zone.minY &&
  point.yPct <= zone.maxY;

const adjustPositionForForbiddenZones = (position: TomatoCustomPosition): TomatoCustomPosition => {
  let adjusted = {
    xPct: clamp(position.xPct, SAFE_BOUNDS.minX, SAFE_BOUNDS.maxX),
    yPct: clamp(position.yPct, SAFE_BOUNDS.minY, SAFE_BOUNDS.maxY),
  };

  for (const zone of FORBIDDEN_ZONES) {
    if (!isInsideZone(adjusted, zone)) {
      continue;
    }

    const leftCandidate = {
      xPct: clamp(zone.minX - 1.5, SAFE_BOUNDS.minX, SAFE_BOUNDS.maxX),
      yPct: adjusted.yPct,
    };
    const rightCandidate = {
      xPct: clamp(zone.maxX + 1.5, SAFE_BOUNDS.minX, SAFE_BOUNDS.maxX),
      yPct: adjusted.yPct,
    };
    const topCandidate = {
      xPct: adjusted.xPct,
      yPct: clamp(zone.minY - 1.5, SAFE_BOUNDS.minY, SAFE_BOUNDS.maxY),
    };
    const bottomCandidate = {
      xPct: adjusted.xPct,
      yPct: clamp(zone.maxY + 1.5, SAFE_BOUNDS.minY, SAFE_BOUNDS.maxY),
    };
    const candidates = [leftCandidate, rightCandidate, topCandidate, bottomCandidate].filter(
      (candidate) => !isInsideZone(candidate, zone),
    );

    if (candidates.length === 0) {
      continue;
    }

    adjusted = candidates.reduce((best, candidate) => {
      const bestDist = (best.xPct - adjusted.xPct) ** 2 + (best.yPct - adjusted.yPct) ** 2;
      const nextDist = (candidate.xPct - adjusted.xPct) ** 2 + (candidate.yPct - adjusted.yPct) ** 2;
      return nextDist < bestDist ? candidate : best;
    });
  }

  return adjusted;
};

export const TomatoScatterLayer: React.FC<TomatoScatterLayerProps> = ({
  entries,
  onPositionCommit,
  onDelete,
  onDeleteAllIncomplete,
  onStoreToTray,
  canStoreToTrayAtPoint,
}) => {
  const layerRef = React.useRef<HTMLDivElement | null>(null);
  const previousEntryIdsRef = React.useRef<Set<string>>(new Set(entries.map((entry) => entry.id)));
  const [visibleIds, setVisibleIds] = React.useState<string[]>(() =>
    [...entries]
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(-MAX_VISIBLE_TOMATOES)
      .map((entry) => entry.id),
  );
  const [dragPositions, setDragPositions] = React.useState<Record<string, TomatoCustomPosition>>({});
  const [visibleTapValues, setVisibleTapValues] = React.useState<Record<string, string>>({});
  const [deletingIds, setDeletingIds] = React.useState<Record<string, true>>({});
  const [storingIds, setStoringIds] = React.useState<Record<string, true>>({});
  const [isClearingIncomplete, setIsClearingIncomplete] = React.useState(false);
  const tapValueTimersRef = React.useRef<Record<string, number>>({});
  const longPressTimerRef = React.useRef<number | null>(null);
  const deleteFeedbackTimersRef = React.useRef<Record<string, number>>({});
  const lastTapAtRef = React.useRef<Record<string, number>>({});
  const dragStateRef = React.useRef<{
    id: string;
    pointerId: number;
    pointerType: string;
    startClientX: number;
    startClientY: number;
    originX: number;
    originY: number;
    isDragging: boolean;
    longPressTriggered: boolean;
  } | null>(null);

  const visibleEntries = React.useMemo(() => {
    const visibleSet = new Set(visibleIds);
    return [...entries].sort((a, b) => a.createdAt - b.createdAt).filter((entry) => visibleSet.has(entry.id));
  }, [entries, visibleIds]);
  const anchors = React.useMemo(() => allocateAnchors(visibleEntries), [visibleEntries]);

  React.useEffect(() => {
    const currentIds = new Set(entries.map((entry) => entry.id));
    const sortedEntries = [...entries].sort((a, b) => a.createdAt - b.createdAt);

    setVisibleIds((prev) => {
      const kept = prev.filter((id) => currentIds.has(id));
      const prevIds = previousEntryIdsRef.current;
      const addedEntries = sortedEntries.filter((entry) => !prevIds.has(entry.id));

      if (kept.length >= MAX_VISIBLE_TOMATOES || addedEntries.length === 0) {
        return kept;
      }

      const keptSet = new Set(kept);
      const next = [...kept];
      for (const entry of addedEntries) {
        if (next.length >= MAX_VISIBLE_TOMATOES) {
          break;
        }
        if (!keptSet.has(entry.id)) {
          next.push(entry.id);
          keptSet.add(entry.id);
        }
      }
      return next;
    });

    previousEntryIdsRef.current = currentIds;
  }, [entries]);

  React.useEffect(() => {
    const knownIds = new Set(visibleEntries.map((entry) => entry.id));
    setDragPositions((prev) => {
      const next: Record<string, TomatoCustomPosition> = {};
      Object.keys(prev).forEach((id) => {
        if (knownIds.has(id)) {
          next[id] = prev[id] as TomatoCustomPosition;
        }
      });
      return next;
    });
  }, [visibleEntries]);

  React.useEffect(() => {
    const knownIds = new Set(visibleEntries.map((entry) => entry.id));
    setStoringIds((prev) => {
      const next: Record<string, true> = {};
      Object.keys(prev).forEach((id) => {
        if (knownIds.has(id)) {
          next[id] = true;
          return;
        }
      });
      return next;
    });
  }, [visibleEntries]);

  React.useEffect(() => {
    const knownIds = new Set(visibleEntries.map((entry) => entry.id));
    setVisibleTapValues((prev) => {
      const next: Record<string, string> = {};
      Object.keys(prev).forEach((id) => {
        if (knownIds.has(id)) {
          next[id] = prev[id] as string;
        }
      });
      return next;
    });
  }, [visibleEntries]);

  React.useEffect(() => {
    const knownIds = new Set(visibleEntries.map((entry) => entry.id));
    setDeletingIds((prev) => {
      const next: Record<string, true> = {};
      Object.keys(prev).forEach((id) => {
        if (knownIds.has(id)) {
          next[id] = true;
          return;
        }
        if (deleteFeedbackTimersRef.current[id] !== undefined) {
          window.clearTimeout(deleteFeedbackTimersRef.current[id]);
          delete deleteFeedbackTimersRef.current[id];
        }
      });
      return next;
    });
  }, [visibleEntries]);

  React.useEffect(() => {
    return () => {
      (Object.values(tapValueTimersRef.current) as number[]).forEach((timerId) => {
        window.clearTimeout(timerId);
      });
      tapValueTimersRef.current = {};
      if (longPressTimerRef.current !== null) {
        window.clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      (Object.values(deleteFeedbackTimersRef.current) as number[]).forEach((timerId) => {
        window.clearTimeout(timerId);
      });
      deleteFeedbackTimersRef.current = {};
      lastTapAtRef.current = {};
    };
  }, []);

  const clearLongPressTimer = React.useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const getEntryPosition = React.useCallback(
    (entry: TomatoHarvestEntry, index: number): TomatoCustomPosition => {
      const local = dragPositions[entry.id];
      if (local) {
        return local;
      }

      if (entry.customPosition) {
        return entry.customPosition;
      }

      const anchor = anchors[index];
      return {xPct: anchor.x, yPct: anchor.y};
    },
    [anchors, dragPositions],
  );

  const commitDrag = React.useCallback(
    (id: string, position: TomatoCustomPosition) => {
      const adjusted = adjustPositionForForbiddenZones(position);
      setDragPositions((prev) => ({
        ...prev,
        [id]: adjusted,
      }));
      onPositionCommit(id, adjusted);
    },
    [onPositionCommit],
  );

  const hideTapValue = React.useCallback((id: string) => {
    if (tapValueTimersRef.current[id] !== undefined) {
      window.clearTimeout(tapValueTimersRef.current[id]);
      delete tapValueTimersRef.current[id];
    }
    setVisibleTapValues((prev) => {
      if (prev[id] === undefined) {
        return prev;
      }
      const next = {...prev};
      delete next[id];
      return next;
    });
  }, []);

  const showTapValue = React.useCallback((id: string, value: string, mode: 'tap' | 'hover' = 'tap') => {
    setVisibleTapValues((prev) => ({
      ...prev,
      [id]: value,
    }));

    if (tapValueTimersRef.current[id] !== undefined) {
      window.clearTimeout(tapValueTimersRef.current[id]);
      delete tapValueTimersRef.current[id];
    }

    if (mode === 'hover') {
      return;
    }

    tapValueTimersRef.current[id] = window.setTimeout(() => {
      setVisibleTapValues((prev) => {
        const next = {...prev};
        delete next[id];
        return next;
      });
      delete tapValueTimersRef.current[id];
    }, TAP_VALUE_VISIBLE_MS);
  }, []);

  const handlePointerMove = React.useCallback((event: PointerEvent) => {
    const drag = dragStateRef.current;
    const layer = layerRef.current;
    if (!drag || !layer || drag.pointerId !== event.pointerId) {
      return;
    }

    const rect = layer.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const deltaX = event.clientX - drag.startClientX;
    const deltaY = event.clientY - drag.startClientY;
    if (!drag.isDragging && Math.hypot(deltaX, deltaY) < DRAG_START_THRESHOLD_PX) {
      return;
    }

    if (!drag.isDragging) {
      clearLongPressTimer();
      hideTapValue(drag.id);
    }
    drag.isDragging = true;
    const nextX = drag.originX + (deltaX / rect.width) * 100;
    const nextY = drag.originY + (deltaY / rect.height) * 100;

    setDragPositions((prev) => ({
      ...prev,
      [drag.id]: {
        xPct: clamp(nextX, SAFE_BOUNDS.minX, SAFE_BOUNDS.maxX),
        yPct: clamp(nextY, SAFE_BOUNDS.minY, SAFE_BOUNDS.maxY),
      },
    }));
  }, [clearLongPressTimer, hideTapValue]);

  const handlePointerUp = React.useCallback((event: PointerEvent) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    clearLongPressTimer();

    if (drag.longPressTriggered) {
      dragStateRef.current = null;
      return;
    }

    if (drag.isDragging) {
      const draggedEntry = visibleEntries.find((item) => item.id === drag.id);
      const canStore =
        draggedEntry?.damageTier === 'FULL' && canStoreToTrayAtPoint(event.clientX, event.clientY);

      if (canStore) {
        hideTapValue(drag.id);
        setStoringIds((prev) => ({
          ...prev,
          [drag.id]: true,
        }));
        onStoreToTray(drag.id, {clientX: event.clientX, clientY: event.clientY});
      } else {
        const candidate = dragPositions[drag.id] ?? {xPct: drag.originX, yPct: drag.originY};
        commitDrag(drag.id, candidate);
      }
    } else {
      const entry = visibleEntries.find((item) => item.id === drag.id);
      if (entry) {
        if (entry.damageTier !== 'FULL' && !isClearingIncomplete) {
          const now = Date.now();
          const previousTapAt = lastTapAtRef.current[entry.id] ?? 0;
          const isDoubleTapByTime = now - previousTapAt <= DOUBLE_TAP_WINDOW_MS;
          const isDoubleTapByMouseDetail = drag.pointerType === 'mouse' && event.detail >= 2;
          const isDoubleTap = isDoubleTapByMouseDetail || isDoubleTapByTime;
          lastTapAtRef.current[entry.id] = now;

          if (isDoubleTap) {
            hideTapValue(entry.id);
            setDeletingIds((prev) => ({
              ...prev,
              [entry.id]: true,
            }));
            deleteFeedbackTimersRef.current[entry.id] = window.setTimeout(() => {
              onDelete(entry.id);
              setDeletingIds((prev) => {
                const next = {...prev};
                delete next[entry.id];
                return next;
              });
              delete deleteFeedbackTimersRef.current[entry.id];
            }, DELETE_FEEDBACK_MS);
            dragStateRef.current = null;
            return;
          }
        }

        if (drag.pointerType !== 'mouse') {
          showTapValue(drag.id, formatTomatoDurationLabel(entry), 'tap');
        }
      }
    }

    dragStateRef.current = null;
  }, [
    canStoreToTrayAtPoint,
    clearLongPressTimer,
    commitDrag,
    dragPositions,
    onStoreToTray,
    onDelete,
    hideTapValue,
    isClearingIncomplete,
    showTapValue,
    visibleEntries,
  ]);

  React.useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  if (visibleEntries.length === 0) {
    return null;
  }

  return (
    <div ref={layerRef} className="pointer-events-none absolute inset-0 z-10">
      {visibleEntries.map((entry, index) => {
        const anchor = anchors[index];
        const position = getEntryPosition(entry, index);
        const size = sizeToPx[entry.sizeTier];
        const tomatoDurationLabel = formatTomatoDurationLabel(entry);

        return (
          <div
            key={entry.id}
            className="pointer-events-auto absolute touch-none cursor-grab active:cursor-grabbing"
            onPointerDown={(event) => {
              if (storingIds[entry.id]) {
                return;
              }
              if (isClearingIncomplete && entry.damageTier !== 'FULL') {
                return;
              }
              if (deletingIds[entry.id]) {
                return;
              }
              if (event.button !== 0 && event.pointerType !== 'touch') {
                return;
              }
              const origin = dragPositions[entry.id] ?? entry.customPosition ?? {xPct: anchor.x, yPct: anchor.y};
              hideTapValue(entry.id);
              clearLongPressTimer();
              dragStateRef.current = {
                id: entry.id,
                pointerId: event.pointerId,
                pointerType: event.pointerType,
                startClientX: event.clientX,
                startClientY: event.clientY,
                originX: origin.xPct,
                originY: origin.yPct,
                isDragging: false,
                longPressTriggered: false,
              };

              if (entry.damageTier === 'FULL') {
                event.currentTarget.setPointerCapture(event.pointerId);
                return;
              }

              longPressTimerRef.current = window.setTimeout(() => {
                longPressTimerRef.current = null;
                const current = dragStateRef.current;
                if (!current || current.id !== entry.id || current.pointerId !== event.pointerId || current.isDragging) {
                  return;
                }
                current.longPressTriggered = true;
                hideTapValue(entry.id);
                const incompleteIds = visibleEntries
                  .filter((item) => item.damageTier !== 'FULL')
                  .map((item) => item.id);
                if (incompleteIds.length === 0) {
                  return;
                }
                setIsClearingIncomplete(true);
                setVisibleTapValues({});
                setDeletingIds((prev) => {
                  const next = {...prev};
                  incompleteIds.forEach((id) => {
                    next[id] = true;
                  });
                  return next;
                });
                window.setTimeout(() => {
                  onDeleteAllIncomplete();
                  setDeletingIds((prev) => {
                    const next = {...prev};
                    incompleteIds.forEach((id) => {
                      delete next[id];
                    });
                    return next;
                  });
                  setIsClearingIncomplete(false);
                }, INCOMPLETE_GROUP_CLEAR_FEEDBACK_MS);
              }, LONG_PRESS_DELETE_MS);

              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerEnter={(event) => {
              if (isClearingIncomplete && entry.damageTier !== 'FULL') {
                return;
              }
              if (event.pointerType !== 'mouse') {
                return;
              }
              showTapValue(entry.id, tomatoDurationLabel, 'hover');
            }}
            onPointerLeave={(event) => {
              if (isClearingIncomplete && entry.damageTier !== 'FULL') {
                return;
              }
              if (event.pointerType !== 'mouse') {
                return;
              }
              if (dragStateRef.current?.id === entry.id) {
                return;
              }
              hideTapValue(entry.id);
            }}
            style={{
              left: `${position.xPct}%`,
              top: `${position.yPct}%`,
              transform: `translate(-50%, -50%) rotate(${anchor.rotate}deg)${
                deletingIds[entry.id] ? ' translateY(4px) scale(0.93)' : ''
              }`,
              opacity: deletingIds[entry.id] || storingIds[entry.id] ? 0 : 1,
              transition:
                deletingIds[entry.id] || storingIds[entry.id]
                  ? `transform ${DELETE_FEEDBACK_MS}ms ease-out, opacity ${DELETE_FEEDBACK_MS}ms ease-out`
                  : undefined,
              pointerEvents: deletingIds[entry.id] || storingIds[entry.id] ? 'none' : undefined,
            }}
          >
            <div className="relative h-full w-full">
              {visibleTapValues[entry.id] !== undefined && (
                <span className="absolute left-1/2 top-[-30%] z-20 -translate-x-1/2 rounded-full border border-white/22 bg-black/52 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white shadow-[0_4px_10px_rgba(0,0,0,0.35)]">
                  {visibleTapValues[entry.id]}
                </span>
              )}
              <TomatoVisual sizePx={size} damageTier={entry.damageTier} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
