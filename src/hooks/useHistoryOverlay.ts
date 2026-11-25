import { useEffect, useRef } from 'react';

/**
 * Syncs a modal/overlay open state with the browser's History API so that
 * mobile hardware Back buttons and swipe-back gestures close the overlay cleanly
 * instead of navigating away from the current portal page.
 */
export function useHistoryOverlay(
  isOpen: boolean,
  overlayId: string,
  onClose: () => void
) {
  const ownsEntryRef = useRef(false);
  const closedByPopRef = useRef(false);
  const prevOpenRef = useRef(isOpen);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      const currentOverlay = window.history.state?.bmasaOverlay;
      if (ownsEntryRef.current && currentOverlay !== overlayId) {
        ownsEntryRef.current = false;
        closedByPopRef.current = true;
        onCloseRef.current();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [overlayId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = isOpen;

    if (!wasOpen && isOpen) {
      closedByPopRef.current = false;
      if (window.history.state?.bmasaOverlay !== overlayId) {
        window.history.pushState(
          { ...(window.history.state || {}), bmasaOverlay: overlayId },
          '',
          window.location.href
        );
        ownsEntryRef.current = true;
      } else {
        ownsEntryRef.current = false;
      }
      return;
    }

    if (wasOpen && !isOpen) {
      if (closedByPopRef.current) {
        closedByPopRef.current = false;
        return;
      }
      if (ownsEntryRef.current) {
        ownsEntryRef.current = false;
        if (window.history.state?.bmasaOverlay === overlayId) {
          window.history.back();
        }
      }
    }
  }, [isOpen, overlayId]);
}
