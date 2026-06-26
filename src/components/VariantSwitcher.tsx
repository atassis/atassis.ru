import { useState, useEffect } from 'preact/hooks';

const VARIANTS = [
  { id: 'a', label: 'A · Calm (editorial)', desc: 'serif body · Inter headings · 18px' },
  { id: 'd', label: 'D · Systems (technical)', desc: 'sans body · mono headings · compact 17px' },
];
const IDS = VARIANTS.map((x) => x.id);

/**
 * Dev preview tool. Personality (keys 1-3) is a LIVE override only — not persisted —
 * so each page keeps its own `register` default on reload. Theme (key m) IS persisted.
 */
export default function VariantSwitcher() {
  const [v, setV] = useState('a');
  const [dark, setDark] = useState(false);

  const applyVariant = (id: string) => {
    setV(id);
    document.documentElement.dataset.variant = id;
  };
  const applyTheme = (isDark: boolean) => {
    setDark(isDark);
    if (isDark) document.documentElement.dataset.theme = 'dark';
    else delete document.documentElement.dataset.theme;
    try { localStorage.setItem('theme', isDark ? 'dark' : 'light'); } catch { /* ignore */ }
  };

  useEffect(() => {
    // reflect the page's server-set register + already-applied theme (no override on load)
    const cur = document.documentElement.dataset.variant || 'a';
    setV(IDS.includes(cur) ? cur : 'a');
    setDark(document.documentElement.dataset.theme === 'dark');

    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const idx = ['1', '2'].indexOf(e.key);
      if (idx >= 0) {
        e.preventDefault();
        applyVariant(VARIANTS[idx].id);
      } else if (e.key === 'm') {
        e.preventDefault();
        applyTheme(document.documentElement.dataset.theme !== 'dark');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const btn = (active: boolean) => ({
    padding: '0.3rem 0.6rem', borderRadius: '3px', cursor: 'pointer',
    border: '1px solid ' + (active ? 'var(--color-accent)' : 'var(--color-rule)'),
    background: active ? 'var(--color-accent)' : 'transparent',
    color: active ? 'var(--color-paper)' : 'var(--color-ink)',
    fontFamily: 'inherit', fontSize: 'inherit',
  });

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60,
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        gap: '0.4rem', flexWrap: 'wrap', padding: '0.5rem',
        background: 'color-mix(in srgb, var(--color-paper) 86%, transparent)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        borderBottom: '1px solid var(--color-rule)',
        fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
      }}
    >
      {import.meta.env.DEV && (
        <>
          <span style={{ opacity: 0.55, marginRight: '0.2rem' }}>preview:</span>
          {VARIANTS.map((x, i) => (
            <button key={x.id} onClick={() => applyVariant(x.id)} title={x.desc} style={btn(v === x.id)}>
              <span style={{ opacity: 0.55 }}>{i + 1}</span> {x.label}
            </button>
          ))}
          <span style={{ width: '1px', height: '1.1rem', background: 'var(--color-rule)', margin: '0 0.3rem' }} />
        </>
      )}
      <button onClick={() => applyTheme(!dark)} title="toggle theme (m)" style={btn(dark)}>
        {dark ? '☀ light' : '☾ dark'}
      </button>
    </div>
  );
}
