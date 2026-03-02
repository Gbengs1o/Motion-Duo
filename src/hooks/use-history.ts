"use client";

import { useState, useCallback, useRef } from 'react';

export function useHistory<T>(initialState: T, limit: number = 50) {
    const [state, setState] = useState<T>(initialState);
    const historyRef = useRef<T[]>([]);
    const indexRef = useRef<number>(-1);

    // Initialize history if empty
    if (indexRef.current === -1) {
        historyRef.current = [initialState];
        indexRef.current = 0;
    }

    const pushState = useCallback((newState: T | ((prev: T) => T)) => {
        const resolvedState = typeof newState === 'function'
            ? (newState as (prev: T) => T)(historyRef.current[indexRef.current])
            : newState;

        // Don't push if state is the same as the current one
        if (JSON.stringify(resolvedState) === JSON.stringify(historyRef.current[indexRef.current])) {
            return;
        }

        const nextHistory = historyRef.current.slice(0, indexRef.current + 1);
        nextHistory.push(resolvedState);
        if (nextHistory.length > limit) {
            nextHistory.shift();
        } else {
            indexRef.current++;
        }
        historyRef.current = nextHistory;
        indexRef.current = historyRef.current.length - 1;
        setState(resolvedState);
    }, [limit]);

    const undo = useCallback(() => {
        if (indexRef.current > 0) {
            indexRef.current--;
            const prevState = historyRef.current[indexRef.current];
            setState(prevState);
        }
    }, []);

    const redo = useCallback(() => {
        if (indexRef.current < historyRef.current.length - 1) {
            indexRef.current++;
            const nextState = historyRef.current[indexRef.current];
            setState(nextState);
        }
    }, []);

    const canUndo = indexRef.current > 0;
    const canRedo = indexRef.current < historyRef.current.length - 1;

    return {
        state,
        setState: pushState, // Intercept setState to use history
        undo,
        redo,
        canUndo,
        canRedo
    };
}
