// The host's language for learner-facing text (plan Decision 15): the Debrief page's switch (D13) and the language a
// card's Briefing is sent in (D13b). One per-browser setting with the host's other per-viewer conveniences (store.ts:
// localStorage, wrapped); English unless set.
import { store } from '../store.ts';

export type HostLang = 'en' | 'fa';
const KEY = 'lang';
export const hostLang = (): HostLang => (store.get(KEY) === 'fa' ? 'fa' : 'en');
export const setHostLang = (l: HostLang): void => store.set(KEY, l);
