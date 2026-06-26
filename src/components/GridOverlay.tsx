import { useState, useEffect } from 'preact/hooks';

/**
 * Toggleable design overlay: baseline rhythm lines + 12-column guides.
 * Press `g` or click the button. Lets you eyeball whether elements sit on the grid.
 */
export default function GridOverlay() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOn((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <button
        onClick={() => setOn((v) => !v)}
        style={{
          position: 'fixed', right: '1rem', bottom: '1rem', zIndex: 60,
          fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
          padding: '0.4rem 0.7rem', borderRadius: '2px',
          border: '1px solid var(--color-rule)',
          background: 'var(--color-paper)', color: 'var(--color-ink)',
          cursor: 'pointer',
        }}
      >
        grid: {on ? 'on' : 'off'} <span class="k">g</span>
      </button>

      {on && (
        <div aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 55 }}>
          {/* baseline rhythm lines */}
          <div
            style={{
              position: 'absolute', inset: 0,
              backgroundImage:
                'repeating-linear-gradient(to bottom, color-mix(in srgb, var(--color-accent) 22%, transparent) 0, color-mix(in srgb, var(--color-accent) 22%, transparent) 1px, transparent 1px, transparent var(--rhythm))',
            }}
          />
          {/* 12-column guides, aligned to the content container */}
          <div
            style={{
              maxWidth: 'var(--grid-max)', height: '100%', margin: '0 auto',
              padding: '0 1.5rem', display: 'grid',
              gridTemplateColumns: 'repeat(12, 1fr)', gap: 'var(--col-gap)',
            }}
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={{ background: 'color-mix(in srgb, var(--color-accent) 7%, transparent)' }} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
