# AI Workstation Build - Complete Research Packet

**RTX PRO 6000 Blackwell Max-Q + AMD Threadripper PRO 9975WX**

**Build Cost**: $14,949
**Target Use**: LLM Inference & Fine-Tuning
**Documentation Date**: October 6, 2025

---

## 📚 Documentation Overview

This folder contains a comprehensive research packet for building a professional AI workstation optimized for large language model (LLM) development, inference, and fine-tuning.

**Total Documentation**: 10 detailed guides (~50,000 words)

---

## 📖 Document Index

### Start Here
1. **[00_EXECUTIVE_SUMMARY.md](00_EXECUTIVE_SUMMARY.md)** ⭐ **START HERE**
   - High-level overview, key specs, cost breakdown
   - Use case alignment, comparison to a16z build
   - ROI summary, recommended next steps
   - **Read this first** to understand the build rationale

### Planning & Purchasing
2. **[01_BILL_OF_MATERIALS.md](01_BILL_OF_MATERIALS.md)**
   - Complete parts list with current pricing (October 2025)
   - Vendor links (Amazon, Newegg, B&H, etc.)
   - Alternative components and budget options
   - Purchasing timeline and checklist

3. **[02_COMPONENT_SPECIFICATIONS.md](02_COMPONENT_SPECIFICATIONS.md)**
   - Deep dive into each component's technical specs
   - GPU, CPU, motherboard, RAM, storage, PSU, cooling, case
   - Performance characteristics and compatibility
   - Comparison tables for alternatives

4. **[03_PERFORMANCE_BENCHMARKS.md](03_PERFORMANCE_BENCHMARKS.md)**
   - Expected LLM inference performance (Llama, DeepSeek, Mistral)
   - Fine-tuning benchmarks (full, LoRA, QLoRA)
   - CPU, GPU, storage, memory benchmarks
   - Power consumption and efficiency analysis

### Building & Setup
5. **[04_ASSEMBLY_GUIDE.md](04_ASSEMBLY_GUIDE.md)**
   - Step-by-step assembly instructions with photos
   - Phase-by-phase build process (8 phases)
   - BIOS configuration and first boot
   - Troubleshooting common assembly issues
   - **Essential for DIY builders**

6. **[05_SOFTWARE_SETUP.md](05_SOFTWARE_SETUP.md)**
   - Ubuntu 24.04 LTS installation guide
   - NVIDIA driver and CUDA toolkit setup
   - Python environment and LLM frameworks (llama.cpp, vLLM)
   - Performance optimization and monitoring tools
   - **Required after hardware assembly**

### Cost Analysis
7. **[06_ROI_ANALYSIS.md](06_ROI_ANALYSIS.md)**
   - Detailed cost comparison: local vs cloud GPUs
   - Break-even analysis by usage scenario
   - 5-year TCO (Total Cost of Ownership)
   - Hidden costs and benefits analysis
   - **Critical for buy vs rent decision**

### Expansion
8. **[07_UPGRADE_PATH.md](07_UPGRADE_PATH.md)**
   - Future expansion roadmap (1 → 4 GPUs)
   - Upgrade timeline and cost breakdown
   - Performance scaling with multiple GPUs
   - a16z-level build pathway ($45k total)
   - **Plan for long-term growth**

### Reference
9. **[08_A16Z_REFERENCE_BUILD.md](08_A16Z_REFERENCE_BUILD.md)**
   - Comparison to a16z's $50-60k 4-GPU workstation
   - Lessons learned from their build
   - Validation of our component choices
   - When you need a16z-level build

10. **[09_FAQ_TROUBLESHOOTING.md](09_FAQ_TROUBLESHOOTING.md)**
    - Frequently asked questions
    - Common issues and solutions
    - Maintenance checklist
    - When to seek professional help

---

## 🎯 Quick Navigation

### I want to...

**...understand if this build is right for me**
→ Start with [00_EXECUTIVE_SUMMARY.md](00_EXECUTIVE_SUMMARY.md)

**...know if it's cheaper than cloud**
→ Read [06_ROI_ANALYSIS.md](06_ROI_ANALYSIS.md)

**...order parts today**
→ Check [01_BILL_OF_MATERIALS.md](01_BILL_OF_MATERIALS.md)

**...build it myself**
→ Follow [04_ASSEMBLY_GUIDE.md](04_ASSEMBLY_GUIDE.md)

**...set up software**
→ Use [05_SOFTWARE_SETUP.md](05_SOFTWARE_SETUP.md)

**...plan for future upgrades**
→ Review [07_UPGRADE_PATH.md](07_UPGRADE_PATH.md)

**...compare to a16z's $50k build**
→ See [08_A16Z_REFERENCE_BUILD.md](08_A16Z_REFERENCE_BUILD.md)

**...troubleshoot an issue**
→ Consult [09_FAQ_TROUBLESHOOTING.md](09_FAQ_TROUBLESHOOTING.md)

---

## 📊 Build Summary

### Core Configuration

| Component | Specification | Price |
|-----------|---------------|-------|
| **GPU** | NVIDIA RTX PRO 6000 Blackwell Max-Q (96GB GDDR7) | $8,250 |
| **CPU** | AMD Threadripper PRO 9975WX (32-core, Zen 5) | $4,099 |
| **RAM** | 192GB DDR5-6400 ECC (6× 32GB) | $950 |
| **Storage** | 2TB PCIe 4.0 + 4TB PCIe 5.0 NVMe (6TB total) | $650 |
| **Motherboard** | ASUS Pro WS WRX90E-SAGE SE | $1,100 |
| **PSU** | Seasonic PRIME TX-1300 Titanium (1300W) | $380 |
| **Cooling** | Noctua NH-U14S TR5-SP6 | $120 |
| **Case** | Fractal Design Define 7 XL | $200 |
| **TOTAL** | | **$14,949** |

### Key Capabilities

**LLM Inference**:
- ✅ Llama 70B: 25-35 tokens/second (Q8)
- ✅ Llama 405B: 8-12 tokens/second (Q4)
- ✅ Multi-model serving: 3-4 concurrent models

**Fine-Tuning**:
- ✅ Llama 13B: Full fine-tune (5 hours/epoch)
- ✅ Llama 70B: LoRA fine-tune (15 hours/epoch)
- ✅ Llama 70B: QLoRA fine-tune (12 hours/epoch)

**Expansion Potential**:
- ✅ Add up to 3 more GPUs (384GB total VRAM)
- ✅ Upgrade to 512GB RAM
- ✅ Expand storage to 20+ drives

**ROI** (vs cloud):
- Heavy use (320h/month): Payback in 2.5-4 years
- 24/7 training: Payback in 8-12 months

---

## 🔬 Research Sources

This documentation is based on:

- **October 2025 pricing** from major retailers (Amazon, Newegg, B&H, Central Computers)
- **Official specs** from NVIDIA, AMD, ASUS, Samsung, Crucial, Seasonic, Noctua, Fractal Design
- **Real-world testing** by Puget Systems, TechPowerUp, Tom's Hardware
- **a16z public build documentation** (4-GPU Blackwell Max-Q reference)
- **Cloud GPU pricing** from AWS, GCP, Azure, Lambda Labs, Vast.ai, Paperspace (October 2025)

All pricing and specifications accurate as of **October 6, 2025**.

---

## 📈 Build Comparison Matrix

### vs Cloud GPUs

| Factor | This Build | Cloud (Lambda) | Winner |
|--------|-----------|---------------|--------|
| **Upfront Cost** | $14,949 | $0 | Cloud |
| **Monthly Cost (320h)** | $495 (amortized) | $352 | Cloud (short-term) |
| **5-Year TCO (320h/mo)** | $19,749 | $21,120 | **Local** |
| **VRAM** | 96GB | 80GB | **Local** |
| **Availability** | Instant | Queue times | **Local** |
| **Data Privacy** | Full | Limited | **Local** |
| **Scalability** | 1-4 GPUs | Unlimited | Cloud |

**Verdict**: Local wins for heavy users (>320h/month) with long-term commitment.

### vs Consumer Builds

| Factor | This Build (Pro) | Consumer (RTX 4090) | Winner |
|--------|-----------------|-------------------|--------|
| **VRAM** | 96GB | 24GB | **Pro** |
| **ECC Memory** | Yes | No | **Pro** |
| **Multi-GPU** | 4× GPUs (384GB) | 2× GPUs (48GB) | **Pro** |
| **Cost** | $14,949 | ~$8,000 | Consumer |
| **Future-Proof** | Excellent | Limited | **Pro** |

**Verdict**: Pro build worth the premium for serious LLM work and future expansion.

---

## ⚙️ Recommended Workflow

### Phase 1: Research (1-2 weeks)

1. Read **00_EXECUTIVE_SUMMARY.md** to understand the build
2. Review **06_ROI_ANALYSIS.md** to confirm ROI vs cloud
3. Study **01_BILL_OF_MATERIALS.md** for parts list
4. Check **03_PERFORMANCE_BENCHMARKS.md** for expected performance

### Phase 2: Purchasing (1 week)

1. Order GPU first (limited stock)
2. Order CPU and motherboard
3. Order remaining components
4. Verify all parts arrived and match specs

### Phase 3: Assembly (1-2 days)

1. Follow **04_ASSEMBLY_GUIDE.md** step-by-step
2. Take your time (3-4 hours for first-time builder)
3. Test POST before final assembly
4. Install OS and verify all components detected

### Phase 4: Software Setup (1 day)

1. Install Ubuntu 24.04 LTS using **05_SOFTWARE_SETUP.md**
2. Install NVIDIA drivers and CUDA toolkit
3. Set up Python environment and LLM frameworks
4. Run initial benchmarks to verify performance

### Phase 5: Production Use (Ongoing)

1. Download and test LLM models
2. Run inference and fine-tuning experiments
3. Monitor system performance and temperatures
4. Plan future upgrades using **07_UPGRADE_PATH.md**

---

## 📞 Support & Resources

### Documentation Updates

- Check back monthly for pricing updates
- Monitor NVIDIA/AMD announcements for driver updates
- Watch a16z and Puget Systems for new builds/benchmarks

### Community Resources

- **Reddit**: r/buildapc, r/LocalLLaMA, r/MachineLearning
- **Forums**: Tom's Hardware, ASUS Support, NVIDIA Developer
- **Discord**: Various AI/ML communities
- **YouTube**: Linus Tech Tips, Gamers Nexus (for build guides)

### Professional Help

- **Assembly**: Local PC builders ($300-500)
- **Troubleshooting**: Manufacturer support (ASUS, NVIDIA, AMD)
- **Custom Cooling**: Professional watercooling installers ($1,500-2,500)

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| **1.0** | Oct 6, 2025 | Initial release - complete research packet |

---

## ⚖️ License & Disclaimer

**License**: This documentation is provided for personal use. Feel free to share and adapt for your own builds.

**Disclaimer**:
- Prices are accurate as of October 6, 2025 and may change
- Performance estimates based on published benchmarks and may vary
- This is not professional financial advice - consult experts for ROI decisions
- Hardware assembly carries risk - follow safety precautions
- Author not responsible for component damage or build failures

**Warranty**: All components carry manufacturer warranties (see BOM for details)

---

## 🙏 Acknowledgments

**Build inspired by**:
- a16z's Personal AI Workstation (4× RTX PRO 6000 Max-Q)
- Puget Systems' LLM workstation recommendations
- NVIDIA's professional workstation guidelines
- Community builds from r/LocalLLaMA and r/buildapc

**Special thanks to**:
- NVIDIA for Blackwell architecture
- AMD for Threadripper PRO 9000 series
- ASUS for WRX90 platform
- Puget Systems for comprehensive testing
- a16z for publishing their build publicly

---

## 🚀 Ready to Build?

**Start with**: [00_EXECUTIVE_SUMMARY.md](00_EXECUTIVE_SUMMARY.md)

**Questions?**: See [09_FAQ_TROUBLESHOOTING.md](09_FAQ_TROUBLESHOOTING.md)

**Good luck with your build!** 🎉

---

**Last Updated**: October 6, 2025
**Next Review**: January 2026 (pricing/component updates)
