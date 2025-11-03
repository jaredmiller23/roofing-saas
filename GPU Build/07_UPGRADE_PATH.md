# Upgrade Path & Future Expansion

**Document Version**: 1.0
**Date**: October 6, 2025
**Current Build**: $14,949 (Single RTX PRO 6000 Max-Q)
**Upgrade Budget**: $8,000 - $15,000 over 2-3 years

---

## Overview

Your workstation is designed for **seamless upgrades** from 1 to 4 GPUs with minimal additional investment. This document outlines the expansion roadmap, costs, and performance gains.

---

## Current System Capabilities

| Component | Current Spec | Expansion Headroom |
|-----------|--------------|-------------------|
| **GPU** | 1× RTX PRO 6000 Max-Q (96GB) | 3× more GPUs (384GB total) |
| **PCIe Slots** | 1 of 7 used | 6 slots available |
| **PSU** | 1300W (805W peak usage) | 495W available |
| **RAM** | 192GB (6 of 8 slots) | 2 slots free (+64-128GB) |
| **Storage** | 6TB (2 of 4 M.2 slots) | 2 M.2 slots + 8 SATA |
| **Cooling** | Air (220W TDP) | Can upgrade to custom loop |

---

## Upgrade Timeline

### Phase 1: First 6 Months (Baseline Operation)

**Goal**: Validate workstation performance, identify bottlenecks

**Actions**:
- Monitor GPU utilization (nvidia-smi, nvitop)
- Track LLM workload patterns (training vs inference ratio)
- Measure storage I/O (is PCIe 5.0 saturated?)
- Observe CPU usage (is 32-core sufficient?)

**No Hardware Changes** - Learn the system first!

---

### Phase 2: 6-12 Months (Minor Enhancements)

**Budget**: $1,000 - $2,000

#### 2.1 Add UPS (Priority: High)

**Recommendation**: APC Smart-UPS 2200VA

| Spec | Value |
|------|-------|
| **Model** | SMT2200C |
| **Capacity** | 2200VA / 1980W |
| **Runtime** | 10-15 min at 800W load |
| **Outlets** | 8× outlets |
| **Price** | $600 |

**Why**:
- Protect against power outages during long training runs
- Prevents data corruption from sudden shutdowns
- 10-15 minutes to safely save checkpoints

**ROI**: Priceless (one corrupted 70B training run = days of lost work)

#### 2.2 Upgrade Network (if needed)

**Option A**: Add 10GbE PCIe Card

| Component | Price | Notes |
|-----------|-------|-------|
| **ASUS XG-C100C** | $100 | 10GbE PCIe card |
| **10GbE Switch** | $200-500 | If local network supports |
| **Total** | $300-600 | |

**When to Upgrade**:
- Frequently transferring large datasets (>100GB) over network
- Collaborating with team (shared model storage)
- Building multi-machine training cluster

**Option B**: Stick with Dual 10GbE (Already on Motherboard!)

Your ASUS WRX90E-SAGE SE **already has** 2× 10GbE ports. Just need:
- 10GbE switch: $200-500
- Cat6a/Cat7 Ethernet cables: $20

**Recommendation**: Use built-in 10GbE first before buying PCIe card!

#### 2.3 Add Storage (if datasets growing)

**Option A**: Add 3rd M.2 Drive (4TB PCIe 5.0)

| Component | Price | Total Storage After |
|-----------|-------|-------------------|
| **Crucial T700 4TB** | $450 | 10TB (2+4+4) |

**When to Upgrade**:
- Running out of space on /data/datasets or /data/models
- Storing multiple checkpoints per training run
- Building large dataset libraries (ImageNet, CommonCrawl, etc.)

**Option B**: Add SATA SSDs for Archival

| Component | Qty | Price | Purpose |
|-----------|-----|-------|---------|
| **Samsung 870 EVO 4TB** | 2× | $400 | RAID 1 for backups |

**Total Phase 2 Budget**: $600 (UPS) + $450 (storage) = $1,050

---

### Phase 3: 12-18 Months (Major Upgrade - 2nd GPU)

**Budget**: $8,250

#### 3.1 Add Second RTX PRO 6000 Max-Q

**Component**: NVIDIA RTX PRO 6000 Blackwell Max-Q (96GB)
**Price**: $8,250 (assuming similar to current pricing)

**New System Capabilities**:

| Spec | Before | After | Gain |
|------|--------|-------|------|
| **VRAM** | 96GB | **192GB** | 2× |
| **CUDA Cores** | 24,064 | **48,128** | 2× |
| **Tensor Cores** | 752 | **1,504** | 2× |
| **AI Performance** | 4,000 TOPS | **8,000 TOPS** | 2× |
| **Power Draw (peak)** | 805W | **1,105W** | +300W |

**What This Enables**:

✅ **Llama 405B Inference**: Run at Q4 with full context (192GB total VRAM)
✅ **Llama 70B Fine-Tuning**: Full precision fine-tuning without quantization
✅ **Multi-Model Serving**:
   - GPU 1: Llama 70B (inference serving)
   - GPU 2: Llama 13B (fine-tuning experiments)
✅ **Faster Training**: Distribute training across 2 GPUs
✅ **Larger Batch Sizes**: 2× GPU memory = 2-4× larger batches

**Performance Scaling** (estimated):

| Workload | 1 GPU | 2 GPUs | Speedup | Notes |
|----------|-------|--------|---------|-------|
| **Llama 70B Inference** | 30 tok/s | 30 tok/s | 1× | Single model, no speedup |
| **Llama 70B Full Fine-Tune** | Not possible | 8-12 h/epoch | ∞ | Now possible! |
| **Llama 13B Fine-Tune** | 5 hours | 2.5-3 hours | 1.7-2× | Data parallelism |
| **Multi-Model Inference** | 1 model | 2 models | 2× | Parallel serving |
| **Llama 405B Inference** | Very slow | 12-18 tok/s | Better | Model parallelism |

**Power Budget Check**:

| Component | Current | With 2 GPUs |
|-----------|---------|-------------|
| **2× GPUs** | 300W | **600W** |
| **CPU** | 350W | 350W |
| **Motherboard + RAM** | 50W | 50W |
| **Storage** | 15W | 15W |
| **Fans** | 25W | 30W (add 1-2 fans) |
| **TOTAL** | **740W** | **1,045W** |
| **PSU Capacity** | 1300W | 1300W |
| **Headroom** | 560W | **255W** ✅ |

**PSU**: ✅ 1300W is sufficient for 2× GPUs (with 255W margin)

**Cooling Considerations**:

Current Noctua NH-U14S (220W TDP) may struggle with sustained 350W CPU loads **+ 2× 300W GPUs**.

**Recommendation**: Upgrade to custom loop if CPU temps >85°C sustained.

#### 3.2 Install 2nd GPU

**Installation Steps**:

1. **Power off workstation**
2. **Install 2nd GPU** in PCIe slot 3 or 4 (leave slot 2 empty for airflow)
3. **Connect 12VHPWR power** (2nd cable from PSU)
4. **Add case fans** (2× 140mm top exhaust recommended)
   - Cost: $50 (2× Noctua NF-A14)
5. **Verify in OS**:
   ```bash
   nvidia-smi  # Should show 2 GPUs
   ```

**GPU Placement**:

| Slot | GPU | Reasoning |
|------|-----|-----------|
| **PCIe 1** | GPU 1 (primary) | Best cooling, closest to rear exhaust |
| **PCIe 2** | Empty | Airflow gap |
| **PCIe 3 or 4** | GPU 2 (secondary) | Adequate airflow, x16 bandwidth |

**Software Configuration**:

```bash
# Verify both GPUs detected
nvidia-smi

# Set GPU affinity for multi-GPU training
export CUDA_VISIBLE_DEVICES=0,1  # Use both GPUs

# Test PyTorch multi-GPU
python3 -c "import torch; print(f'GPUs available: {torch.cuda.device_count()}')"
# Expected: GPUs available: 2
```

**Total Phase 3 Cost**: $8,250 (GPU) + $50 (fans) = **$8,300**

---

### Phase 4: 18-24 Months (Advanced Upgrades)

**Budget**: $2,000 - $5,000

#### 4.1 Option A: Upgrade Cooling (if needed)

**Scenario**: CPU temps >85°C during sustained training with 2 GPUs

**Solution**: Custom Water Cooling Loop

| Component | Price | Notes |
|-----------|-------|-------|
| **CPU Water Block** | $150 | EK-Quantum for TR5 |
| **360mm Radiator** | $150 | Top mount |
| **420mm Radiator** (optional) | $200 | Front mount |
| **D5 Pump/Res** | $180 | Reliable pump |
| **Fittings + Tubing** | $150 | Misc parts |
| **Coolant** | $20 | EK-CryoFuel |
| **Total** | **$650 - $850** | |

**Performance Gain**:
- CPU temps: 85°C → 65-70°C under load
- Quieter operation (larger radiators = lower fan speeds)
- Better sustained boost clocks

**DIY vs Professional Install**:
- DIY: $650-850 (10-15 hours work)
- Professional: $1,500-2,000 (includes labor)

**Recommendation**: Only if temps are actually problematic. Air cooling may be sufficient.

#### 4.2 Option B: Expand RAM (if needed)

**Scenario**: Running out of RAM for extremely large models or datasets

**Current**: 192GB (6× 32GB, 2 slots empty)

**Option 1**: Fill Remaining Slots
- Add 2× 32GB DDR5-6400 ECC = 256GB total
- Cost: ~$320
- Use case: Marginal improvement for most workloads

**Option 2**: Replace with 64GB Modules
- Replace 6× 32GB with 6× 64GB = 384GB total
- Cost: $2,100 (new) - $600 (sell old) = **$1,500 net**
- Use case: Offloading 405B models extensively

**Recommendation**: Only if regularly hitting RAM limits (monitor with `htop`)

#### 4.3 Option C: Expand Storage Further

**Scenario**: Storing 100+ model checkpoints, large dataset archives

**Option 1**: Fill M.2 Slots
- Add 2× 4TB Crucial T700 = 14TB total NVMe
- Cost: $900

**Option 2**: Add SATA SSD RAID
- 4× 4TB Samsung 870 EVO in RAID 10 = 8TB usable
- Cost: $800
- Use case: Archival storage, backups

**Option 3**: NAS for Archival
- Build separate NAS with 10GbE
- 8× 8TB HDDs = 64TB raw (RAID 6 = 48TB usable)
- Cost: $2,000-3,000
- Use case: Long-term dataset/model archives

**Recommendation**: M.2 expansion first (Option 1), then consider NAS if still growing

**Total Phase 4 Cost**: $650 (cooling) or $1,500 (RAM) or $900 (storage) = **$650 - $3,000**

---

### Phase 5: 24-36 Months (Extreme Expansion - 4× GPUs)

**Budget**: $16,500 - $18,000

#### 5.1 Add 3rd & 4th GPU (Total: 4× RTX PRO 6000 Max-Q)

**Component**: 2× additional RTX PRO 6000 Max-Q (96GB each)
**Price**: 2× $8,250 = $16,500

**New System Capabilities** (a16z-level!):

| Spec | 2 GPUs | 4 GPUs | Gain |
|------|--------|--------|------|
| **VRAM** | 192GB | **384GB** | 2× |
| **CUDA Cores** | 48,128 | **96,256** | 2× |
| **Tensor Cores** | 1,504 | **3,008** | 2× |
| **AI Performance** | 8,000 TOPS | **16,000 TOPS** | 2× |
| **Power Draw (peak)** | 1,105W | **1,405W** | +300W |

**⚠️ PSU UPGRADE REQUIRED!**

| Component | 2 GPUs | 4 GPUs |
|-----------|--------|--------|
| **4× GPUs** | 600W | **1,200W** |
| **CPU** | 350W | 350W |
| **System** | 95W | 105W |
| **TOTAL** | **1,045W** | **1,655W** ⚠️ |
| **PSU Capacity** | 1300W | **Need 1600W+** |

**Required Upgrade**: Replace 1300W PSU with 1600W or 2000W

| PSU | Price | Notes |
|-----|-------|-------|
| **Seasonic PRIME TX-1600** | $500 | 1600W Titanium |
| **Corsair AX1600i** | $550 | 1600W Titanium, digital monitoring |

**Total Phase 5 Cost**: $16,500 (2× GPUs) + $500 (PSU) + $100 (misc cables/fans) = **$17,100**

**What This Enables** (384GB Total VRAM):

✅ **Llama 405B Full Precision**: Run without quantization
✅ **Multiple Large Models**: Serve 4× Llama 70B simultaneously
✅ **Extreme Batch Sizes**: 4× GPU memory for massive batch fine-tuning
✅ **Model Parallelism**: Distribute 405B+ models across GPUs
✅ **Research Cluster**: Run multiple experiments in parallel

**Performance Scaling** (4× GPUs):

| Workload | 1 GPU | 4 GPUs | Speedup |
|----------|-------|--------|---------|
| **Llama 70B Fine-Tune (data parallel)** | 12h | 3-4h | 3-4× |
| **Llama 405B Inference (model parallel)** | Very slow | 25-35 tok/s | Major improvement |
| **Multi-Model Serving** | 1 model | 4 models | 4× |

**Cooling Upgrade MANDATORY**:

With 4× 300W GPUs (1,200W GPU heat alone), air cooling is insufficient.

**Required**: Custom water cooling loop with:
- 2× 420mm radiators (front + top)
- Potentially GPU water blocks (add $600-800)

**Total Cooling**: $1,500-2,500

**Realistic 4-GPU Total Cost**: $17,100 (GPUs + PSU) + $2,000 (cooling) = **$19,100**

**Total System Value** (after Phase 5): $14,949 + $19,100 = **$34,049** (a16z territory!)

---

## Upgrade Decision Tree

```
START: Evaluate Current System Usage
│
├─ GPU Utilization <50% most of the time?
│  └─ NO UPGRADE NEEDED - Current system sufficient
│
├─ GPU Utilization >80%, running out of VRAM?
│  └─ ADD 2ND GPU (Phase 3: $8,300)
│     │
│     ├─ Running 2 GPUs at >80% utilization?
│     │  └─ ADD 3RD & 4TH GPU (Phase 5: $19,100)
│     │
│     └─ 2 GPUs sufficient?
│        └─ DONE - Monitor for 6-12 months
│
├─ Storage filling up (>80% used)?
│  └─ ADD M.2 SSD or SATA RAID (Phase 2: $450-800)
│
├─ RAM usage >90%?
│  └─ ADD RAM (Phase 4: $320-1,500)
│
├─ CPU temps >85°C sustained?
│  └─ UPGRADE COOLING (Phase 4: $650-2,500)
│
└─ Frequent power outages?
   └─ ADD UPS (Phase 2: $600)
```

---

## Comparison: Upgrade Paths

### Path A: Conservative (Total: $15,949 over 2 years)

| Timeline | Upgrade | Cost | Total Invested |
|----------|---------|------|----------------|
| **Month 0** | Base build | $14,949 | $14,949 |
| **Month 6** | UPS | $600 | $15,549 |
| **Month 12** | Storage (4TB SSD) | $450 | $15,999 |

**Result**: Single GPU system, well-protected and expanded storage.

**Best For**: Medium usage (160-320h/month), don't need >96GB VRAM

---

### Path B: Aggressive (Total: $32,349 over 18 months)

| Timeline | Upgrade | Cost | Total Invested |
|----------|---------|------|----------------|
| **Month 0** | Base build | $14,949 | $14,949 |
| **Month 3** | UPS + Storage | $1,050 | $16,000 |
| **Month 12** | 2nd GPU | $8,300 | $24,300 |
| **Month 18** | Custom cooling + RAM | $2,150 | $26,450 |

**Result**: Dual GPU powerhouse (192GB VRAM), custom cooling, 256GB RAM.

**Best For**: Heavy usage (400+ h/month), training 70B+ models, production inference.

---

### Path C: a16z Replica (Total: $34,049 over 24 months)

| Timeline | Upgrade | Cost | Total Invested |
|----------|---------|------|----------------|
| **Month 0** | Base build | $14,949 | $14,949 |
| **Month 6** | UPS + Storage | $1,050 | $16,000 |
| **Month 12** | 2nd GPU | $8,300 | $24,300 |
| **Month 18** | 3rd + 4th GPU + PSU | $17,100 | $41,400 |
| **Month 20** | Custom cooling (GPU blocks) | $2,500 | $43,900 |
| **Month 24** | RAM upgrade (384GB) | $1,500 | $45,400 |

**Result**: 4× GPU beast (384GB VRAM), matches a16z's personal AI workstation!

**Best For**: AI research, startup, training 405B models, multi-model serving at scale.

---

## Resale Value Analysis

### Depreciation Curve

| Year | Hardware Value | Depreciation | Resale Value (Est.) |
|------|---------------|--------------|---------------------|
| **0** | $14,949 | 0% | $14,949 (NIB) |
| **1** | $13,454 | 10% | $11,959 (80%) |
| **2** | $11,959 | 20% | $10,465 (70%) |
| **3** | $10,465 | 30% | $8,970 (60%) |
| **4** | $8,970 | 40% | $7,475 (50%) |
| **5** | $7,475 | 50% | $5,980 (40%) |

**Note**: GPUs depreciate faster than CPUs/motherboards. Threadripper PRO platform holds value longer (long product lifecycle).

### Upgrade ROI

**Scenario**: Buy base system ($14,949), add 2nd GPU after 12 months ($8,300)

| Timeline | Action | Cost | Resale Value | Net Investment |
|----------|--------|------|--------------|----------------|
| **Month 0** | Buy base | $14,949 | $0 | $14,949 |
| **Month 12** | Add 2nd GPU | $8,300 | $0 | $23,249 |
| **Month 24** | Sell entire system | $0 | $16,275 (70%) | -$16,275 |
| **Net Cost (2 years)** | | | | **$6,974** |

**Equivalent Cloud Cost** (2 years, 320h/month @ $1.10/h):
- $352/month × 24 months = $8,448

**Savings**: $8,448 - $6,974 = **$1,474** over 2 years (PLUS you owned the hardware!)

---

## Recommended Upgrade Order (for Most Users)

1. **Months 0-6**: Operate base system, learn limitations
2. **Month 6**: Add UPS ($600) ← High priority!
3. **Month 9-12**: Add 2nd GPU if VRAM-constrained ($8,300)
4. **Month 12-18**: Add storage/cooling as needed ($450-2,150)
5. **Month 24+**: Consider 3rd/4th GPU if justified ($17,100+)

**Total 2-Year Investment**: $14,949 + $600 + $8,300 = **$23,849** (dual GPU setup)

---

**Last Updated**: October 6, 2025
**References**: a16z build documentation, ASUS WRX90 specs, NVIDIA Blackwell roadmap
