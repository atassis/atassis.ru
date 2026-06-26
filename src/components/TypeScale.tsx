import { useState, useEffect, useRef } from 'preact/hooks';

const TOKENS: [string, string][] = [
  ['--text-4xl', 'Verify against ground truth'],
  ['--text-3xl', 'Selected work'],
  ['--text-2xl', 'On-device NPU inference'],
  ['--text-xl', 'Heading four'],
  ['--text-lg', 'Lead / large body'],
  ['--text-base', 'Body text'],
  ['--text-sm', 'Small / captions'],
  ['--text-xs', 'Micro / labels'],
];

/** Renders the type scale and reads the REAL resolved rem + rendered px per variant. */
export default function TypeScale() {
  const refs = useRef<(HTMLSpanElement | null)[]>([]);
  const [rows, setRows] = useState(TOKENS.map(() => ({ rem: '…', px: '…' })));
  const [root, setRoot] = useState('…');

  useEffect(() => {
    const measure = () => {
      const cs = getComputedStyle(document.documentElement);
      setRoot(cs.fontSize);
      setRows(
        TOKENS.map(([tok], i) => {
          const rem = cs.getPropertyValue(tok).trim();
          const el = refs.current[i];
          const px = el ? getComputedStyle(el).fontSize : '';
          return { rem, px };
        }),
      );
    };

    measure();
    const mo = new MutationObserver(measure);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-variant'] });
    const fonts = (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts;
    fonts?.ready?.then(measure);
    window.addEventListener('resize', measure);
    return () => {
      mo.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  return (
    <div>
      <p
        style={{
          fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)',
          color: 'var(--color-muted)', margin: '0 0 var(--rhythm)',
        }}
      >
        root font-size: <b>{root}</b> &middot; numbers below are read live from the rendered page
      </p>
      {TOKENS.map(([tok, sample], i) => (
        <div
          key={tok}
          style={{ display: 'flex', alignItems: 'baseline', gap: '1.5rem', marginBottom: 'calc(var(--rhythm)*0.5)' }}
        >
          <code
            style={{
              fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)',
              color: 'var(--color-muted)', width: '13rem', flex: 'none',
            }}
          >
            {tok.replace('--text-', '')} &middot; {rows[i].rem} &middot; {rows[i].px}
          </code>
          <span
            ref={(el) => (refs.current[i] = el)}
            style={{ fontSize: `var(${tok})`, lineHeight: 'var(--rhythm)' }}
          >
            {sample}
          </span>
        </div>
      ))}
    </div>
  );
}
