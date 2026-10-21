import { AiDraftLifecycleContext } from './useAiDraftLifecycle.js';

/** Optional observation boundary. Only metadata leaves the draft owner. */
export function AiDraftLifecycleProvider({ onEvent, children }) {
  return <AiDraftLifecycleContext.Provider value={onEvent}>{children}</AiDraftLifecycleContext.Provider>;
}
