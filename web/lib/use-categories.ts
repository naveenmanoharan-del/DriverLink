'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from './api';
import type { Category } from './types';

/**
 * Positions come from the API. Every caller puts them in a required <select>,
 * so a failed load is not a cosmetic problem: the field ends up empty, the form
 * cannot be submitted, and nothing on screen explains why. Callers get `failed`
 * and a `retry` so they can say what happened instead of showing a dead field.
 *
 * An empty list counts as a failure for the same reason — from the user's side
 * "the server returned nothing" and "the request died" are the same dead end.
 */
export function useCategories() {
  const [state, setState] = useState<{
    categories: Category[];
    failed: boolean;
    loading: boolean;
  }>({ categories: [], failed: false, loading: true });

  // Only the request's own callbacks set state, so nothing is set synchronously
  // when this runs inside an effect.
  const load = useCallback(() => {
    apiFetch<Category[]>('/v1/categories')
      .then((list) =>
        setState({ categories: list, failed: list.length === 0, loading: false }),
      )
      .catch(() => setState({ categories: [], failed: true, loading: false }));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Retry is user-triggered, so showing the loading state here is free of the
  // cascading-render problem that the same call would cause inside an effect.
  const retry = useCallback(() => {
    setState((s) => ({ ...s, loading: true, failed: false }));
    load();
  }, [load]);

  return { ...state, retry };
}
