/** Header menus tell each other when they open, so only one is ever open at a time. */
const EVENT = "coti:menu-opened";

export function announceMenuOpened(id: string) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: id }));
}

/** Calls `close` whenever a different header menu opens. Returns the unsubscribe function. */
export function onOtherMenuOpened(id: string, close: () => void) {
  const listener = (e: Event) => {
    if ((e as CustomEvent<string>).detail !== id) close();
  };
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
