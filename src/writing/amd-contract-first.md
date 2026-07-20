I build an inference engine on this stack, so I read these repos from the outside every day. What follows is how the stack looks from that seat, and one way it could be simpler, offered as a suggestion and a question rather than a judgment on anyone's work. I have grounded every claim in the public sources and marked the places where I am guessing.

## The smallest version of the problem

In the AIE LLVM backend there is exactly one way to ask what hardware you are compiling for: a single integer, `__AIE_ARCH__`, equal to 20, 21, or 22. The three generations are three near-duplicate backends (`AIE2*.td`, `aie2p/`, `aie2ps/`), selected by target name. So a kernel that wants a feature the current generation has writes `#if __AIE_ARCH__ == 21`.

That integer assumes capability is a level. It is not. Here is what the three generations actually expose:

| Capability | aie2 (20) | aie2p (21) | aie2ps (22) |
|---|---|---|---|
| accumulator width | 1024-bit | 2048-bit | 2048-bit |
| bf16 MAC | native | emulated (~1/4 rate) | native |
| block-float encoding | none | bfp16 (ebs8/ebs16) | MX (mx4/6/9) |
| fp8 MAC (e4m3/e5m2) | no | no | yes |
| fp16 MAC | no | no | yes |

The clearest case is bf16: native on aie2, emulated at a fraction of the rate on aie2p, native again on aie2ps. That does not sit on a number line. Block-float says the same thing another way. Both aie2p and aie2ps have block floating-point, in different encodings: aie2p speaks bfp16, aie2ps speaks MX, and a kernel written against one does not compile against the other. No generation is the one before it plus more. Capability is a set, and the backend has no way to express a set, so it stands in a generation number as a proxy.

## Why that one integer is the whole stack in miniature

The reason a kernel hard-codes `__AIE_ARCH__ == 21` is the same reason the repos that make up this stack move in commit-locked lockstep: nowhere between them is there a frozen interface contract. Every boundary is a source dependency pinned to a matching commit on the other side, so a change on one side needs a coordinated bump on the other, indefinitely.

CUDA does not feel like this. The way I read it, that is not because Nvidia has fewer moving parts but because three interfaces are frozen: PTX, the driver API, and cubin. Everything above and below them can churn independently because those three do not move. The AIE stack has all of the same layers and has frozen none of them.

Let me put the claim as a test rather than a value judgment, because the value-judgment version ("a boundary is legitimate only if a contract sits on it") is too slippery to argue. The observable symptom of a boundary with no contract is the coordinated, commit-locked bump: two repos that cannot advance without a matching commit on the other side. So: a boundary needs lockstep bumps if and only if no frozen contract sits on it. Show me one interface in this stack that is frozen in that sense, a versioned contract with a compatibility policy and a support horizon, and that still forces lockstep bumps, and the framing is wrong. I do not believe there is one today. How many repos follow from that is secondary. The number I keep landing near is small, two or three, but the observation I am confident in is the missing contracts, not the count.

## 1. The cost, counted

The lockstep is not a vibe, it is a number. In the AIE LLVM backend, one generation is one near-duplicate backend: the aie2 sources, the `aie2p/` subtree, and the `aie2ps/` subtree come to roughly 20k, 38k, and 39k lines, about 97k lines of per-generation backend. Feature flags would not collapse most of that, since encodings and schedules genuinely differ per silicon. But the reason a generation has to be a whole fork rather than a feature set starts here: the AIE target carries zero `SubtargetFeature` flags and every `ProcessorModel` feature list is empty. The AMDGPU backend in the same tree carries a couple hundred. Same company, same LLVM, different choices about how to model a generation.

That absence propagates upward. The one capability hook that exists, `__AIE_ARCH__`, is consulted about 450 times in the vector API layer, and mlir-aie vendors that layer wholesale as a submodule, so the same gate rides into every build above it. It rides into my own engine's build the same way: I inherit all 450 gates through that vendored submodule without writing one of my own, and I cannot opt out of them. Every one of those sites is a place someone edits when a new generation ships.

Here is one such site (paraphrased), the block-float encoding case from the table above:

```c
#if   __AIE_ARCH__ == 21     // aie2p:  bfp16 block-float
  ...
#elif __AIE_ARCH__ == 22     // aie2ps: block-float is MX now
  ...
```

The code is not asking which generation it is on. What it needs to know is whether the target has bfp16 or MX. It has no way to say that, so it hard-codes the generation number as a stand-in for the capability. Under a frozen capability set the same site reads:

```c
if      constexpr (has(FeatureBFP16)) { ... }
else if constexpr (has(FeatureMX))    { ... }
```

Now it keys on the capability, not the silicon name, and a future generation that also has bfp16 needs no edit here at all.

## 2. The three contracts

**Contract 1, the AIE ISA (the keystone).** Two layers. Layer A is an op-level virtual ISA plus a queryable capability set. It freezes the operations, not the bundle encodings, because slot widths differ per generation and freezing the encoding would freeze the microarchitecture. Support is three-valued: native, emulated, or absent. This mechanism is not a new idea; it is how LLVM's own `SubtargetFeature` works, how RISC-V names its extensions, and how Vulkan and SPIR-V declare device features. The mechanism sits in the same tree as the AIE backend and is not used there, and what stopped it being used is exactly the kind of thing I cannot see from the outside.

Layer B is the part with no analog anywhere else, and it is where I think the genuinely new work is. It is the spatial configuration: tiles, DMA, buffer descriptors, Object FIFOs, cascade. A GPU has nothing like it, so CUDA and PTX have nothing to teach here. Layer A is device-agnostic and should be shared; Layer B is genuinely per-device and should not be. The contribution is not "copy PTX." It is that the op-level layer is shareable and the spatial layer is not, and drawing that line is the design.

**Contract 2, the binary and graph container.** Today an NPU program is an `xclbin` (an AXLF container) whose `AIE_PARTITION` section holds a bootgen-assembled PDI: the CDO blobs that initialize tiles, DMAs, and buffer descriptors, plus the per-core ELFs, paired with a separate instruction stream for the runtime sequence. The specialization is not in the filename. It is baked into the CDO and that instruction stream: buffer-descriptor sizes and strides, and an encoding (bfp16 mmul tiles) that references a unit the next silicon does not have. A container built for one target is silicon-locked by construction, not because it names a generation but because its CDO speaks bfp16.

A contract-first container would be capability-tagged (it references Contract 1), hold the spatial configuration as first-class content, and carry a portable tier: the graph plus a virtual-ISA body that a device-side step lowers to the silicon it lands on.

The objection is that a portable tier means a compiler running on the device. It means a load-time lowering step, narrower than a full compiler and the same shape as one that already ships elsewhere: PTX is lowered to native code by the driver at load, and AMD's own HSA lineage once shipped a portable body (HSAIL) that a load-time finalizer lowered. Think of it as a ladder of how much a pre-built artifact can be parameterized at dispatch, with no compiler in the loop:

1. a runtime scalar the kernel reads;
2. a word patched into the instruction stream per dispatch;
3. a buffer-descriptor offset patched by the runtime sequence at dispatch (this ships today; the host writes BD offsets into the instruction stream);
4. buffer-descriptor sizes, strides, and trip counts patched at dispatch, that is a full runtime shape (the dynamic runtime-sequence work in flight upstream, mlir-aie discussion #3222).

Two honest limits. First, this is where the CUDA analogy strains. AIE is a statically scheduled spatial fabric: the schedule, the DMA descriptors and Object FIFO depths and tile assignment, is itself part of the artifact and is shape-specialized. Patching a runtime shape on the same silicon (rung 4) is a real but bounded step. Retargeting across a generation can change array geometry and memory sizes, which is closer to re-placement than to a shape patch, and I have not bounded that cost. So the portable tier is credible for "same silicon, many shapes" and is an open question for "next silicon, no rebuild," and the doc should not blur the two. Second, the precedent for the portable half is the CUDA fat binary, which bundles a portable PTX body alongside native code objects, and closer to home AMD's own gfx-tagged `hsaco` fat binaries.

**Contract 3, the dispatch and memory-topology ABI.** This is the "where" contract: a device-agnostic submit API over per-device frozen kernel-driver ABIs. The amdxdna path is already a thin shim over about a dozen `DRM_IOCTL_AMDXDNA_*` ioctls, so the per-device ABI it would freeze is real and narrow. Above it sits a discoverable memory-topology descriptor (which pools exist, and the copy cost between each pair), a unified DMABUF-backed buffer object, and cross-device fences. On an APU the CPU, iGPU, and NPU share one LPDDR pool, so a handoff between them can become a question of which engine owns the pages rather than a copy. AMD already ships every piece: HSA agents and pools, XRT buffer objects, the xdna-driver ioctls, and Linux DMABUF and dma-fence. They are not unified behind one contract yet.

## 3. This already exists one org over

The device-agnostic claim is easy to assert and easy to doubt, so here is the strongest evidence I have: AMD's own GPU stack already implements all three of these contracts. I lean on that, because it means the shape is not my invention and not a bet. It is a proven pattern one part of the same company already runs.

- Contract 1 is the AMDGPU `SubtargetFeature` set. RDNA and CDNA are non-nested too, and AMDGPU models them as feature flags rather than a level.
- Contract 2 is `hsaco`, the gfx-tagged code object, plus fat binaries.
- Contract 3 is HSA plus ROCr plus amdkfd, a topology and dispatch model.

One caveat I would rather state than have handed to me: the GPU stack is my positive control only if those repos actually move independently. If AMDGPU, ROCr, and amdkfd turn out to be version-matched in practice despite their frozen contracts, then a frozen contract is necessary but not sufficient, and release discipline does part of the work. Both stacks are AMD; they grew up under different histories, which is the next section. This is also, in one line, why CUDA reads as coherent: PTX, the driver API, cubin.

## 4. Why the stack looks like this, and why now

None of this is a pattern AMD failed to notice, and the reason the stack looks the way it does is not carelessness. It is history. Most of this toolchain is Xilinx FPGA lineage: XRT, `xclbin`, bootgen, aie-rt, the Versal roots of the AIE dialect. It was the FPGA and Versal AIE toolchain, repurposed when Ryzen AI shipped an NPU on a laptop. Ten repos moving in lockstep is not a design that was chosen. It is a stratigraphy inherited around the 2022 acquisition, and it is being paid down in public: the Unified AI Software Stack announced in 2024 already targets MLIR and routes work to CPU, GPU, or NPU by capability; Nod.ai was acquired in 2023 specifically to unify the compiler across AMD's accelerators; mlir-aie recently consolidated its host runtime into one implementation. Consolidation is already the plan.

So the contribution is not "you should consolidate." It is one axis that plan does not cover. The announced capability model is horizontal: given an op, route it to the CPU, GPU, or NPU by what each can do right now. The contract I mean is vertical: does the NPU artifact survive the next NPU. Those are different questions, and building the horizontal one is a reason the vertical one is nearly free, because routing across engines already requires a machine-readable per-engine capability descriptor. The ask is to expose that same information one level down, as the artifact's contract rather than only the scheduler's input.

There is an honest objection to freezing anything here, and it is the strongest one against this whole argument: you do not freeze interfaces during the active co-design of a young architecture. CUDA froze PTX after many stable, backward-compatible generations. AIE is three generations in, and each one changes the datatype set; the capability table above is itself evidence the ISA is not settled. Nvidia designed for forward compatibility, while AIE generations deliberately remove features. A frozen contract you break every generation is worse than an honest source dependency.

The answer is that you do not freeze the capability set, which is still growing. You freeze the mechanism for querying it. A generation that adds MX or retires bfp16 adds or retires a feature bit; a consumer that asked `has(FeatureBFP16)` keeps compiling, or gets a clean "absent," with no coordinated bump across three repos. That is how RISC-V adds extensions and how Vulkan adds feature bits without reissuing the base. The contract has to name numerics as part of this, since the same op lands different bits on a 1024-bit and a 2048-bit accumulator, and emulated bf16 is not identical to native bf16; a portable body is only portable if a tolerance band travels with it. All of that is additive-bit and deprecation-window discipline, the part I have only sketched here.

And the timing points the same way. The cheapest moment to freeze the query mechanism is now: two generations already break the level model, aie2ps trading bfp16 for MX is about to strand every aie2p artifact that used it, and the compiler and runtime are being rewritten anyway. The current motion even runs the wrong way for portability, the Ryzen AI 1.7 releases retired the target-name environment variable, dropped the xclbin selection option on the newer devices, and hid the target behind fixed per-device overlays, which hides the target without unlocking it. Doing this contract-first is a cheap marginal move while the concrete is wet and an expensive retrofit once it sets.

A note on prior art, so it is clear what is and is not new here. The mechanisms are all borrowed: capability-as-a-set is `SubtargetFeature` and Vulkan feature bits; the portable-body-lowered-at-load is PTX, HSAIL, and, recently and more broadly, work like HetGPU (arXiv 2506.15993) for GPUs; a per-op numerical reference is the shape of Kernel Contracts (arXiv 2604.22032). AMD's own Triton-XDNA already gives single-source kernels for aie2 and aie2p, and it does so with separate `transform_aie2` and `transform_aie2p` scripts that emit per-generation binaries, which is the `__AIE_ARCH__` fork one level up rather than a way out of it. What I have not found published is the split itself (a shareable op-level ISA over a genuinely per-device spatial contract) applied to this stack, and the lockstep test used as an organizing lens. Those are the parts I would defend as new.

## 5. What I would keep

This is a collapse to about three, not to one, and the boundaries I keep are not arbitrary. Some are forced:

- The GPL kernel driver stays its own repo. It lives in a different license and kernel-tree domain, and no contract argument changes that.
- The LLVM fork stays a fork, with its own release cadence. The three per-generation backends live here; freezing Contract 1 changes how they express capability, not whether the fork exists.
- XRT serves the FPGA and Alveo product lines, not only the NPU, so it cannot become an NPU-only component, and carving the NPU container off the shared tooling is a cost to those users, not a free separation.

## 6. Which contract sits on each boundary

This is a tally of which boundaries carry a frozen contract, under the one test from earlier, not a proposal to move anyone's code. A boundary survives if a frozen contract or one of the three named walls sits on it. Apply that to the ten repos and the count falls out.

| Repo | Groups under | Because the boundary carries |
|---|---|---|
| mlir-aie | the compiler | the contracts bracket it (C2 above, C1 below) |
| mlir-air | the compiler | no contract; it already lowers through mlir-aie |
| iree-amd-aie | the compiler | no contract; an ingestion altitude, not a backend |
| IRON | the compiler | no contract; it imports `aie.*` across the `iron/` package |
| aie_api, aie-rt, bootgen | the compiler | vendored libraries and tools, already third_party |
| llvm-aie (Peano) | the backend / ISA | Contract 1 above; the LLVM-fork wall around it |
| llvm-project | the backend / ISA | upstream LLVM; a hard wall, not NPU-specific |
| XRT | the runtime + driver | Contract 3 above; the FPGA-sharing wall |
| xdna-driver | the runtime + driver | Contract 3 above; the GPL kernel-driver wall |

Three groups, then: a compiler bracketed by Contract 2 above and Contract 1 below; a backend that owns Contract 1 behind the LLVM-fork wall; a runtime and driver joined by Contract 3. To falsify the count, exhibit a boundary legitimized by something outside that closed set (a contract, or one of those three walls), or a different partition of the same ten under the same test. Not by preferring a different number.

## 7. Where I might be wrong

I would rather flag these than have them found.

- **The honest count is closer to four than three.** The XRT-to-xdna-driver seam inside the runtime group is itself a hard wall (permissive userspace against a GPL kernel driver). Contract 3 bridges it but does not erase it.
- **iree-amd-aie is not a pure duplicate.** It carries real work mlir-aie does not: capacity-bounded tile-size search, automatic double-buffering, DMA coalescing, matmul-plus-elementwise fusion. It is part of the external IREE project with its own governance. "Ingestion altitude" understates that it is a framework, not a module.
- **mlir-air occupies a genuinely different altitude.** Its `air.segment` and `air.channel` express fused-resident dataflow more directly than mlir-aie's Object FIFOs. Collapsing it to a pass risks losing that.
- **The backend is an un-collapsible survivor.** "Three" works only because one of the three is a backend that cannot be absorbed.
- **Two of the ten are not AMD's to re-home.** aie_api and aie-rt are third-party upstreams; they collapse only as vendored submodules.
- **The portable tier may cost more on AIE than on a GPU.** The schedule is the artifact, so lowering to a new shape at load is heavier here than a GPU's SIMT dynamic shape, and cross-generation retargeting is heavier still. I have not bounded that.
- **A frozen contract needs a versioning story I have only sketched**, including numerics, a support horizon, and a policy for the artifacts already fielded.
- **The largest unknown is not in the code.** Org boundaries can be load-bearing for reasons a first-principles argument never sees: acquisition history, customer commitments, team ownership. If one is fixed for a reason outside the repos, that is the constraint that reshapes the picture, and it is the thing an outside view cannot see.

## 8. What one backend unlocks

Freezing the three contracts makes the NPU distributable: you can ship a kernel or a model that is not welded to one silicon revision or one compiler commit. Four payoffs, each with the demo that would prove it and its honest cost.

1. **A write-once kernel library, capability-specialized instead of arch-cloned.** One `gemm` or `attention` source that selects bfp16 against MX with `has(FeatureBFP16)` and `has(FeatureMX)`, compiled for both aie2p and aie2ps. Two things a kernel author needs to hear, because this is where the "you will cost us performance" objection lives. At the microarchitecture layer this costs nothing: the generation is fixed by the target, so `has(FeatureBFP16)` is a compile-time constant and `if constexpr (has(FeatureBFP16))` monomorphizes, per target, to the same code the hand-cloned `#if __AIE_ARCH__ == 21` emits, same intrinsics, same bundle packing, same schedule, because Layer A freezes the op set and the query, never the encoding or the slot allocation the backend exploits. So the proof is not a wall-clock race; it is an assembly diff. And write-once is a floor, not a ceiling: a hand-tuner keeps every escape hatch, a per-capability path behind `if constexpr`, or a hand-written native code object shipped in the fat binary that wins whenever its target matches, exactly as hand-tuned native beats a JIT-lowered portable body in CUDA. The only genuine runtime question is the load-time lowering for silicon you never compiled for, and there the honest alternative today is not a slower kernel but an artifact that does not run at all.

2. **Ship once, run on the next silicon.** Emit a model to the portable tier and let the device-side step lower it at load. The proof: the same artifact runs on aie2p and aie2ps with no rebuild. The self-contained artifact already exists; the missing halves are the capability tag and the last rung of runtime shape. The cost is a load-time step, its cold-start budget (heavier here than on a GPU, per the Contract 2 caveat), and a trust boundary, since the device now lowers a body it was handed, so provenance and signing start to matter.

3. **The APU as one accelerator.** Import a single allocation into both the NPU and the iGPU through DMABUF and hand the activation stream between them on the shared LPDDR pool. The proof: one physical allocation consumed by both engines. It does not make the handoff free, the two engines want different native layouts and still need coherency, but it removes the host round-trip and the redundant staging copy, bytes that no longer cross the bus. Cashed further, this is where a draft model on the NPU and a verify model on the iGPU, or dynamic prefill-decode partitioning, stop being bespoke integrations and become one runtime pattern.

4. **A conformance contract, which is the precondition, not a bonus.** A frozen contract that nothing enforces is a PDF. The real precondition is a conformance suite and a per-op numerical reference, at the scale of Vulkan's CTS, owned by a standing group with a multi-year compatibility promise. That is a cost, plausibly larger than the backend duplication it removes, and it is the honest price of the whole proposal rather than a free byproduct. It is also the first question a platform owner asks, so I would rather name it than let it be the unasked one.

## 9. What a frozen contract is actually for

The four payoffs above are first-party: cleaner repos and portable artifacts for AMD. That undersells it, and the CUDA comparison is the reason. CUDA did not win because PTX is elegant. It won because three frozen interfaces let an ecosystem accrete on top, cuDNN and cuBLAS and TensorRT and a thousand outside libraries, and that ecosystem became the moat, built for free and without Nvidia's per-library coordination. The technical claim in this doc (frozen interfaces make a coherent stack) has an economic other half (the same frozen interfaces let others build the moat for you), and the doc should say both.

The tax is visible today. Third parties already write AIE kernels, and every one of them pins `__AIE_ARCH__ == 21` and a matching mlir-aie commit, so they can ship only source that rots at the next silicon, never a binary a customer runs without owning the toolchain. No frozen ABI means no third-party binary product, no market, and AMD is left to write every kernel itself, forever, with no one permitted to relieve them of it. A frozen virtual-ISA level is also what lets a published NPU kernel or a distributed model survive a hardware generation, which is the difference between a reproducible artifact and a paper that stops building. The delivery channel already exists (model distribution rails ship models to fielded machines today); what is missing is an AMD artifact worth putting in one that survives the next NPU.

If only one of the three is worth freezing first, it is the container, Contract 2, not the ISA. Contract 1 is the architectural keystone, but Contract 2 is the one that pays outward, is closest to done, and whose absence causes the imminent failure. It can even ship with a minimal hand-listed capability tag, the five rows of the table in section 1, before the full Contract 1 mechanism is frozen, and let the ISA contract grow behind an already-shipping container.

## 10. I already run this one layer up

I am not proposing contract-first as a hypothesis. I run it, one layer above the stack, in my own NPU inference engine, and it is the reason I trust the shape of the argument. My engine freezes a single resident-stream `[tile, D]` interface, expresses every operator as a parameterized op-type rather than a per-model kernel, and treats each model as a data-only schedule over that vocabulary. Five models across three modalities, speech recognition, text embedding, and protein embedding, run behind one uniform encoder interface today, and seventeen of the twenty-one op-types in that vocabulary are validated on real AIE2P silicon against a numerical reference, not in simulation.

This is a much smaller problem than the stack's, and the gap is real. I own both sides of my interface and can edit either at will, where a frozen ISA has to survive third parties shipping silicon I cannot touch, across generations still in flux, with obligations to their customers. The scale does not transfer. What transfers is the move: freeze the interface, parameterize the implementation. That is the discipline I would reach for again, and it is why I trust the shape of the argument more than I trust the exact repo count.

## A question, not a conclusion

The collapse to three is the conclusion. The observation underneath it, that no interface is frozen at any layer, is the part I am most confident in and the part I would most like to be corrected on. If one of these boundaries is load-bearing for a reason outside the code, that is exactly what I want to hear, because it is the thing a view from the outside cannot see.

*A personal, outside view of a public stack I build on. Not an AMD position.*
