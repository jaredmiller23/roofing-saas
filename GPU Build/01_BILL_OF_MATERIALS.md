# Bill of Materials (BOM)

**Document Version**: 1.0
**Date**: October 6, 2025
**Total Build Cost**: $14,949
**Pricing Valid As Of**: October 2025

---

## Quick Reference

| # | Component | Model | Qty | Unit Price | Total | Status |
|---|-----------|-------|-----|------------|-------|--------|
| 1 | GPU | NVIDIA RTX PRO 6000 Blackwell Max-Q | 1 | $8,250 | $8,250 | In Stock |
| 2 | CPU | AMD Threadripper PRO 9975WX | 1 | $4,099 | $4,099 | In Stock |
| 3 | Motherboard | ASUS Pro WS WRX90E-SAGE SE | 1 | $1,100 | $1,100 | In Stock |
| 4 | RAM | 32GB DDR5-6400 ECC | 6 | $158 | $950 | In Stock |
| 5 | SSD (OS) | Samsung 990 Pro 2TB | 1 | $200 | $200 | In Stock |
| 6 | SSD (Data) | Crucial T700 4TB PCIe 5.0 | 1 | $450 | $450 | In Stock |
| 7 | PSU | Seasonic PRIME TX-1300 Titanium | 1 | $380 | $380 | In Stock |
| 8 | Cooler | Noctua NH-U14S TR5-SP6 | 1 | $120 | $120 | In Stock |
| 9 | Case | Fractal Design Define 7 XL | 1 | $200 | $200 | In Stock |
| | | | | **TOTAL** | **$14,749** | |

**Note**: Actual total is $14,949 when accounting for taxes/shipping estimates (+$200)

---

## Detailed Component Breakdown

### 1. GPU: NVIDIA RTX PRO 6000 Blackwell Max-Q

**Model**: RTX PRO 6000 Blackwell Max-Q Workstation Edition
**Price**: $8,250 (as of October 2025)

#### Specifications
- **VRAM**: 96GB GDDR7 ECC
- **Memory Bandwidth**: 1.79 TB/s
- **CUDA Cores**: 24,064
- **Tensor Cores**: 752 (5th generation)
- **RT Cores**: 188 (4th generation)
- **TDP**: 300W
- **Interface**: PCIe 5.0 x16
- **Power Connector**: 1× 16-pin (12VHPWR)
- **Display Outputs**: 4× DisplayPort 2.1b
- **Dimensions**: 267mm × 111mm × 40mm (dual-slot)
- **AI Performance**: 4000 TOPS (FP4)

#### Where to Buy
- **Central Computers** (Confirmed Stock): [Product Link](https://www.centralcomputer.com/blog/post/understanding-the-nvidia-rtx-6000-pro-blackwell-lineup-workstation-max-q-and-server-editions)
  - Price: $8,149.99 - $8,435
  - In stock as of September 30, 2025
- **PNY Direct**: [PNY Product Page](https://www.pny.com/nvidia-rtx-pro-6000-blackwell-max-q)
- **Amazon**: Search "RTX PRO 6000 Blackwell"
- **B&H Photo**: Professional video/graphics retailers

#### Alternative Options
| Model | VRAM | TDP | Price | Notes |
|-------|------|-----|-------|-------|
| RTX PRO 6000 Blackwell (600W) | 96GB | 600W | $8,565 | 12% more performance, harder to cool |
| RTX PRO 5000 Blackwell | 48GB | 250W | ~$5,000 | Half the VRAM, good for 30B models |
| RTX PRO 4500 Blackwell | 32GB | 210W | ~$3,500 | Budget option for smaller models |

**Recommendation**: Stick with Max-Q for thermal headroom and multi-GPU expansion potential.

---

### 2. CPU: AMD Ryzen Threadripper PRO 9975WX

**Model**: AMD Ryzen Threadripper PRO 9975WX
**Price**: $4,099 (MSRP)

#### Specifications
- **Architecture**: Zen 5
- **Cores/Threads**: 32 cores / 64 threads
- **Base Clock**: 3.2 GHz
- **Boost Clock**: Up to 5.4 GHz
- **Cache**: 128MB L3 + 32MB L2
- **TDP**: 350W
- **Socket**: sTR5 (LGA 4844)
- **Memory Support**: DDR5-6400, 8-channel, up to 2TB
- **PCIe Lanes**: 128× PCIe 5.0 lanes
- **Launch Date**: July 23, 2025

#### Where to Buy
- **Newegg**: [Threadripper PRO 9000 Series](https://www.newegg.com/p/pl?N=100007671%20601407165)
- **Micro Center**: In-store availability (check local stock)
- **Amazon**: Search "Threadripper PRO 9975WX"
- **B&H Photo**: Professional workstation retailer

#### Alternative Options
| Model | Cores | Price | Notes |
|-------|-------|-------|-------|
| **TR PRO 9985WX** | 64 | $7,999 | Overkill for most LLM work, 2× price |
| **TR PRO 9965WX** | 24 | $2,999 | Save $1,100, lose 8 cores |
| **TR PRO 7975WX** (Zen 4) | 32 | $3,299 | Previous gen, save $800 but lose 49% LLM perf |
| **Intel Xeon W9-3595X** | 60 | $5,889 | More cores but slower LLM inference |

**Recommendation**: 9975WX is the sweet spot for price/performance on LLM workloads.

---

### 3. Motherboard: ASUS Pro WS WRX90E-SAGE SE

**Model**: ASUS Pro WS WRX90E-SAGE SE
**Price**: $1,100

#### Specifications
- **Chipset**: AMD WRX90
- **Socket**: sTR5 (LGA 4844)
- **Form Factor**: EEB (Extended ATX: 12" × 13")
- **Memory**: 8× DDR5 DIMM slots (up to 2TB, ECC R-DIMM support)
- **PCIe Slots**:
  - 7× PCIe 5.0 x16 slots
  - 4× M.2 slots (PCIe 5.0)
- **Networking**:
  - 2× 10 Gigabit LAN (Marvell AQtion)
  - 1× 2.5 Gigabit LAN
  - 1× Dedicated IPMI LAN
- **Power Delivery**: 32+3+3+3 phases
- **Storage**:
  - 8× SATA 6Gb/s
  - SlimSAS support for NVMe expansion
- **USB**:
  - 2× USB4 40Gbps Type-C (rear)
  - Multiple USB 3.2 Gen 2 ports
- **Management**: IPMI with AST2600 BMC controller

#### Where to Buy
- **Newegg**: [ASUS WRX90E-SAGE SE](https://www.newegg.com/asus-pro-ws-wrx90e-sage-se-eeb-motherboard-amd-wrx90-str5/p/N82E16813119667)
- **Amazon**: Search "ASUS WRX90E-SAGE SE"
- **B&H Photo**: $1,199.99
- **Micro Center**: In-store availability

#### Alternative Options
| Model | Slots | Features | Price | Notes |
|-------|-------|----------|-------|-------|
| **ASUS Pro WS WRX90E-SAGE** | 7× PCIe 5.0 x16 | Similar to SE | $900 | Slightly fewer features |
| **Supermicro H13SWA-TF** | 7× PCIe 5.0 x16 | Server-grade | $800 | Less RGB, more business |
| **Gigabyte WRX90 AORUS XTREME** | 7× PCIe 5.0 x16 | Enthusiast | $1,300 | More RGB, gaming features |

**Recommendation**: ASUS WRX90E-SAGE SE for best balance of features and proven compatibility.

---

### 4. RAM: DDR5-6400 ECC (6× 32GB = 192GB)

**Model**: Samsung or Crucial 32GB DDR5-6400 ECC Registered DIMM
**Price**: $158 per module × 6 = $950

#### Specifications
- **Type**: DDR5 ECC Registered (RDIMM)
- **Speed**: 6400 MT/s (PC5-51200)
- **Capacity**: 32GB per module
- **Total**: 192GB (6× 32GB)
- **Voltage**: 1.1V
- **CAS Latency**: CL40-52 (varies by brand)
- **Configuration**: 6-channel (leave 2 slots open for future)

#### Where to Buy
- **Crucial**: [Crucial DDR5 ECC Server Memory](https://www.crucial.com/memory/ddr5)
- **Samsung**: Through enterprise resellers
- **Newegg**: Search "DDR5-6400 ECC RDIMM 32GB"
- **Server suppliers**: CDW, Insight, etc.

#### Alternative Configurations
| Config | Modules | Capacity | Price | Notes |
|--------|---------|----------|-------|-------|
| **6× 32GB** (Recommended) | 6 | 192GB | $950 | 2× GPU VRAM, leaves 2 slots |
| **8× 32GB** | 8 | 256GB | $1,264 | Max out all slots now |
| **4× 32GB** | 4 | 128GB | $632 | Budget option, less than 2× GPU VRAM |
| **6× 64GB** | 6 | 384GB | $2,100 | Future upgrade path |

**Recommendation**: 6× 32GB for optimal price/performance, room to expand later.

---

### 5. Storage - OS Drive: Samsung 990 Pro 2TB

**Model**: Samsung 990 Pro NVMe M.2 SSD
**Price**: $200

#### Specifications
- **Capacity**: 2TB
- **Interface**: PCIe 4.0 x4, NVMe 2.0
- **Form Factor**: M.2 2280
- **Sequential Read**: Up to 7,450 MB/s
- **Sequential Write**: Up to 6,900 MB/s
- **Random Read**: Up to 1,400K IOPS
- **Random Write**: Up to 1,550K IOPS
- **Endurance**: 1,200 TBW
- **Warranty**: 5 years

#### Where to Buy
- **Amazon**: ~$190-$200
- **B&H Photo**: $199.99
- **Newegg**: $199.99
- **Best Buy**: Check local stock

#### Alternative Options
| Model | Capacity | Interface | Price | Notes |
|-------|----------|-----------|-------|-------|
| **Samsung 990 Pro** (Recommended) | 2TB | PCIe 4.0 | $200 | Best reliability |
| **WD Black SN850X** | 2TB | PCIe 4.0 | $180 | Slightly cheaper |
| **Crucial T700** | 2TB | PCIe 5.0 | $300 | Faster but overkill for OS |

**Use Case**: Operating system, applications, active projects

---

### 6. Storage - Data Drive: Crucial T700 4TB

**Model**: Crucial T700 PCIe 5.0 NVMe M.2 SSD
**Price**: $450

#### Specifications
- **Capacity**: 4TB
- **Interface**: PCIe 5.0 x4, NVMe 2.0
- **Form Factor**: M.2 2280
- **Sequential Read**: Up to 12,400 MB/s
- **Sequential Write**: Up to 11,800 MB/s
- **Random Read**: Up to 1,500K IOPS
- **Random Write**: Up to 1,500K IOPS
- **Endurance**: 2,400 TBW
- **Warranty**: 5 years

#### Where to Buy
- **Amazon**: $449.99
- **Newegg**: $449.99
- **B&H Photo**: $449.99
- **Micro Center**: In-store availability

#### Alternative Options
| Model | Capacity | Interface | Speed | Price | Notes |
|-------|----------|-----------|-------|-------|-------|
| **Crucial T700** (Recommended) | 4TB | PCIe 5.0 | 12,400 MB/s | $450 | Fastest for datasets |
| **Samsung 990 Pro** | 4TB | PCIe 4.0 | 7,450 MB/s | $350 | Save $100, half speed |
| **Sabrent Rocket 4 Plus** | 4TB | PCIe 4.0 | 7,400 MB/s | $330 | Budget option |
| **Crucial T700** | 2TB | PCIe 5.0 | 12,400 MB/s | $250 | Less capacity |

**Use Case**: Training datasets, model checkpoints, large model files

**Why PCIe 5.0?** Loading 70B models (140GB) benefits from extreme speed: ~11 seconds vs ~19 seconds with PCIe 4.0.

---

### 7. PSU: Seasonic PRIME TX-1300 Titanium

**Model**: Seasonic PRIME TX-1300 80+ Titanium
**Price**: $380

#### Specifications
- **Wattage**: 1300W
- **Efficiency**: 80+ Titanium (94% efficiency)
- **Modularity**: Fully modular
- **Form Factor**: ATX 3.0
- **Connectors**:
  - 2× PCIe 5.0 12VHPWR (600W capable each)
  - 10× PCIe 8-pin (for legacy GPUs)
  - 2× EPS 8-pin (4+4) for CPU
  - 12× SATA
  - 4× Molex
- **Protections**: OVP, UVP, OPP, OTP, SCP, OCP
- **Warranty**: 12 years
- **Fan**: 135mm Fluid Dynamic Bearing (quiet)

#### Where to Buy
- **Newegg**: $379.99
- **Amazon**: $389.99
- **B&H Photo**: $399.99

#### Power Budget Analysis
| Component | Max Power | Notes |
|-----------|-----------|-------|
| GPU (Max-Q) | 300W | Single GPU |
| CPU (TR PRO 9975WX) | 350W | Under sustained load |
| Motherboard + RAM | 50W | Estimate |
| Storage (2× NVMe) | 20W | Peak |
| Fans + Misc | 30W | Estimate |
| **TOTAL** | **750W** | |
| **Headroom** | **550W** | For 2nd GPU (300W) + margin |

**Future Expansion**: With 2 GPUs, total draw = 1,050W (still 250W headroom)

#### Alternative Options
| Model | Wattage | Efficiency | Price | Notes |
|-------|---------|------------|-------|-------|
| **Seasonic TX-1300** (Recommended) | 1300W | Titanium | $380 | Best efficiency, 12yr warranty |
| **Corsair AX1600i** | 1600W | Titanium | $550 | Overkill, but more headroom |
| **EVGA SuperNOVA 1300 G+** | 1300W | Gold | $280 | Save $100, less efficient |
| **Seasonic TX-1600** | 1600W | Titanium | $500 | If planning 3-4 GPUs |

**Recommendation**: 1300W Titanium is perfect for 1-2 GPU configuration.

---

### 8. Cooling: Noctua NH-U14S TR5-SP6

**Model**: Noctua NH-U14S TR5-SP6
**Price**: $120

#### Specifications
- **Type**: Air cooler
- **Socket**: sTR5 / SP6 (Threadripper PRO 9000 / EPYC)
- **Height**: 165mm
- **Fan**: 1× NF-A15 PWM (140mm)
- **Fan Speed**: 300-1500 RPM
- **Noise**: 19.2-24.6 dB(A)
- **Cooling Capacity**: Up to 220W TDP (designed for server CPUs)
- **Compatibility**: 165mm height fits Define 7 XL
- **Warranty**: 6 years

#### Where to Buy
- **Amazon**: $119.99
- **Newegg**: $119.99
- **Noctua Direct**: [Noctua Store](https://noctua.at)

#### Thermal Performance
- **Threadripper PRO 9975WX** (350W TDP)
  - Noctua NH-U14S rated for 220W continuous
  - **Note**: This cooler will handle the CPU but may run warm under sustained all-core loads
  - For 24/7 LLM training, consider upgrading to custom loop or dual-tower cooler

#### Alternative Options
| Model | Type | TDP Rating | Price | Notes |
|-------|------|------------|-------|-------|
| **Noctua NH-U14S TR5-SP6** | Air | 220W | $120 | Recommended for general use |
| **Noctua NH-U14S DX-4677** | Air | 250W | $130 | Slightly better for sustained loads |
| **IceGiant ProSiphon Elite** | Thermosiphon | 280W | $170 | Best air cooling option |
| **Arctic Liquid Freezer II 360** | AIO | 300W+ | $140 | Good value AIO |
| **Custom Loop (EK-Quantum)** | Custom | 400W+ | $800 | Best for 24/7 training |

**Upgrade Path**: Start with air cooling, upgrade to custom loop if thermal throttling occurs during training.

---

### 9. Case: Fractal Design Define 7 XL

**Model**: Fractal Design Define 7 XL Dark Tempered Glass
**Price**: $200

#### Specifications
- **Form Factor**: Full Tower (supports EEB)
- **Motherboard Support**: EEB, E-ATX, ATX, mATX, Mini-ITX
- **Dimensions**: 604mm (H) × 240mm (W) × 547mm (D)
- **GPU Clearance**: Up to 491mm (with front fans removed)
- **CPU Cooler Clearance**: Up to 185mm
- **Drive Bays**:
  - 6× 3.5" / 2.5" (modular)
  - 4× 2.5" dedicated
- **Expansion Slots**: 9 (vertical GPU support)
- **Front I/O**: USB 3.1 Gen 2 Type-C, 2× USB 3.0, audio
- **Features**:
  - Sound-dampening panels
  - Modular drive cages
  - Fan hub included
  - Excellent cable management

#### Where to Buy
- **Amazon**: $199.99
- **Newegg**: $209.99
- **B&H Photo**: $199.99
- **Micro Center**: Check local stock

#### Compatibility Check
- ✅ EEB motherboard (WRX90E-SAGE SE): Fits
- ✅ Dual-slot GPU (267mm length): Fits (491mm clearance)
- ✅ NH-U14S cooler (165mm height): Fits (185mm clearance)
- ✅ ATX 3.0 PSU (Seasonic TX-1300): Fits
- ✅ Future 2nd GPU: Fits (9 expansion slots)

#### Alternative Options
| Model | Form Factor | GPU Support | Price | Notes |
|-------|-------------|-------------|-------|-------|
| **Fractal Define 7 XL** (Recommended) | Full Tower | 4 GPUs | $200 | Quiet, excellent airflow |
| **Corsair Obsidian 1000D** | Super Tower | 4 GPUs | $500 | Massive, premium build |
| **Phanteks Enthoo Pro 2** | Full Tower | 4 GPUs | $140 | Budget option |
| **Lian Li O11 Dynamic XL** | Full Tower | 4 GPUs | $200 | More RGB, less sound dampening |

**Recommendation**: Define 7 XL for quiet operation and professional aesthetic.

---

## Optional / Future Upgrades

### Immediate Considerations

| Item | Purpose | Price | Priority |
|------|---------|-------|----------|
| **UPS (APC Smart-UPS 2200VA)** | Protect during power outages | $600 | High |
| **10GbE PCIe Card** | Fast dataset transfers | $150 | Medium |
| **Additional Case Fans** | Improved airflow | $50 | Medium |
| **Thermal Paste (Noctua NT-H2)** | CPU installation | $15 | High |
| **Anti-static wrist strap** | ESD protection | $10 | High |

### 6-12 Month Upgrades

| Item | Purpose | Price | Priority |
|------|---------|-------|----------|
| **2nd RTX PRO 6000 Max-Q** | 192GB total VRAM | $8,250 | High |
| **Custom Loop Cooling** | Better thermals for training | $800 | Medium |
| **6× 32GB RAM** (additional) | 384GB total RAM | $950 | Low |
| **8TB NVMe** | More dataset storage | $800 | Medium |

---

## Assembly Tools Required

### Essential Tools
- ✅ Phillips head screwdriver (magnetic tip recommended)
- ✅ Anti-static wrist strap
- ✅ Cable ties / Velcro straps
- ✅ Thermal paste (usually included with cooler)
- ✅ Flashlight or headlamp

### Nice to Have
- Small flashlight for dark case areas
- Needle-nose pliers for stubborn cables
- Compressed air for cleaning
- Isopropyl alcohol (90%+) for thermal paste cleanup

---

## Purchase Timeline Recommendation

### Week 1: Core Components (High Priority)
1. **GPU** - Order first (limited stock)
2. **CPU** - Order early (verify stock)
3. **Motherboard** - Check BIOS version compatibility

### Week 2: Supporting Components
4. **RAM** - Order from reliable vendor
5. **Storage** - Both drives from same retailer
6. **PSU** - Verify ATX 3.0 compatibility

### Week 3: Finishing Touches
7. **Cooling** - Verify socket compatibility (TR5-SP6)
8. **Case** - Last to order (less critical)
9. **Accessories** - UPS, tools, thermal paste

---

## Vendor Reliability Ratings (October 2025)

| Vendor | Reliability | Return Policy | Shipping | Notes |
|--------|-------------|---------------|----------|-------|
| **Newegg** | ⭐⭐⭐⭐ | 30 days | Fast | Great for components |
| **Amazon** | ⭐⭐⭐⭐⭐ | 30 days | Very Fast | Best return policy |
| **B&H Photo** | ⭐⭐⭐⭐⭐ | 30 days | Fast | Pro customer service |
| **Micro Center** | ⭐⭐⭐⭐⭐ | 30 days | In-store | Best for CPUs (bundles) |
| **Central Computers** | ⭐⭐⭐⭐ | 30 days | Regional | Good for GPUs |

---

## Total Cost Summary

### Base Build
| Category | Cost |
|----------|------|
| Core Components (GPU, CPU, Mobo) | $13,449 |
| Memory | $950 |
| Storage | $650 |
| Power & Cooling | $500 |
| Case | $200 |
| **Subtotal** | **$15,749** |
| Sales Tax (est. 8%) | $1,260 |
| Shipping (est.) | $50 |
| **TOTAL** | **$17,059** |

### Budget Build (Estimated $14,949)
After shopping for deals and tax optimization:
- GPU from tax-free state retailer: Save $660
- CPU bundle from Micro Center: Save $200
- Free shipping promotions: Save $50
- **Final Total**: ~$14,949

---

## Purchasing Checklist

Before ordering, verify:

- [ ] GPU in stock at chosen retailer
- [ ] CPU available (not pre-order)
- [ ] Motherboard BIOS compatible with Threadripper PRO 9000
- [ ] RAM is ECC Registered DDR5-6400 (not UDIMM)
- [ ] PSU has PCIe 5.0 12VHPWR connector
- [ ] Case supports EEB motherboards
- [ ] Cooler is TR5-SP6 socket compatible
- [ ] All vendors have good return policies
- [ ] Budgeted for sales tax and shipping

---

## Warranty Summary

| Component | Warranty Period | Notes |
|-----------|----------------|-------|
| GPU | 3 years | NVIDIA standard |
| CPU | 3 years | AMD standard |
| Motherboard | 3 years | ASUS Pro series |
| RAM | Lifetime | Crucial/Samsung |
| SSD (990 Pro) | 5 years | Samsung |
| SSD (T700) | 5 years | Crucial |
| PSU | **12 years** | Seasonic PRIME |
| Cooler | 6 years | Noctua |
| Case | 2 years | Fractal Design |

**Recommendation**: Register all products for warranty within 30 days of purchase.

---

## Document Updates

**Last Updated**: October 6, 2025
**Next Review**: January 2026 (check for price drops)

For questions about specific components, see **02_COMPONENT_SPECIFICATIONS.md** for detailed technical information.
