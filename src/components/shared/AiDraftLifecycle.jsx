import { useMemo } from 'react';
import { AiDraftLifecycleContext } from './useAiDraftLifecycle.js';

/** Optional observation boundary. Only metadata leaves the draft owner. */
export function AiDraftLifecycleProvider({ onEvent, scope, children }) {
  const value = useMemo(() => ({ onEvent, scope }), [onEvent, scope]);
  return <AiDraftLifecycleContext.Provider value={value}>{children}</AiDraftLifecycleContext.Provider>;
}
