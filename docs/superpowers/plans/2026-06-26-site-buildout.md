# Site Build-out Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the CV's depth onto atassis.ru — two receipt-backed flagship case pages, a skills-as-evidence section, a light About page — reusing the existing design system and verify signature.

**Architecture:** Hybrid depth. Extract the inline verify affordance into a reusable `Verify.astro` (used by home crowns + case pages). Add a `StatStrip.astro`. Add `/work/npu-engine`, `/work/kde-mcp` (technical register), `/about` (editorial). Enrich `/work` with case links + a Skills section. Update the top nav.

**Tech Stack:** Astro 7, Preact islands, Tailwind v4 (`@theme` tokens), self-hosted `@fontsource`. No test framework — verification is `bun run build` green + grep on `dist/` + localhost eyeball (Vitest is YAGNI for a personal site).

**Working context:** Direct in the repo (`~/repositories/ns/atassis/atassis-site`), not a worktree — the user's live-iteration flow. All `bun` commands MUST strip proxy env (Bun proxy bug): prefix with `env -u HTTPS_PROXY -u https_proxy -u HTTP_PROXY -u http_proxy`.

**Grounding rule:** Every number on a case page traces to the already-verified copy in `src/pages/work.astro` (live on the site) or the NPU KB at `~/repositories/ns/atassis/xdna2-asr-engine/docs/`. Do NOT invent numbers. No public receipt → honest text / `private` tag, never a verify button into "trust me".

---

## Task 1: Extract `Verify` component + global wiring + nav update

Foundation. Pull the verify markup/styles out of `index.astro` into `Verify.astro`; move the click/`v`-key wiring into `Base.astro` (global, works on every page); add `about` to the top nav and remove `verse` from it (verse stays in the footer). Home must look and behave identically afterward, plus gain a `→ full case` link on the NPU crown and the kde-mcp repo line.

**Files:**
- Create: `src/components/Verify.astro`
- Modify: `src/layouts/Base.astro` (top nav lines 38–44; verify wiring into the `<script>` at ~line 57)
- Modify: `src/pages/index.astro` (crown markup, repos data, remove inline verify `<script>` + verify `<style>` rules, add `caseLink`)

- [ ] **Step 1: Create `Verify.astro`**

`src/components/Verify.astro`:

```astro
---
interface Props {
  explain?: string | null;
  proof?: [string, string?][];
  status?: string | null;
  caseLink?: string | null;
}
const { explain = null, proof = [], status = null, caseLink = null } = Astro.props;
---
{proof.length > 0 ? (
  <div class="verify">
    <button class="verify-btn" type="button" aria-expanded="false">&#9656; verify</button>
    <div class="verify-panel">
      {explain && <p class="verify-explain">{explain}</p>}
      <p class="verify-proof">
        <span class="ok">&check;</span>{' '}
        {proof.map((p, k) => (
          <>
            {k > 0 && ' · '}
            {p[1] ? <a href={p[1]}>{p[0]}</a> : <span>{p[0]}</span>}
          </>
        ))}
        {caseLink && <> · <a href={caseLink}>&rarr; full case</a></>}
      </p>
    </div>
  </div>
) : (
  <span class="status">{status}</span>
)}

<style>
  .verify-btn { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-accent); background: none; border: none; padding: 0; cursor: pointer; }
  .verify-btn:hover { text-decoration: underline; text-underline-offset: 3px; }
  .status { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-muted); opacity: 0.7; }
  .verify-panel { overflow: hidden; max-height: 0; opacity: 0; transition: max-height 0.25s ease, opacity 0.2s ease; }
  .verify.is-open .verify-panel { max-height: 16rem; opacity: 1; margin-top: calc(var(--rhythm) * 0.35); }
  .verify-explain { margin: 0; font-size: var(--text-xs); color: var(--color-muted); line-height: calc(var(--rhythm) * 0.85); }
  .verify-proof { margin: calc(var(--rhythm) * 0.3) 0 0; font-family: var(--font-mono); font-size: var(--text-xs); line-height: calc(var(--rhythm) * 0.85); }
  .ok { color: var(--color-accent); }
  @media (prefers-reduced-motion: reduce) { .verify-panel { transition: none; } }
</style>
```

- [ ] **Step 2: Add global verify wiring to `Base.astro`**

In `src/layouts/Base.astro`, inside the existing `<script>` block (the one with `__themeWired`, after the theme keydown listener and BEFORE the closing `</script>` / the `astro:after-swap` listener), add:

```javascript
      if (!window.__verifyWired) {
        window.__verifyWired = true;
        function __setVerify(v, open) {
          v.classList.toggle('is-open', open);
          var b = v.querySelector('.verify-btn');
          if (b) { b.setAttribute('aria-expanded', String(open)); b.textContent = open ? '▾ verified · hide' : '▸ verify'; }
        }
        document.addEventListener('click', function (e) {
          var btn = e.target && e.target.closest && e.target.closest('.verify-btn');
          if (!btn) return;
          var v = btn.closest('.verify');
          if (v) __setVerify(v, !v.classList.contains('is-open'));
        });
        document.addEventListener('keydown', function (e) {
          if (e.key !== 'v') return;
          var t = e.target;
          if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
          var vs = Array.from(document.querySelectorAll('.verify'));
          if (!vs.length) return;
          var anyClosed = vs.some(function (v) { return !v.classList.contains('is-open'); });
          vs.forEach(function (v) { __setVerify(v, anyClosed); });
        });
      }
```

- [ ] **Step 3: Update the top nav in `Base.astro`**

Replace the `<nav class="topnav">` block (lines 38–44) so it reads `home · work · about · writing` (remove `verse`, add `about`), keeping the theme-toggle button:

```astro
        <nav class="topnav">
          <a href="/">home</a>
          <a href="/work">work</a>
          <a href="/about">about</a>
          <a href="/writing/why-this-site">writing</a>
          <button class="theme-toggle" type="button" aria-label="Toggle dark theme (m)" aria-keyshortcuts="m"><span class="ico">&#9790;</span><kbd class="k">m</kbd></button>
        </nav>
```

- [ ] **Step 4: Refactor `index.astro` to use `Verify`**

In `src/pages/index.astro`:

(a) Add the import after the existing `VariantSwitcher` import:
```astro
import Verify from '../components/Verify.astro';
```

(b) Add a `caseLink` to the NPU crown object (first crown) — add `caseLink: '/work/npu-engine'` next to its `status: null`. Leave the other two crowns without `caseLink`.

(c) Replace the crown verify block — the `<div class="crown__verify">…</div>` and everything the `.proof.length > 0 ? (…) : (…)` ternary rendered (the inline `<button class="verify-btn">`, `<div class="verify-panel">`, and `<span class="status">`) — with a single component call:
```astro
          <div class="crown__verify">
            <Verify explain={c.explain} proof={c.proof} status={c.status} caseLink={c.caseLink} />
          </div>
```

(d) Add `read the case` to the kde-mcp repo line. Change the repos `.map` render so a repo can carry an optional case link. Replace the repos array's kde-mcp entry to add a 4th element and update the map:
```astro
const repos = [
  ['kde-mcp', 'https://github.com/atassis/kde-mcp', 'computer-use MCP server for the Linux desktop (KDE/Wayland) — accessibility-tree-first, not pixel-clicks.', '/work/kde-mcp'],
  ['tnl', 'https://github.com/atassis/tnl', 'self-hosted ngrok alternative: one-command reverse tunnels behind your own Caddy.'],
  ['evbridge', 'https://github.com/atassis/evbridge', 'evdev→Wayland input bridge for headless / nested compositors.'],
  ['run-script-webpack-plugin', 'https://github.com/atassis/run-script-webpack-plugin', 'in NestJS’ official HMR docs; ~600K npm downloads/mo.'],
  ['rethinkdb-ts', 'https://github.com/rethinkdb/rethinkdb-ts', 'top contributor (~63% of commits, 9+ merged PRs incl. releases).'],
];
```
And the repos map render:
```astro
      {repos.map(([name, url, desc, caseLink]) => (
        <p class="repo">
          <a class="repo__name" href={url}>{name}</a>
          <span class="muted"> &mdash; {desc}</span>
          {caseLink && <span class="muted"> · <a href={caseLink}>read the case</a></span>}
        </p>
      ))}
```

(e) Delete the inline verify `<script>` block (the `setCrown` / `__verifyWired` script, ~lines 112–139) entirely — wiring now lives in `Base.astro`.

(f) Delete the now-unused verify `<style>` rules from `index.astro`: `.verify-btn`, `.verify-btn:hover`, `.status`, `.verify-panel`, `.crown.is-open .verify-panel`, `.verify-explain`, `.verify-proof`, `.ok`, and the `@media (prefers-reduced-motion: reduce) { .verify-panel … }` block. KEEP all `.crown`, `.crown__claim`, `.crown__verify`, `.grid`, `.label`, `.hint`, `.repo`, `.wrap`, `.lede` rules and the responsive `@media (max-width: 820px)` block.

- [ ] **Step 5: Build and grep-verify**

Run: `env -u HTTPS_PROXY -u https_proxy -u HTTP_PROXY -u http_proxy bun run build`
Expected: `Complete!`, 5 pages built, no errors.

Then:
```bash
grep -c 'class="verify"' dist/index.html        # expect >= 2 (NPU + zed/helm crowns)
grep -o '/work/npu-engine' dist/index.html | head -1   # expect the NPU case link present
grep -o 'read the case' dist/index.html | head -1      # expect kde-mcp case link present
grep -c 'about' dist/index.html                  # expect >=1 (nav link)
```

- [ ] **Step 6: Eyeball on localhost**

Run: `env -u HTTPS_PROXY -u https_proxy -u HTTP_PROXY -u http_proxy bun run dev`
Confirm on `http://localhost:4321/`: crowns toggle on click, `v` toggles all, NPU crown panel shows `→ full case`, dark theme persists, nav shows `home · work · about · writing`. Stop dev when done.

- [ ] **Step 7: Commit**

```bash
git add src/components/Verify.astro src/layouts/Base.astro src/pages/index.astro
git commit -m "Extract Verify component, global wiring, nav: add about / drop verse from top"
```

---

## Task 2: `StatStrip` component

A small data-driven stat strip reused by both case pages.

**Files:**
- Create: `src/components/StatStrip.astro`

- [ ] **Step 1: Create `StatStrip.astro`**

`src/components/StatStrip.astro`:

```astro
---
interface Props { stats: [string, string][]; }
const { stats } = Astro.props;
---
<dl class="stats">
  {stats.map(([label, value]) => (
    <div class="stat">
      <dt class="stat__value">{value}</dt>
      <dd class="stat__label">{label}</dd>
    </div>
  ))}
</dl>
<style>
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(7rem, 1fr)); gap: var(--rhythm) 1.5rem; margin: var(--rhythm) 0; padding: var(--rhythm) 0; border-top: 1px solid var(--color-rule); border-bottom: 1px solid var(--color-rule); }
  .stat { margin: 0; }
  .stat__value { font-family: var(--font-mono); font-weight: 600; font-size: var(--text-lg); color: var(--color-accent); margin: 0; line-height: 1.2; }
  .stat__label { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-muted); margin: calc(var(--rhythm) * 0.15) 0 0; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/StatStrip.astro
git commit -m "Add StatStrip component for case pages"
```

---

## Task 3: NPU engine case page (`/work/npu-engine`)

Flagship case. All numbers from `src/pages/work.astro`'s NPU entry (already live/verified).

**Files:**
- Create: `src/pages/work/npu-engine.astro`

- [ ] **Step 1: Create the page**

`src/pages/work/npu-engine.astro`:

```astro
---
import Base from '../../layouts/Base.astro';
import VariantSwitcher from '../../components/VariantSwitcher';
import StatStrip from '../../components/StatStrip.astro';
import Verify from '../../components/Verify.astro';

const stats: [string, string][] = [
  ['models', '16 / 11 archs'],
  ['dispatch per token', '72 → 1'],
  ['energy vs CPU', '−29%'],
  ['accuracy', 'WER 0.117'],
  ['numerical parity', '~4e-3'],
  ['prior OSS high-water', '~0.6% util'],
];

const proof: [string, string?][] = [
  ['mlir-aie #3178', 'https://github.com/Xilinx/mlir-aie/pull/3178'],
  ['amd/IRON #123', 'https://github.com/amd/IRON/pull/123'],
];
---
<Base title="NPU inference engine — Taimuraz Kaitmazov" register="technical">
  <VariantSwitcher client:load />
  <main class="wrap">
    <p class="back"><a href="/work">← work</a></p>
    <header class="lede">
      <h1>On-device NPU inference engine</h1>
      <p class="muted">AMD Ryzen AI (XDNA2), Linux. A from-scratch engine running whole model graphs natively on the laptop NPU — at roughly half the CPU's package power.</p>
    </header>

    <section class="lede">
      <h2 class="label">The bar before me</h2>
      <p>On Linux, the open-source high-water mark for this NPU was a single matmul at ~0.6% utilization, and AMD's own Linux stack offloads zero ops to it. Running real model graphs — transformers, ASR, vision, protein models — natively on the part, end to end, was simply not a thing that existed.</p>
    </section>

    <section class="lede">
      <h2 class="label">What I built</h2>
      <p>An inference engine on the open MLIR-AIE / IRON stack that compiles and runs 16 models across 11 architectures natively on the NPU — BERT · Whisper / Parakeet / GigaAM · ViT / DINOv2 / ResNet-18 / CLIP · ESM-2 — at numerical parity ~4e-3 against the reference implementations.</p>
      <p>The core trick is collapsing a 12-layer transformer decode into a single NPU dispatch — 72 dispatches per token down to 1 — with weights and the KV cache resident on the device, so each token isn't paying host round-trip and re-upload costs. Making the compiler survive graphs this size meant fixing AMD's compiler and operators upstream (an O(n²) pass cut to linear, ~58% off aiecc, byte-identical output preserved).</p>
    </section>

    <StatStrip stats={stats} />

    <section class="lede">
      <p>At equal accuracy (WER 0.117 on speech), the engine runs at −29% energy and roughly half the package power of the same workload on the CPU — the point of an NPU, finally realized on this Linux stack.</p>
    </section>

    <section class="lede">
      <h2 class="label">Verify</h2>
      <p class="muted small">The engine itself isn't public yet (AGPL, in progress) — but the compiler/operator work it required is, and it's third-party-merged. Open the receipts:</p>
      <Verify explain="Both PRs read “Merged” in AMD's own repos — the compiler/operator fixes the engine needed at scale, accepted by the maintainers, not by me." proof={proof} />
    </section>

    <nav class="casenav">
      <a href="/work">← all work</a>
      <a href="/work/kde-mcp">kde-mcp →</a>
    </nav>
  </main>
</Base>

<style>
  .wrap { max-width: 54rem; margin: 0 auto; padding: calc(var(--rhythm) * 1.2) 1.5rem calc(var(--rhythm) * 3); }
  .lede { max-width: var(--measure-prose); }
  .muted { color: var(--color-muted); }
  .small { font-size: var(--text-sm); }
  .back { font-family: var(--font-mono); font-size: var(--text-xs); margin: 0 0 var(--rhythm); }
  h1 { font-family: var(--font-sans); font-weight: 700; font-size: var(--text-3xl); line-height: 1.1; margin: 0 0 calc(var(--rhythm) * 0.5); }
  section { margin-bottom: calc(var(--rhythm) * 1.5); }
  p { text-wrap: pretty; }
  .label {
    font-family: var(--font-mono); font-size: var(--text-sm); text-transform: uppercase;
    letter-spacing: 0.08em; color: var(--color-accent);
    border-bottom: 1px solid var(--color-rule); padding-bottom: calc(var(--rhythm) * 0.25);
    margin: 0 0 var(--rhythm);
  }
  .casenav { display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: var(--text-xs); border-top: 1px solid var(--color-rule); padding-top: var(--rhythm); margin-top: calc(var(--rhythm) * 2); }
</style>
```

- [ ] **Step 2: Build and grep-verify**

Run: `env -u HTTPS_PROXY -u https_proxy -u HTTP_PROXY -u http_proxy bun run build`
Expected: `Complete!`, 6 pages built, `/work/npu-engine/index.html` listed.

```bash
grep -o 'WER 0.117' dist/work/npu-engine/index.html | head -1   # expect present
grep -o 'class="verify"' dist/work/npu-engine/index.html | head -1   # expect present
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/work/npu-engine.astro
git commit -m "Add NPU engine flagship case page"
```

---

## Task 4: kde-mcp case page (`/work/kde-mcp`)

Flagship case. Facts from `work.astro`'s kde-mcp entry; the repo is public so the receipt is the repo itself.

**Files:**
- Create: `src/pages/work/kde-mcp.astro`

- [ ] **Step 1: Create the page**

`src/pages/work/kde-mcp.astro`:

```astro
---
import Base from '../../layouts/Base.astro';
import VariantSwitcher from '../../components/VariantSwitcher';
import StatStrip from '../../components/StatStrip.astro';
import Verify from '../../components/Verify.astro';

const stats: [string, string][] = [
  ['language', 'Rust'],
  ['target', 'KDE Plasma 6 / Wayland'],
  ['drives apps via', 'a11y tree'],
  ['safety', 'policy gate · ADR'],
];

const proof: [string, string?][] = [
  ['github.com/atassis/kde-mcp', 'https://github.com/atassis/kde-mcp'],
];
---
<Base title="kde-mcp — Taimuraz Kaitmazov" register="technical">
  <VariantSwitcher client:load />
  <main class="wrap">
    <p class="back"><a href="/work">← work</a></p>
    <header class="lede">
      <h1>kde-mcp — computer-use for the Linux desktop</h1>
      <p class="muted">An MCP server that lets an agent actually drive a Linux (KDE Plasma 6 / Wayland) desktop — the kind of capability Anthropic ships for macOS and Windows, still rare on Linux. Built from scratch, solo, in Rust.</p>
    </header>

    <section class="lede">
      <h2 class="label">The bar before me</h2>
      <p>Computer-use tooling is mature on macOS and Windows and thin on Linux — and what exists tends to lean on pixel-level screenshots and coordinate clicks, which are brittle and unsafe (a moved window or a re-theme breaks them). Wayland's security model makes naive screen-scraping harder still.</p>
    </section>

    <section class="lede">
      <h2 class="label">What I built</h2>
      <p>kde-mcp drives applications through the accessibility tree — the same structured interface a screen reader uses — rather than by clicking pixels. The agent acts on named, typed elements, so actions are more reliable and far easier to reason about and gate. A safety policy layer sits in front of destructive actions, and the design decisions are written down as ADRs rather than living in my head.</p>
    </section>

    <StatStrip stats={stats} />

    <section class="lede">
      <h2 class="label">Verify</h2>
      <p class="muted small">It's open source — read the code, the ADRs, and the safety policy:</p>
      <Verify explain="Public repository — the accessibility-tree approach, the safety gate, and the ADRs are all in the open." proof={proof} />
    </section>

    <nav class="casenav">
      <a href="/work/npu-engine">← npu engine</a>
      <a href="/work">all work →</a>
    </nav>
  </main>
</Base>

<style>
  .wrap { max-width: 54rem; margin: 0 auto; padding: calc(var(--rhythm) * 1.2) 1.5rem calc(var(--rhythm) * 3); }
  .lede { max-width: var(--measure-prose); }
  .muted { color: var(--color-muted); }
  .small { font-size: var(--text-sm); }
  .back { font-family: var(--font-mono); font-size: var(--text-xs); margin: 0 0 var(--rhythm); }
  h1 { font-family: var(--font-sans); font-weight: 700; font-size: var(--text-3xl); line-height: 1.1; margin: 0 0 calc(var(--rhythm) * 0.5); }
  section { margin-bottom: calc(var(--rhythm) * 1.5); }
  p { text-wrap: pretty; }
  .label {
    font-family: var(--font-mono); font-size: var(--text-sm); text-transform: uppercase;
    letter-spacing: 0.08em; color: var(--color-accent);
    border-bottom: 1px solid var(--color-rule); padding-bottom: calc(var(--rhythm) * 0.25);
    margin: 0 0 var(--rhythm);
  }
  .casenav { display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: var(--text-xs); border-top: 1px solid var(--color-rule); padding-top: var(--rhythm); margin-top: calc(var(--rhythm) * 2); }
</style>
```

- [ ] **Step 2: Build and grep-verify**

Run: `env -u HTTPS_PROXY -u https_proxy -u HTTP_PROXY -u http_proxy bun run build`
Expected: `Complete!`, 7 pages built, `/work/kde-mcp/index.html` listed.

```bash
grep -o 'accessibility tree' dist/work/kde-mcp/index.html | head -1   # expect present
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/work/kde-mcp.astro
git commit -m "Add kde-mcp flagship case page"
```

---

## Task 5: Enrich `/work` — case links on cards + Skills-as-evidence section

**Files:**
- Modify: `src/pages/work.astro` (projects render ~lines 65–84; add a Skills section before the final `More` section; add styles)

- [ ] **Step 1: Add a `caseLink` to the NPU and kde-mcp project objects**

In `src/pages/work.astro`, add `caseLink: '/work/npu-engine'` to the first project object (NPU) and `caseLink: '/work/kde-mcp'` to the kde-mcp project object (the one titled `kde-mcp — computer-use MCP for the Linux desktop`). Leave the other four projects without it.

- [ ] **Step 2: Render the case link in the project card**

Replace the `.proj__meta` paragraph render so it appends a `read the case →` link when `caseLink` is set. The `<article class="proj">` map body becomes:

```astro
      {projects.map((p) => (
        <article class="proj">
          <h3 class="proj__title">{p.title}</h3>
          <p class="proj__body">{p.body}</p>
          <p class="proj__meta">
            {p.meta}
            {p.proof.length > 0 && (
              <>
                {' · '}
                {p.proof.map((pr, i) => (
                  <>
                    {i > 0 && ' · '}
                    <a href={pr[1]}>{pr[0]}</a>
                  </>
                ))}
              </>
            )}
            {p.caseLink && <> · <a href={p.caseLink}>read the case →</a></>}
          </p>
        </article>
      ))}
```

- [ ] **Step 3: Add the Skills data and section**

In the frontmatter of `work.astro`, after the `experience` array, add:

```astro
const skills: [string, [string, string?][]][] = [
  ['Languages', [
    ['Rust → kde-mcp', '/work/kde-mcp'],
    ['Rust → tnl', 'https://github.com/atassis/tnl'],
    ['Rust → NPU engine', '/work/npu-engine'],
    ['Go → 1С MCP server'],
    ['TypeScript → rethinkdb-ts', 'https://github.com/rethinkdb/rethinkdb-ts'],
    ['TypeScript → run-script-webpack-plugin', 'https://github.com/atassis/run-script-webpack-plugin'],
    ['Python → vLLM / OCR pipelines'],
  ]],
  ['Systems / infra', [
    ['Kubernetes · Helm → helm-diff #294', 'https://github.com/databus23/helm-diff/pull/294'],
    ['vLLM on H100'],
    ['ClickHouse'],
    ['MLIR / compiler internals → mlir-aie #3178', 'https://github.com/Xilinx/mlir-aie/pull/3178'],
  ]],
  ['AI / ML', [
    ['on-device NPU inference → NPU engine', '/work/npu-engine'],
    ['LLM agents / MCP → kde-mcp', '/work/kde-mcp'],
    ['speculative decoding → vllm #44698', 'https://github.com/vllm-project/vllm/pull/44698'],
    ['OCR → LLM gold-set methodology'],
  ]],
  ['Linux desktop', [
    ['Wayland / KDE internals → kde-mcp', '/work/kde-mcp'],
    ['evdev → Wayland input → evbridge', 'https://github.com/atassis/evbridge'],
    ['accessibility-tree automation'],
  ]],
];
```

- [ ] **Step 4: Render the Skills section**

In `work.astro`, insert this `<section>` immediately BEFORE the final `<section class="lede">` that contains `<h2 class="label">More</h2>`:

```astro
    <section>
      <h2 class="label">Skills — each links to its receipt</h2>
      <p class="skills-hint muted">Not a self-rated cloud. Where a claim has a public proof, it links to it; where it doesn't, it's plain text — same honesty as the private tags above.</p>
      {skills.map(([group, items]) => (
        <div class="skillrow">
          <p class="skillrow__group">{group}</p>
          <p class="skillrow__items">
            {items.map((it, i) => (
              <>
                {i > 0 && <span class="sep"> · </span>}
                {it[1] ? <a href={it[1]}>{it[0]}</a> : <span class="muted">{it[0]}</span>}
              </>
            ))}
          </p>
        </div>
      ))}
    </section>
```

- [ ] **Step 5: Add Skills styles**

Add to the `<style>` block in `work.astro`:

```css
  .skills-hint { max-width: var(--measure-prose); font-size: var(--text-sm); margin: 0 0 var(--rhythm); }
  .skillrow { display: grid; grid-template-columns: 9rem 1fr; gap: 0 1.5rem; margin-bottom: var(--rhythm); align-items: baseline; }
  .skillrow__group { font-family: var(--font-mono); font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-muted); margin: 0; }
  .skillrow__items { font-family: var(--font-mono); font-size: var(--text-sm); margin: 0; line-height: var(--rhythm); }
  .skillrow .sep { color: var(--color-rule); }
  @media (max-width: 720px) { .skillrow { grid-template-columns: 1fr; gap: 0; } .skillrow__group { margin-bottom: calc(var(--rhythm) * 0.15); } }
```

- [ ] **Step 6: Build and grep-verify**

Run: `env -u HTTPS_PROXY -u https_proxy -u HTTP_PROXY -u http_proxy bun run build`
Expected: `Complete!`

```bash
grep -o 'read the case' dist/work/index.html | head -1   # expect present on cards
grep -o 'Skills' dist/work/index.html | head -1          # expect section present
grep -o '/work/npu-engine' dist/work/index.html | head -1  # expect skills/case links resolve
```

- [ ] **Step 7: Commit**

```bash
git add src/pages/work.astro
git commit -m "Enrich /work: case links on cards + skills-as-evidence section"
```

---

## Task 6: About / Colophon page (`/about`)

Light, editorial register. Draft voice — user edits per his case-by-case rule.

**Files:**
- Create: `src/pages/about.astro`

- [ ] **Step 1: Create the page**

`src/pages/about.astro`:

```astro
---
import Base from '../layouts/Base.astro';
import VariantSwitcher from '../components/VariantSwitcher';
---
<Base title="About — Taimuraz Kaitmazov" register="editorial">
  <VariantSwitcher client:load />
  <main class="wrap">
    <header class="lede">
      <h1>About</h1>
    </header>

    <section class="lede">
      <p>I'm the person who builds the thing, not the one who sells it. Given an unfamiliar stack — a laptop NPU, a Wayland compositor, someone's accounting platform — my instinct is to go all the way down until I actually understand it, then build something correct on top.</p>
    </section>

    <section class="lede">
      <h2 class="label">How I work</h2>
      <p>AI does a lot of the typing now. My job is making sure it's actually right — checked against real benchmarks, labeled gold-sets, WER gates, byte-exact diffs — not just plausible output that reads well and falls over in production. The strongest version of that on this site is the verify signature: most claims open to their receipt, and where there's no public proof, I say so plainly instead of dressing it up.</p>
    </section>

    <section class="lede">
      <h2 class="label">Availability</h2>
      <p class="muted">Remote-first · open to relocation · Moscow (UTC+3)</p>
      <p>
        <a href="mailto:atassikay38@gmail.com">atassikay38@gmail.com</a>
        <span class="muted"> · </span>
        <a href="https://github.com/atassis">github.com/atassis</a>
      </p>
    </section>

    <section class="lede">
      <h2 class="label">Colophon</h2>
      <p class="muted small">Built with Astro and self-hosted type (Source Serif 4, Inter, IBM Plex). No analytics, no CDN fonts. Every claim that can open to its receipt does — see <a href="/writing/why-this-site">why this site</a>.</p>
    </section>
  </main>
</Base>

<style>
  .wrap { max-width: 54rem; margin: 0 auto; padding: calc(var(--rhythm) * 1.2) 1.5rem calc(var(--rhythm) * 3); }
  .lede { max-width: var(--measure-prose); }
  .muted { color: var(--color-muted); }
  .small { font-size: var(--text-sm); }
  h1 { font-family: var(--font-sans); font-weight: 700; font-size: var(--text-4xl); line-height: 1.08; margin: 0 0 var(--rhythm); }
  section { margin-bottom: calc(var(--rhythm) * 1.5); }
  p { text-wrap: pretty; }
  .label {
    font-family: var(--font-mono); font-size: var(--text-sm); text-transform: uppercase;
    letter-spacing: 0.08em; color: var(--color-accent);
    border-bottom: 1px solid var(--color-rule); padding-bottom: calc(var(--rhythm) * 0.25);
    margin: 0 0 calc(var(--rhythm) * 0.75);
  }
</style>
```

- [ ] **Step 2: Build and grep-verify**

Run: `env -u HTTPS_PROXY -u https_proxy -u HTTP_PROXY -u http_proxy bun run build`
Expected: `Complete!`, `/about/index.html` listed.

```bash
grep -o 'Remote-first' dist/about/index.html | head -1   # expect present
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/about.astro
git commit -m "Add light About / Colophon page"
```

---

## Task 7: Full build, localhost review, push, redeploy, live-verify

**Files:** none (build + deploy)

- [ ] **Step 1: Clean full build**

Run: `env -u HTTPS_PROXY -u https_proxy -u HTTP_PROXY -u http_proxy bun run build`
Expected: `Complete!`, 8 pages (`/`, `/work`, `/work/npu-engine`, `/work/kde-mcp`, `/about`, `/writing/why-this-site`, `/verse`, `/lab`). Confirm `dist/.nojekyll` and `dist/CNAME` (`atassis.ru`) exist.

- [ ] **Step 2: Localhost eyeball (user's loop)**

Run dev, walk every new page + verify toggles + dark theme + nav, on desktop and a narrow width. Get user sign-off before deploying.

- [ ] **Step 3: Push source to main**

```bash
git push origin main
```
(HTTPS via gh token — never SSH; KeePassXC may be locked.)

- [ ] **Step 4: Deploy `dist/` to gh-pages**

```bash
cd dist && ls .nojekyll CNAME >/dev/null 2>&1 || { echo "MISSING GUARDS — abort"; exit 1; }
TOKEN=$(gh auth token)
rm -rf .git; git init -q; git checkout -q -b gh-pages; git add -A
git -c user.name="atassis" -c user.email="atassikay38@gmail.com" commit -q -m "Deploy: case pages, skills, about"
env -u HTTPS_PROXY -u https_proxy -u HTTP_PROXY -u http_proxy git push -f "https://atassis:${TOKEN}@github.com/atassis/atassis.ru.git" gh-pages
rm -rf .git; cd ..
```

- [ ] **Step 5: Wait for the Pages build, then live-verify**

Poll `gh api repos/atassis/atassis.ru/pages/builds/latest` until `built`, then:
```bash
for u in / /work/ /work/npu-engine/ /work/kde-mcp/ /about/; do
  curl -s -o /dev/null -w "$u -> %{http_code}\n" "https://atassis.ru$u"
done
```
Expected: all `200`.

---

## Self-review notes

- **Spec coverage:** hybrid depth → Tasks 3,4; flagships=NPU+kde-mcp → Tasks 3,4; skills-as-evidence on /work → Task 5; light About → Task 6; nav (about in, verse to footer) → Task 1 Step 3; Verify extraction (DRY) → Task 1; StatStrip → Task 2; optional crown→case link → Task 1 Step 4b/4d; grounding (no invented numbers) → all numbers sourced from work.astro; deploy/verify → Task 7. No gaps.
- **No placeholders:** every step has full code or exact commands + expected output.
- **Type consistency:** `Verify` props (`explain`, `proof`, `status`, `caseLink`) used identically in index/case pages; `StatStrip` `stats: [string,string][]` consistent; verify container class `.verify` + `.is-open` consistent between component markup (Task 1 Step 1) and wiring (Task 1 Step 2).
