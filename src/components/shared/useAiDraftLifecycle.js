import { createContext, useCallback, useContext, useEffect, useRef } from 'react';

export const AiDraftLifecycleContext = createContext(null);

/** Draft text stays inside this hook and is never supplied to the observer. */
export function useAiDraftLifecycle(feature, drafts, { active = true } = {}) {
  const observe = useContext(AiDraftLifecycleContext);
  const observed = useRef(new Map());
  const completed = useRef(new Map());
  const sink = useRef(observe);
  const generation = useRef({ version: 0 });
  useEffect(() => { sink.current = observe; }, [observe]);
  const emit = useCallback((event) => { try { sink.current?.({ ai_feature: feature, ...event }); } catch { /* Observation must not interrupt editing. */ } }, [feature]);
  const adopt = (key, text) => {
    const old = observed.current.get(key);
    if (!old) return;
    observed.current.delete(key);
    completed.current.set(key, old.identity);
    emit({ action: 'confirmed', edited_before_confirm: text !== old.original, seconds_to_confirm: Math.max(0, (Date.now() - old.at) / 1000) });
  };
  useEffect(() => {
    if (!active) {
      for (const key of observed.current.keys()) {
        observed.current.delete(key);
        emit({ action: 'discarded', reason: 'left_unconfirmed' });
      }
      return;
    }
    const present = new Set();
    for (const { key, original, text, confirmed, revision = original } of drafts) {
      if ((!original && revision == null) || !text?.trim()) continue;
      present.add(key);
      if (completed.current.get(key) === revision) continue;
      const old = observed.current.get(key);
      const baseline = original ?? (old?.identity === revision ? old.original : text);
      if (confirmed) {
        if (old) adopt(key, text);
        continue;
      }
      if (old && old.identity !== revision) {
        emit({ action: 'discarded', reason: 'regenerated' });
        observed.current.delete(key);
      }
      if (!observed.current.has(key)) observed.current.set(key, { original: baseline, identity: revision, at: Date.now() });
    }
    for (const key of observed.current.keys()) {
      if (!present.has(key)) {
        completed.current.set(key, observed.current.get(key).identity);
        observed.current.delete(key);
        emit({ action: 'discarded', reason: 'deleted' });
      }
    }
  });
  useEffect(() => {
    const lifetime = generation.current;
    const current = ++lifetime.version;
    const leave = () => {
      observed.current.forEach(() => emit({ action: 'discarded', reason: 'left_unconfirmed' }));
      observed.current.clear();
    };
    window.addEventListener('pagehide', leave);
    return () => {
      window.removeEventListener('pagehide', leave);
      // StrictMode's setup/cleanup probe is not a user leaving the editor.
      queueMicrotask(() => {
        if (lifetime.version === current) leave();
      });
    };
  }, [emit]);
  return { adopt };
}
