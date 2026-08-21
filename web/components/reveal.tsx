'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Reveals its children with a fade-up once they scroll into view.
 *
 * Fails open: if IntersectionObserver is unavailable the content is shown
 * immediately, so a missing API can never leave the page blank.
 */
export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Start visible when the browser has no IntersectionObserver, decided during
  // the initial render so the effect never has to synchronously correct it.
  const [visible, setVisible] = useState(
    () => typeof IntersectionObserver === 'undefined',
  );

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const el = ref.current;
    if (!el) return;

    // A working observer always delivers an initial callback, even when the
    // element is off screen. We use that to tell "not scrolled there yet" apart
    // from "observer never ran".
    let delivered = false;

    const observer = new IntersectionObserver(
      (entries) => {
        delivered = true;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      // Trigger slightly before the section is fully on screen so the motion
      // reads as the section arriving, not catching up after it has landed.
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );

    observer.observe(el);

    // Safety net: every section on the page is gated behind this observer, so
    // a silent failure would leave the page blank. If no callback has arrived
    // at all, assume the observer is unusable here and show the content.
    // Checking `delivered` (rather than revealing outright) keeps the
    // scroll-triggered motion intact wherever the observer does work.
    const failSafe = window.setTimeout(() => {
      if (!delivered) setVisible(true);
    }, 2500);

    return () => {
      observer.disconnect();
      window.clearTimeout(failSafe);
    };
  }, []);

  return (
    <div
      ref={ref}
      data-visible={visible}
      className={`reveal ${className}`}
      style={{ '--delay': `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
