import { useState, useCallback, useRef } from 'react';

const MAX_HISTORY = 50;

export function useUndoableState<T>(initialValue: T) {
  const [state, setState] = useState<T>(initialValue);
  const historyRef = useRef<T[]>([initialValue]);
  const pointerRef = useRef(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateButtons = useCallback(() => {
    setCanUndo(pointerRef.current > 0);
    setCanRedo(pointerRef.current < historyRef.current.length - 1);
  }, []);

  const setWithUndo = useCallback((val: T | ((prev: T) => T), skipHistory: boolean = false) => {
    setState((prev) => {
      const nextVal = typeof val === 'function' ? (val as any)(prev) : val;
      
      // If the value hasn't actually changed, don't create history
      if (nextVal === prev) return prev;

      if (!skipHistory) {
        let newHistory = historyRef.current.slice(0, pointerRef.current + 1);
        newHistory.push(nextVal);
        if (newHistory.length > MAX_HISTORY) {
          newHistory = newHistory.slice(newHistory.length - MAX_HISTORY);
        }
        historyRef.current = newHistory;
        pointerRef.current = newHistory.length - 1;
        updateButtons();
      } else {
        // If we skip history, we at least update the CURRENT history pointer to match the latest state
        // so that if we undo, we undo from this latest state, not the state before drag started
        historyRef.current[pointerRef.current] = nextVal;
      }
      
      return nextVal;
    });
  }, [updateButtons]);

  const undo = useCallback(() => {
    if (pointerRef.current > 0) {
      pointerRef.current -= 1;
      setState(historyRef.current[pointerRef.current]);
      updateButtons();
    }
  }, [updateButtons]);

  const redo = useCallback(() => {
    if (pointerRef.current < historyRef.current.length - 1) {
      pointerRef.current += 1;
      setState(historyRef.current[pointerRef.current]);
      updateButtons();
    }
  }, [updateButtons]);

  const resetHistory = useCallback((newState: T) => {
    setState(newState);
    historyRef.current = [newState];
    pointerRef.current = 0;
    updateButtons();
  }, [updateButtons]);

  return [state, setWithUndo, undo, redo, resetHistory, canUndo, canRedo] as const;
}
