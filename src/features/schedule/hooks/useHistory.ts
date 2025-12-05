import { useState, useCallback, useRef } from "react";

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

  // Keep track of the last state that was effectively "committed" to history (or is the initial state).
  // This is crucial for continuous updates (like dragging) where we update 'present' multiple times
  // but only want to save the state *before* the drag started into 'past' when we finally commit.
  const lastCommittedRef = useRef<T>(initialState);

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const undo = useCallback(() => {
    setState((currentState) => {
      if (currentState.past.length === 0) return currentState;

      const previous = currentState.past[currentState.past.length - 1];
      const newPast = currentState.past.slice(0, currentState.past.length - 1);

      lastCommittedRef.current = previous; // Update reference

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

      lastCommittedRef.current = next; // Update reference

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
          // When committing, we push the *last committed state* to past, not the potentially transient 'present'.
          // This handles the case: A (committed) -> B (transient) -> C (transient) -> D (commit).
          // We want history to be A -> D. So 'past' gets A.
          // If it was simple: A (committed) -> D (commit). 'past' gets A.
          // So it's consistent.
          
          const newPast = [...currentState.past, lastCommittedRef.current];
          lastCommittedRef.current = nextPresent; // Update reference to the new committed state

          return {
            past: newPast,
            present: nextPresent,
            future: [], // Clear future on new change
          };
        } else {
          // Transient update (e.g. dragging).
          // We update 'present' so the UI updates, but we DO NOT touch 'past' or 'lastCommittedRef'.
          // We also assume future should be cleared or kept?
          // Usually, any deviation clears future.
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