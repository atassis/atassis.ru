# atassis.ru build-out — design spec

**Date:** 2026-06-26
**Status:** approved (design), pending implementation plan
**Goal:** Bring the CV's depth onto the live site (currently a skeleton vs the fuller CV), without inventing a new visual language or betraying the "show-don't-tell / verify against ground truth" spine.

## Decisions (locked with the user)

1. **Depth model = hybrid.** A few flagship projects get their own deep case-study pages; everything else stays as enriched cards on `/work`.
2. **Flagship case pages = 2, both receipt-backed:** `/work/npu-engine`, `/work/kde-mcp`. The accounting-AI project stays a `private` card on `/work` (no public receipts + employer confidentiality → a deep page would have no verify payload, violating the spine).
3. **Skills = "skills-as-evidence" (option B), as a section on `/work`** (no standalone `/skills` URL yet). Each skill links to the receipt/project that proves it; skills with no public receipt are plain text (honest, like `private` crowns). Graduates to its own page later if it lands.
4. **About = light (option 2):** one short `/about` page — who (builder-not-seller), how I work (AI-leverage but verified), availability, a colophon line. No life-story narrative.
5. **Writing grows organically** — no manufactured essays now.
6. **Optional approved:** home crowns for NPU and kde-mcp get a "→ full case" link inside their verify panel, pointing at the new case pages.

## Information architecture

Existing: `/` · `/work` · `/writing/why-this-site` · `/verse` · `/lab`

Added:
- `/work/npu-engine` — flagship case (technical register)
- `/work/kde-mcp` — flagship case (technical register)
- `/about` — light About/Colophon (editorial register)
- Skills section appended to `/work` (no new URL)

**Nav:** sticky top nav = `home · work · about · writing`. `verse · lab` remain in the footer nav (secondary / easter-egg). Case pages are reached from `/work` cards (a "→ read the case" link) and from the home crowns' verify panels.

## Case-study page template (the reusable unit)

`technical` register. Each `/work/<slug>` page:

1. **Title** + one-line "what it is".
2. **The bar before me** — prior state of the art / baseline (e.g. open-source high-water mark = a single matmul at ~0.6% utilization; AMD's own Linux stack offloads zero ops). Sets the stakes.
3. **What I built** — the approach, 2–3 paragraphs, technical but readable.
4. **Result** — the numbers as a compact stat-strip (e.g. 16 models · 72→1 dispatch/token · −29% energy · WER 0.117 · parity ~4e-3) + supporting prose.
5. **Verify** — expanded receipts using the shared verify component (merged PRs) + an honest "engine itself private (AGPL), no link" note where applicable.
6. **Footer** — ← back to `/work`, → next case.

Page bodies are **bespoke prose per project** (the narrative differs); the stat-strip and verify receipts are **data-driven frontmatter**. No heavy templating for two pages (YAGNI).

## DRY improvement: extract `Verify`

The verify-panel markup + toggle logic currently lives inline in `index.astro`. With case pages also needing it (3 call sites total), extract a reusable component (`Verify.astro`, with the existing click/`v`-key toggle behavior preserved). Targeted improvement serving this goal — not unrelated refactoring. The home page must look and behave identically after extraction.

## Content sourcing (grounded, no invented numbers)

All facts come from existing grounded sources only:
- `src/pages/work.astro` — already carries the NPU + kde-mcp copy and numbers.
- **NPU engine KB facts-store:** `~/repositories/ns/atassis/xdna2-asr-engine/docs/` — source the deeper case narrative here; do not embellish.
- The CV (`~/Nextcloud/Obsidian/Projects/cv-2026/output/`).

Verify-before-asserting: any number on a case page must trace to one of these. Where no public receipt exists for a claim, it gets an honest text/`private` treatment, never a verify button into "trust me".

## Skills-as-evidence (section on `/work`, below Experience)

Grouped; each item links to a receipt/project. No-receipt items are plain text.

- **Languages:** Rust (kde-mcp, tnl, NPU engine) · Go (1С MCP server) · TypeScript/Node (rethinkdb-ts, run-script-webpack-plugin — ~600K dl/mo) · Python (vLLM, OCR pipelines)
- **Systems / infra:** Kubernetes/Helm (helm-diff #294) · vLLM-on-H100 · ClickHouse · MLIR / compiler internals (mlir-aie #3178)
- **AI / ML:** on-device NPU inference (NPU engine) · LLM agents / MCP (kde-mcp, 1С agent) · speculative decoding (vllm #44698) · OCR→LLM gold-set methodology
- **Linux desktop:** Wayland / KDE internals (kde-mcp, evbridge) · accessibility-tree automation

## About / Colophon (`/about`, editorial register)

Short, in the user's voice (drafted by Claude, edited by the user per his incremental case-by-case rule):
- **Who** — builder, not seller (Wozniak identity, light touch).
- **How I work** — heavy AI leverage, but verified against ground truth (byte-exact diffs, gold-sets, WER gates). One paragraph — the spine.
- **Availability** — Remote-first · open to relocation · Moscow (UTC+3) · contact.
- **Colophon line** — how the site is built (Astro, self-hosted fonts, "every claim opens to its receipt"); ties back to the `why-this-site` essay.

Location framing per the standing rule: city + timezone, remote-first/relocation lead; Russianness incidental, not foregrounded.

## Design system

Zero new visual language. Reuse: existing `@theme` tokens, the two registers (`technical` for cases, `editorial` for About), the extracted verify component, and a new small **stat-strip** style built from existing tokens (mono, `--text-xs`, `--color-muted`, `--color-accent`, rhythm). Sticky nav gains `about`.

## Out of scope (this iteration)

- Standalone `/skills` page (only graduates if the `/work` section lands).
- A third flagship case page (accounting-AI stays a card).
- New Writing essays (organic only).
- npu-vox publication (separate task; would later turn the NPU case's strongest claim into a public link).
- GitHub Actions auto-deploy (still pending `gh auth refresh -s workflow`).

## Verification

- `bun run build` green; all pages (existing + new) build.
- Home page visually + behaviorally identical after the `Verify` extraction (verify toggle, `v` key, dark-theme persist across View Transitions).
- New case pages: stat-strip + verify receipts render; receipts link correctly.
- Skills links resolve to the right receipts/projects.
- Location framing consistent across new pages (city+timezone, remote-first).
- Manual eyeball on `localhost` (user's live-iteration loop) before redeploy.
