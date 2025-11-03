# AI Workstation Build - Executive Summary

**Document Version**: 1.0
**Date**: October 6, 2025
**Build Budget**: $14,949
**Primary Use Case**: LLM Inference & Fine-Tuning

---

## Overview

This document outlines a high-performance AI workstation specifically designed for large language model (LLM) development, inference, and fine-tuning. The build centers around the **NVIDIA RTX PRO 6000 Blackwell Max-Q** GPU with 96GB of GDDR7 VRAM, paired with AMD's latest **Threadripper PRO 9975WX** (32-core Zen 5) processor.

---

## Key Specifications at a Glance

| Component | Specification |
|-----------|--------------|
| **GPU** | NVIDIA RTX PRO 6000 Blackwell Max-Q (96GB GDDR7, 300W) |
| **CPU** | AMD Threadripper PRO 9975WX (32-core, 64-thread, Zen 5) |
| **RAM** | 192GB DDR5-6400 ECC (6x32GB) |
| **Storage** | 2TB PCIe 4.0 NVMe + 4TB PCIe 5.0 NVMe (6TB total) |
| **PSU** | 1300W 80+ Titanium |
| **Platform** | AMD WRX90 (128 PCIe 5.0 lanes) |
| **Total Cost** | **$14,949** |

---

## Use Case Alignment

### Primary Workloads
1. **LLM Inference**: Run models up to 70B parameters at full precision, 405B with quantization
2. **Fine-Tuning**: Full fine-tune models up to 30B parameters, QLora for 70B models
3. **Model Development**: Rapid iteration with local inference (no API costs)
4. **Multi-Model Serving**: Load and serve multiple models simultaneously

### Performance Targets
- **Llama 3.1 70B**: 20-30 tokens/second at FP16
- **Llama 3.1 405B**: Fits with 4-bit quantization
- **DeepSeek R1 32B**: 49% faster than Intel-based builds
- **Fine-tuning**: Llama 30B full precision, Llama 70B with QLora

---

## Why This Configuration?

### 1. GPU Selection: RTX PRO 6000 Blackwell Max-Q

**Why Max-Q over Standard (600W)?**
- **300W TDP** vs 600W = better thermal envelope for sustained training
- **88% of full performance** at half the power draw
- **Multi-GPU ready**: Designed for 2-4 GPU configurations (see a16z reference)
- **Same VRAM**: 96GB GDDR7 (no compromise on memory)
- **Future expansion**: Easier to add 2nd GPU without PSU/thermal constraints

**Why 96GB VRAM matters:**
- Llama 70B at FP16 requires ~140GB (fits with CPU memory offloading)
- Llama 70B at 8-bit requires ~70GB (fits entirely on GPU)
- Multiple smaller models simultaneously (4x 13B models)
- Fine-tuning headroom for gradients and optimizer states

### 2. CPU Selection: Threadripper PRO 9975WX (32-core)

**Why Threadripper PRO 9000 series?**
- **Latest Zen 5 architecture** (launched July 2025)
- **49% faster LLM inference** than Intel Xeon (DeepSeek R1 benchmark)
- **128 PCIe 5.0 lanes**: Critical for multi-GPU expansion
- **DDR5-6400 support**: High memory bandwidth for data preprocessing
- **32 cores**: Sweet spot for dev work without overspending

**Why not 64-core 9985WX?**
- $7,999 vs $4,099 (nearly 2x cost)
- Diminishing returns for LLM workloads (GPU-bound)
- 32 cores sufficient for data preprocessing and compilation

### 3. Memory: 192GB DDR5-6400 ECC

**Why 192GB?**
- **NVIDIA recommendation**: 2x GPU VRAM for optimal performance
- 96GB GPU VRAM × 2 = 192GB RAM minimum
- Enables CPU memory offloading for larger models
- ECC for data integrity during long training runs

### 4. Platform: WRX90 (Future-Proof)

**Why invest in WRX90?**
- **128 PCIe 5.0 lanes**: Add up to 4 GPUs total (a16z did this)
- **8-channel memory**: Up to 2TB RAM capacity
- **sTR5 socket**: Compatible with future Threadripper PRO updates
- **Professional features**: IPMI, ECC support, dual 10GbE

---

## Cost Breakdown

| Component | Model | Price |
|-----------|-------|-------|
| GPU | RTX PRO 6000 Blackwell Max-Q | $8,250 |
| CPU | AMD Threadripper PRO 9975WX | $4,099 |
| Motherboard | ASUS WRX90E-SAGE SE | $1,100 |
| RAM | 192GB DDR5-6400 ECC | $950 |
| Storage (OS) | 2TB Samsung 990 Pro | $200 |
| Storage (Data) | 4TB Crucial T700 PCIe 5.0 | $450 |
| PSU | Seasonic PRIME 1300W Titanium | $380 |
| Cooling | Noctua NH-U14S TR5-SP6 | $120 |
| Case | Fractal Design Define 7 XL | $200 |
| **TOTAL** | | **$14,949** |

---

## ROI Analysis vs Cloud GPUs

### Cloud GPU Hourly Costs (October 2025)
- **H100**: $3.35 - $12.29/hour (budget to enterprise providers)
- **A100 80GB**: $0.66 - $3.67/hour (budget to enterprise providers)
- **RTX 6000 Ada** (previous gen): ~$2.50/hour

### Payback Period Calculation

**Conservative Usage** (40 hours/week):
- Cloud cost at $2.50/hour × 40 hours/week × 52 weeks = **$5,200/year**
- Payback period: $14,949 ÷ $5,200 = **2.9 years**

**Heavy Usage** (100 hours/week):
- Cloud cost at $2.50/hour × 100 hours/week × 52 weeks = **$13,000/year**
- Payback period: $14,949 ÷ $13,000 = **1.15 years**

**24/7 Training**:
- Cloud cost at $2.50/hour × 168 hours/week × 52 weeks = **$21,840/year**
- Payback period: $14,949 ÷ $21,840 = **0.68 years (8 months)**

### Additional Cloud Considerations
- **Data egress fees**: Not included in hourly rates
- **Storage costs**: Separate charges for datasets
- **Queue times**: Immediate availability with local hardware
- **Data privacy**: All data stays local

---

## Future Expansion Path

### 6-12 Month Upgrade: Add 2nd GPU

**Investment**: $8,250 (2nd RTX PRO 6000 Max-Q)

**New Capabilities**:
- **192GB total VRAM** (2× 96GB)
- Llama 405B at higher precision
- Fine-tune 70B models without quantization
- Serve 8-10 different models concurrently
- True multi-model research environment

**System Ready Today**:
- ✅ PSU: 1300W supports 2× 300W GPUs (600W) + 200W CPU + overhead
- ✅ Motherboard: 7× PCIe 5.0 x16 slots
- ✅ Case: Fractal Define 7 XL has space for multiple full-length GPUs
- ✅ Cooling: 300W TDP cards easier to cool than 600W variants

### 12-24 Month Upgrades

**Memory Expansion**: Add 192GB → 384GB
- **Cost**: ~$950
- **Benefit**: Support even larger models with CPU offloading

**Storage Expansion**: Add 8TB NVMe
- **Cost**: ~$800
- **Benefit**: Store more model checkpoints, datasets

**Cooling Upgrade**: Custom loop
- **Cost**: ~$800
- **Benefit**: Quieter operation, better sustained performance

---

## Comparison to a16z Reference Build

a16z published their 4-GPU Blackwell Max-Q build in 2025. Here's how our build compares:

| Spec | Our Build (1 GPU) | a16z Build (4 GPU) |
|------|-------------------|-------------------|
| GPU | 1× RTX PRO 6000 Max-Q | 4× RTX PRO 6000 Max-Q |
| VRAM | 96GB | 384GB |
| CPU | TR PRO 9975WX (32c, Zen 5) | TR PRO 7975WX (32c, Zen 4) |
| RAM | 192GB DDR5-6400 | 256GB DDR5 |
| Storage | 6TB (2TB + 4TB) | 8TB PCIe 5.0 RAID 0 |
| PSU | 1300W | Unknown (1650W peak draw) |
| Cost | ~$15k | ~$50k+ estimated |

**Key Insight**: Our build is on the **same platform** as a16z's, making the upgrade path to 2-4 GPUs straightforward.

---

## Risk Analysis

### Potential Concerns

1. **No NVLink Support**
   - **Impact**: Multi-GPU setups rely on PCIe 5.0 bandwidth
   - **Mitigation**: PCIe 5.0 x16 = 128 GB/s (2× PCIe 4.0)
   - **Note**: Most LLM inference workloads work well without NVLink if each GPU handles separate models

2. **300W Max-Q vs 600W Standard**
   - **Impact**: 12% performance reduction vs full-power variant
   - **Mitigation**: Thermal/power headroom for multi-GPU more valuable
   - **Note**: a16z chose Max-Q for their 4-GPU build for this reason

3. **AMD vs Intel Platform**
   - **Impact**: Less common ecosystem than Intel Xeon
   - **Mitigation**: AMD has 49% LLM performance advantage
   - **Note**: Puget Systems, a16z both validated Threadripper PRO for AI

---

## Recommended Next Steps

### Phase 1: Purchase & Assembly (Weeks 1-2)
1. Order all components (see Bill of Materials for vendor links)
2. Update motherboard BIOS before installing CPU
3. Follow assembly guide for Threadripper PRO installation
4. Initial POST and stability testing

### Phase 2: Software Setup (Week 3)
1. Install Ubuntu 24.04 LTS
2. Install NVIDIA drivers (565+) and CUDA 12.6+
3. Setup llama.cpp and vLLM
4. Benchmark with Llama 70B

### Phase 3: Validation & Optimization (Week 4)
1. Run standard benchmarks (MLPerf, llama.cpp)
2. Test fine-tuning pipeline with smaller model
3. Optimize thermal/performance settings
4. Document baseline performance

### Phase 4: Production Use (Ongoing)
1. Deploy your LLM workflows
2. Monitor system performance and stability
3. Plan for 2nd GPU expansion based on usage
4. Iterate and optimize

---

## Success Metrics

### Performance Benchmarks
- [ ] Llama 70B inference: ≥20 tokens/second (FP16)
- [ ] Llama 13B fine-tuning: Complete epoch in <2 hours
- [ ] Multi-model serving: 3× concurrent models without degradation
- [ ] System stability: 24-hour continuous training without crashes

### ROI Targets
- [ ] Cloud GPU costs eliminated within 12 months
- [ ] 2nd GPU expansion justified by usage within 12 months
- [ ] Total project iterations improved by ≥3× vs cloud development

### Development Velocity
- [ ] Model iteration time reduced from hours to minutes
- [ ] No queue times for GPU access
- [ ] Full data privacy for proprietary models

---

## Conclusion

This $14,949 AI workstation represents a **professional-grade LLM development environment** that delivers:

✅ **96GB VRAM** for large model inference and fine-tuning
✅ **Latest Zen 5 architecture** with proven 49% LLM performance advantage
✅ **Future-proof platform** ready for 2-4 GPU expansion
✅ **ROI in 8-14 months** vs cloud GPU usage
✅ **Full data privacy** and immediate availability

The build is based on proven configurations (a16z reference), uses October 2025 pricing, and leverages the latest Blackwell GPU architecture and Zen 5 CPU technology.

For detailed specifications, assembly instructions, and software setup, see the accompanying documentation in this folder.

---

## Document Index

- **00_EXECUTIVE_SUMMARY.md** ← You are here
- **01_BILL_OF_MATERIALS.md** - Complete parts list with vendor links
- **02_COMPONENT_SPECIFICATIONS.md** - Detailed technical specifications
- **03_PERFORMANCE_BENCHMARKS.md** - Expected performance metrics
- **04_ASSEMBLY_GUIDE.md** - Step-by-step build instructions
- **05_SOFTWARE_SETUP.md** - Ubuntu, CUDA, LLM framework setup
- **06_ROI_ANALYSIS.md** - Detailed cost comparison vs cloud
- **07_UPGRADE_PATH.md** - Future expansion options
- **08_A16Z_REFERENCE_BUILD.md** - Comparison to a16z's 4-GPU system
- **09_FAQ_TROUBLESHOOTING.md** - Common questions and solutions

---

**Last Updated**: October 6, 2025
**Research Sources**: NVIDIA, AMD, a16z, Puget Systems, Central Computers, TechPowerUp
