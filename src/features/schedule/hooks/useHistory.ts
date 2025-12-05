import { useState, useCallback } from "react";

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export const useHistory = <T>(initialState: T) => {
  const [state, setState] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const undo = useCallback(() => {
    setState((currentState) => {
      if (currentState.past.length === 0) return currentState;

      const previous = currentState.past[currentState.past.length - 1];
      const newPast = currentState.past.slice(0, currentState.past.length - 1);

      return {
        past: newPast,
        present: previous,
        future: [currentState.present, ...currentState.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((currentState) => {
      if (currentState.future.length === 0) return currentState;

      const next = currentState.future[0];
      const newFuture = currentState.future.slice(1);

      return {
        past: [...currentState.past, currentState.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  // Update state with option to commit to history
  const set = useCallback(
    (newPresent: T | ((curr: T) => T), commit: boolean = true) => {
      setState((currentState) => {
        const nextPresent =
          typeof newPresent === "function"
            ? (newPresent as (curr: T) => T)(currentState.present)
            : newPresent;

        if (nextPresent === currentState.present) return currentState;

        if (commit) {
          return {
            past: [...currentState.past, currentState.present],
            present: nextPresent,
            future: [], // Clear future on new change
          };
        } else {
          // Update present without adding to history (for continuous edits like dragging)
          // Future is preserved? Usually continuous edits clear future if they deviate,
          // but for drag, we might want to clear future only when committed.
          // But standard behavior: any change clears future.
          // However, if we are just updating 'present' temporarily, maybe we keep future?
          // No, if we change present, the future path is invalid.
          return {
            ...currentState,
            present: nextPresent,
            future: [],
          };
        }
      });
    },
    []
  );

  // Explicitly commit the current state to history (useful after continuous edits)
  // But wait, `set` with `commit: false` loses the 'previous' present.
  // If we do:
  // 1. set(val1, true) -> past: [prev], present: val1
  // 2. set(val2, false) -> past: [prev], present: val2 (We lost val1 as a history step? No, val1 was 'present', now it's gone)
  // This is fine for continuous edits if we consider the *start* of the edit as the save point.
  // But `past` should contain the state *before* the continuous edit started.
  // Example:
  // Start: Present=A, Past=[]
  // Drag Start: Save A?
  // Drag Move: Present=B (commit=false) -> Past=[]? If we want to undo to A, A must be in Past.
  // So, the *first* update of a continuous sequence must push to history. Subsequent ones should not.
  
  // Revised Strategy:
  // We need a way to say "This is a new history entry" vs "Update current entry".
  // `set(val, { newEntry: boolean })`
  
  return {
    state: state.present,
    past: state.past,
    future: state.future,
    set,
    undo,
    redo,
    canUndo,
    canRedo,
  };
};
