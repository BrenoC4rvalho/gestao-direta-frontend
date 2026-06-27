const overlayOpenClass = 'gd-overlay-open';

let openOverlayCount = 0;

export function lockOverlayScroll(): () => void {
  let released = false;
  const body = typeof document === 'undefined' ? null : document.body;

  openOverlayCount += 1;
  body?.classList.add(overlayOpenClass);

  return () => {
    if (released) {
      return;
    }

    released = true;
    openOverlayCount = Math.max(0, openOverlayCount - 1);

    if (openOverlayCount === 0) {
      body?.classList.remove(overlayOpenClass);
    }
  };
}
