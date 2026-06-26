import { useState, useEffect } from 'preact/hooks';

const VARIANTS = [
  { id: 'a', label: 'A · editorial' },
  { id: 'd', label: 'D · technical' },
];
const IDS = VARIANTS.map((x) => x.id);

/** DEV-only register preview (keys 1/2). Hidden in production. Theme toggle lives in the header. */
export default function VariantSwitcher() {
  if (!import.meta.env.DEV) return null;

  const [v, setV] = useState('a');
  const applyVariant = (id: string) => {
    setV(id);
    document.documentElement.dataset.variant = id;
  };

  useEffect(() => {
    const cur = document.documentElement.dataset.variant || 'a';
    setV(IDS.includes(cur) ? cur : 'a');
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const i = ['1', '2'].indexOf(e.key);
      if (i >= 0) { e.preventDefault(); applyVariant(VARIANTS[i].id); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{
      position: 'fixed', left: '1rem', bottom: '1rem', zIndex: 60,
      display: 'flex', gap: '0.4rem', fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
    }}>
      {VARIANTS.map((x, i) => (
        <button
          key={x.id}
          onClick={() => applyVariant(x.id)}
          style={{
            padding: '0.3rem 0.55rem', borderRadius: '3px', cursor: 'pointer',
            border: '1px solid ' + (v === x.id ? 'var(--color-accent)' : 'var(--color-rule)'),
            background: v === x.id ? 'var(--color-accent)' : 'var(--color-paper)',
            color: v === x.id ? 'var(--color-paper)' : 'var(--color-ink)',
            fontFamily: 'inherit', fontSize: 'inherit',
          }}
        >
          <span style={{ opacity: 0.55 }}>{i + 1}</span> {x.label}
        </button>
      ))}
    </div>
  );
}
