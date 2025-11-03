# Component Specifications - Deep Dive

**Document Version**: 1.0
**Date**: October 6, 2025

---

## Table of Contents

1. [GPU: NVIDIA RTX PRO 6000 Blackwell Max-Q](#gpu-nvidia-rtx-pro-6000-blackwell-max-q)
2. [CPU: AMD Threadripper PRO 9975WX](#cpu-amd-threadripper-pro-9975wx)
3. [Motherboard: ASUS Pro WS WRX90E-SAGE SE](#motherboard-asus-pro-ws-wrx90e-sage-se)
4. [Memory: DDR5-6400 ECC](#memory-ddr5-6400-ecc)
5. [Storage: NVMe SSDs](#storage-nvme-ssds)
6. [Power Supply: Seasonic PRIME TX-1300](#power-supply-seasonic-prime-tx-1300)
7. [Cooling: Noctua NH-U14S TR5-SP6](#cooling-noctua-nh-u14s-tr5-sp6)
8. [Case: Fractal Design Define 7 XL](#case-fractal-design-define-7-xl)

---

## GPU: NVIDIA RTX PRO 6000 Blackwell Max-Q

### Architecture: GB202 (Blackwell)

The NVIDIA RTX PRO 6000 Blackwell Max-Q represents the pinnacle of workstation GPU technology as of October 2025, built on NVIDIA's latest Blackwell architecture.

### Core Specifications

| Specification | Value | Notes |
|---------------|-------|-------|
| **GPU Architecture** | Blackwell (GB202) | 5nm process (TSMC) |
| **CUDA Cores** | 24,064 | Near fully-enabled GB202 die |
| **Streaming Multiprocessors** | 188 SMs | 128 CUDA cores per SM |
| **Tensor Cores (5th Gen)** | 752 | 3× performance vs. previous gen |
| **RT Cores (4th Gen)** | 188 | 2× performance vs. previous gen |
| **Base Clock** | 1590 MHz | Conservative for stability |
| **Boost Clock** | 2288 MHz | Under optimal thermal conditions |
| **Memory** | 96GB GDDR7 ECC | Doubled from Ada generation |
| **Memory Bus** | 512-bit | Extremely wide for bandwidth |
| **Memory Bandwidth** | 1,792 GB/s (1.79 TB/s) | 2× RTX 6000 Ada |
| **Memory Speed** | 28 Gbps effective (1750 MHz) | GDDR7 standard |

### Power & Thermal

| Specification | Value | Notes |
|---------------|-------|-------|
| **TGP (Total Graphics Power)** | 300W | Max-Q variant |
| **Standard Variant TGP** | 600W | 2× the power draw |
| **Performance vs. Standard** | 88% | At half the power! |
| **Power Connector** | 1× 16-pin (12VHPWR) | PCIe 5.0 standard |
| **Recommended PSU** | 1000W+ for single GPU | 1300W for dual GPU |
| **Thermal Design** | Dual-slot, dual-fan | Vapor chamber cooling |

### Physical Dimensions

| Dimension | Measurement |
|-----------|-------------|
| **Length** | 267mm (10.5") |
| **Width** | 111mm (4.4") dual-slot |
| **Height/Thickness** | 40mm |
| **Weight** | ~1.8 kg (estimated) |

### Connectivity

| Interface | Specification |
|-----------|---------------|
| **PCIe Interface** | PCIe 5.0 x16 |
| **PCIe Bandwidth** | 128 GB/s (bidirectional) |
| **Display Outputs** | 4× DisplayPort 2.1b |
| **Max Displays** | 4× 8K @ 60Hz or 8× 4K @ 120Hz |
| **NVLink Support** | ❌ Not supported (PCIe only) |

### AI & Compute Performance

| Metric | Performance | Precision |
|--------|------------|-----------|
| **AI Performance (Peak)** | 4,000 TOPS | FP4 |
| **Tensor Performance** | 2,000 TFLOPS | FP8 |
| **Tensor Performance** | 1,000 TFLOPS | FP16 |
| **Tensor Performance** | 500 TFLOPS | TF32 |
| **FP32 Performance** | 125 TFLOPS | Single precision |
| **FP64 Performance** | 62.5 TFLOPS | Double precision |

### LLM-Specific Capabilities

**Model Capacity (Approximate)**:
- **Llama 3.1 405B**: Fits with 4-bit quantization (~102GB)
- **Llama 3.1 70B**: Fits with 8-bit quantization (~70GB), full precision with CPU offload
- **Llama 3.1 13B**: Fits with FP16 (~26GB), plenty of headroom
- **DeepSeek R1 32B**: Fits comfortably at FP16 (~64GB)

**Fine-Tuning Capacity**:
- **Full Fine-Tune**: Up to 30B parameter models (requires ~60GB for model + gradients)
- **LoRA Fine-Tune**: Up to 70B parameter models (efficient adapter training)
- **QLoRA Fine-Tune**: Up to 70B parameter models with 4-bit base model

### Features

- ✅ **ECC Memory**: Error-Correcting Code for data integrity
- ✅ **Multi-GPU Support**: Up to 4× GPUs via PCIe (no NVLink)
- ✅ **vGPU Support**: Virtualization for multi-tenant workloads
- ✅ **NVIDIA Studio Drivers**: Optimized for content creation
- ✅ **RTX Enterprise Drivers**: Long-term support for professional use
- ✅ **NVIDIA AI Enterprise**: Compatible with enterprise AI stack
- ✅ **Tensor Memory Accelerator (TMA)**: Hardware-accelerated memory management

### Certifications

- ISV-certified for major AI/ML frameworks
- TensorRT optimization support
- CUDA 12.x compatible
- OpenCL 3.0 support
- DirectX 12 Ultimate
- Vulkan 1.3

### Comparison: Max-Q vs Standard Edition

| Feature | Max-Q (300W) | Standard (600W) | Delta |
|---------|-------------|-----------------|-------|
| **TGP** | 300W | 600W | 2× |
| **Performance** | 88% | 100% | +12% |
| **Thermal Output** | Lower | Higher | Significant |
| **Multi-GPU Feasible** | ✅ Yes (4× tested) | ⚠️ Challenging (2× max) | Important |
| **Boost Clock** | 2288 MHz | ~2400 MHz | +112 MHz |
| **Price** | $8,250 | $8,565 | +$315 |

**Recommendation**: Max-Q for multi-GPU builds, Standard only if single GPU and need absolute max performance.

---

## CPU: AMD Threadripper PRO 9975WX

### Architecture: Zen 5

The AMD Ryzen Threadripper PRO 9975WX represents AMD's latest workstation CPU architecture, launched July 23, 2025. It brings significant IPC improvements and AI-specific optimizations over the previous Zen 4 generation.

### Core Specifications

| Specification | Value | Notes |
|---------------|-------|-------|
| **Architecture** | Zen 5 | Latest generation |
| **Process Node** | 5nm + 6nm I/O die | TSMC |
| **Cores** | 32 | Physical cores |
| **Threads** | 64 | SMT (2 threads/core) |
| **Base Clock** | 3.2 GHz | All-core base |
| **Boost Clock** | Up to 5.4 GHz | Single-core boost |
| **All-Core Boost** | ~4.2 GHz | Sustained under load |
| **L1 Cache** | 2MB (32KB I + 32KB D per core) | |
| **L2 Cache** | 32MB (1MB per core) | Doubled from Zen 4 |
| **L3 Cache** | 128MB (32MB per CCD) | Shared per chiplet |
| **Total Cache** | 162MB | Massive for data-heavy workloads |

### Power & Thermal

| Specification | Value |
|---------------|-------|
| **TDP** | 350W |
| **Peak Power (PPT)** | ~400W under sustained all-core loads |
| **Socket** | sTR5 (LGA 4844) |
| **Thermal Interface** | Soldered IHS (Indium solder) |
| **Recommended Cooling** | 250W+ rated cooler minimum |

### Memory Support

| Specification | Value | Notes |
|---------------|-------|-------|
| **Memory Type** | DDR5 RDIMM, LRDIMM | ECC support |
| **Memory Channels** | 8 | Quad-channel per chiplet |
| **Max Memory Speed** | DDR5-6400 | Official JEDEC |
| **Max Memory Capacity** | 2TB | With 8× 256GB DIMMs |
| **Memory Bandwidth** | Up to 409.6 GB/s | Theoretical max |

### I/O & Connectivity

| Feature | Specification |
|---------|---------------|
| **PCIe Version** | PCIe 5.0 |
| **Total PCIe Lanes** | 128 lanes | From CPU |
| **Usable PCIe Lanes** | 120 lanes (8 for chipset) | |
| **PCIe Bifurcation** | Flexible x16/x8/x4 | For multi-GPU |
| **USB Support** | USB 4.0 / Thunderbolt 4 capable | Via motherboard |

### Performance Characteristics

#### Single-Thread Performance
- **Cinebench 2024 Single-Core**: ~131 points
- **Geekbench 6 Single-Core**: ~3,100 points
- **IPC Improvement**: ~16% over Zen 4 (7975WX)

#### Multi-Thread Performance
- **Cinebench 2024 Multi-Core**: ~3,570 points
- **Geekbench 6 Multi-Core**: ~24,000 points
- **Passmark**: ~85,000 points (estimated)

#### LLM Performance
- **DeepSeek R1 32B Inference**: 49% faster than Intel Xeon W9-3595X
- **Llama.cpp Prompt Processing**: 18% faster than Threadripper PRO 7975WX
- **Data Preprocessing**: Excellent due to high core count + AVX-512

### Advanced Features

**Instruction Sets**:
- ✅ AVX-512 (512-bit vector operations)
- ✅ AVX2, AVX
- ✅ FMA3 (Fused Multiply-Add)
- ✅ SHA extensions
- ✅ AES-NI encryption

**Security Features**:
- ✅ AMD Platform Secure Boot
- ✅ AMD Memory Guard (TSME)
- ✅ AMD Secure Processor (PSP)
- ✅ Shadow Stack protection

**Professional Features**:
- ✅ ECC memory support
- ✅ AMD PRO Technologies
- ✅ AMD PRO Manageability
- ✅ Long product lifecycle support

### Zen 5 Architecture Improvements

**Over Zen 4**:
- 16% IPC (Instructions Per Clock) improvement
- 2× L2 cache per core (512KB → 1MB)
- Enhanced branch prediction
- Improved AI inference performance
- Better power efficiency at iso-performance

**AI-Specific Optimizations**:
- Enhanced AVX-512 throughput for matrix operations
- Optimized memory prefetching for sequential data
- Better cache hierarchy for LLM workloads

### Comparison to Alternatives

| CPU | Cores | Price | LLM Perf | PCIe 5.0 | Notes |
|-----|-------|-------|----------|----------|-------|
| **TR PRO 9975WX** | 32 | $4,099 | Baseline | 128 lanes | Recommended |
| **TR PRO 9985WX** | 64 | $7,999 | +15% | 128 lanes | Diminishing returns |
| **TR PRO 7975WX** | 32 | $3,299 | -49% | 128 lanes | Previous gen, worse |
| **Intel Xeon W9-3595X** | 60 | $5,889 | -49% | 112 lanes | Slower for LLMs |
| **Intel Xeon W7-2495X** | 24 | $3,000 | -55% | 64 lanes | Budget option |

---

## Motherboard: ASUS Pro WS WRX90E-SAGE SE

### Platform: AMD WRX90

The ASUS Pro WS WRX90E-SAGE SE is a flagship workstation motherboard designed for AMD Threadripper PRO 9000 and 7000 WX-Series processors. It emphasizes maximum expandability, reliability, and professional features.

### Form Factor & Layout

| Specification | Value |
|---------------|-------|
| **Form Factor** | EEB (Extended ATX) |
| **Dimensions** | 12" × 13" (305mm × 330mm) |
| **Socket** | sTR5 (LGA 4844) |
| **Chipset** | AMD WRX90 |
| **BIOS** | UEFI BIOS with GUI |

### Memory Subsystem

| Feature | Specification |
|---------|---------------|
| **DIMM Slots** | 8× DDR5 RDIMM/LRDIMM |
| **Memory Channels** | 8-channel (octa-channel) |
| **Max Memory** | 2TB (8× 256GB) |
| **Memory Speed** | DDR5-6400 (JEDEC) |
| **Memory Speed (OC)** | Up to DDR5-6800+ |
| **ECC Support** | ✅ Yes (Registered/Load-Reduced) |
| **Memory Architecture** | 2 DIMMs per channel (2DPC) |

### Expansion Slots (PCIe)

The motherboard provides an exceptional 7× PCIe 5.0 x16 slots:

| Slot | PCIe Gen | Lanes | Mode | Notes |
|------|----------|-------|------|-------|
| **PCIe 1** | 5.0 | x16 | x16 | GPU 1 (primary) |
| **PCIe 2** | 5.0 | x16 | x16 | GPU 2 |
| **PCIe 3** | 5.0 | x16 | x16 | GPU 3 |
| **PCIe 4** | 5.0 | x16 | x16 | GPU 4 |
| **PCIe 5** | 5.0 | x16 | x16 / x8 | GPU 5 or bifurcation |
| **PCIe 6** | 5.0 | x16 | x8 | Additional cards |
| **PCIe 7** | 5.0 | x16 | x8 | Additional cards |

**Total PCIe Lanes**: 120 usable lanes (8 reserved for chipset)

**Multi-GPU Configuration**:
- 1× GPU: x16 mode (full bandwidth)
- 2× GPU: x16/x16 mode
- 4× GPU: x16/x16/x16/x16 mode (a16z tested this!)

### Storage

**M.2 Slots** (4× total):
| Slot | Interface | Location | Notes |
|------|-----------|----------|-------|
| **M.2_1** | PCIe 5.0 x4 | Under GPU area | Best for OS drive |
| **M.2_2** | PCIe 5.0 x4 | Mid-board | Data drive |
| **M.2_3** | PCIe 5.0 x4 | Lower board | Additional storage |
| **M.2_4** | PCIe 5.0 x4 | Lower board | Additional storage |

**SATA**:
- 8× SATA III (6 Gb/s) ports
- RAID 0, 1, 10 support

**SlimSAS**:
- 2× SlimSAS connectors (for NVMe expansion backplanes)
- Each supports 4× NVMe drives

**Total Storage**: Up to 20+ drives (4× M.2 + 8× SATA + 8× SlimSAS NVMe)

### Networking

| Interface | Specification | Controller |
|-----------|---------------|------------|
| **10GbE LAN 1** | 10 Gigabit Ethernet | Marvell AQtion AQC113C |
| **10GbE LAN 2** | 10 Gigabit Ethernet | Marvell AQtion AQC113C |
| **2.5GbE LAN** | 2.5 Gigabit Ethernet | Realtek RTL8125 |
| **IPMI LAN** | Dedicated management | AST2600 BMC |

**Total**: 3× usable network ports + 1× management

### USB & Front Panel I/O

**Rear I/O**:
- 2× USB4 40Gbps Type-C
- 4× USB 3.2 Gen 2 (10Gbps) Type-A
- 4× USB 3.2 Gen 1 (5Gbps) Type-A
- 2× USB 2.0
- 7.1 channel audio (Realtek ALC4082)
- BIOS FlashBack button
- Clear CMOS button

**Internal Headers**:
- 2× USB 3.2 Gen 2 (10Gbps) Type-C headers
- 4× USB 3.2 Gen 1 (5Gbps) headers
- 4× USB 2.0 headers

### Power Delivery

| Component | Specification |
|-----------|---------------|
| **VRM Design** | 32+3+3+3 phase |
| **CPU VCore** | 32 phases (90A power stages) |
| **SOC** | 3 phases |
| **VDDIO** | 3 phases |
| **VDD18** | 3 phases |
| **Total Power Stages** | 41 phases |
| **CPU Power Connectors** | 2× 8-pin EPS (4+4) |
| **Maximum CPU Power** | 500W+ sustained |
| **VRM Cooling** | Massive heatsinks with active fan |

**Thermal Design**:
- Large VRM heatsinks with heatpipe
- Active fan on VRM
- Chipset heatsink with active fan
- M.2 heatsinks on all slots (with thermal pads)

### Management Features (IPMI)

**ASPEED AST2600 BMC**:
- Dedicated Gigabit LAN port
- Remote power on/off/reset
- Remote BIOS access
- Hardware monitoring (temps, fans, voltages)
- Remote firmware updates
- KVM-over-IP (keyboard/video/mouse)
- Virtual media mounting

**Sensors**:
- CPU temperature monitoring (multiple zones)
- VRM temperature monitoring
- Ambient temperature sensors
- Fan speed monitoring (all headers)
- Voltage rail monitoring
- Power consumption monitoring

### BIOS Features

**Professional Features**:
- PCIe bifurcation control (split x16 into x8/x8 or x4/x4/x4/x4)
- Advanced memory timing control
- ECC error reporting
- Fan curve customization
- Power limit adjustment
- Boot device priority
- Secure Boot support

**AI & Overclocking**:
- AI Overclock auto-tuning
- Memory try-it presets
- BCLK overclocking
- Voltage offset control

### Audio

- **Codec**: Realtek ALC4082
- **Channels**: 7.1 surround
- **SNR**: 120dB
- **Audio Shielding**: Isolated PCB layers
- **Capacitors**: Premium Japanese audio caps

### RGB & Aesthetics

- Aura Sync RGB headers (2× addressable)
- Subtle RGB accents on I/O shroud
- Professional black/gray aesthetic
- No excessive gamer RGB

### Dimensions & Compatibility

**Mounting Holes**: EEB standard (some mid-towers won't fit!)

**Compatible Cases**:
- ✅ Fractal Define 7 XL (confirmed)
- ✅ Corsair Obsidian 1000D
- ✅ Phanteks Enthoo Pro 2
- ❌ Most mid-tower cases (too small)

### Comparison to Alternatives

| Motherboard | Slots | 10GbE | IPMI | Price | Notes |
|-------------|-------|-------|------|-------|-------|
| **ASUS WRX90E-SAGE SE** | 7× PCIe 5.0 | ✅ 2× | ✅ | $1,100 | Recommended |
| **ASUS WRX90E-SAGE** | 7× PCIe 5.0 | ✅ 1× | ❌ | $900 | Less features |
| **Supermicro H13SWA-TF** | 7× PCIe 5.0 | ✅ 2× | ✅ | $800 | Server-oriented |
| **Gigabyte WRX90 AORUS XTREME** | 7× PCIe 5.0 | ✅ 1× | ❌ | $1,300 | Gamer aesthetic |

---

## Memory: DDR5-6400 ECC

### Technology: DDR5 Registered DIMMs

DDR5 represents a significant leap over DDR4, with doubled bandwidth, on-die ECC, and better power efficiency.

### Specifications (per 32GB module)

| Feature | Specification |
|---------|---------------|
| **Capacity** | 32GB per DIMM |
| **Type** | DDR5 RDIMM (Registered) |
| **Speed** | 6400 MT/s (PC5-51200) |
| **Voltage** | 1.1V (vs 1.2V for DDR4) |
| **CAS Latency** | CL40-52 (varies by brand) |
| **Data Rate** | 51,200 MB/s per module |
| **ECC** | ✅ Yes (both on-die + DIMM-level) |
| **Rank** | 2R (Dual Rank) |
| **Chip Density** | 16Gb per chip |

### Configuration: 6× 32GB = 192GB

| Parameter | Value |
|-----------|-------|
| **Total Capacity** | 192GB |
| **Populated Slots** | 6 of 8 |
| **Free Slots** | 2 (for future expansion) |
| **Channels Used** | 6 of 8 |
| **Interleaving** | 6-way interleave |
| **Theoretical Bandwidth** | ~307 GB/s (6 channels × 51.2 GB/s) |
| **Practical Bandwidth** | ~250-280 GB/s (measured) |

### ECC Capabilities

**On-Die ECC**:
- Built into every DDR5 chip
- Corrects single-bit errors transparently
- Improves reliability vs. DDR4

**DIMM-Level ECC** (Registered DIMMs):
- Additional parity checking
- Detects and corrects multi-bit errors
- Essential for long training runs

**Error Reporting**:
- Logged by BIOS/IPMI
- OS-level monitoring available
- Critical for data integrity

### Why DDR5-6400?

**vs DDR5-4800**:
- 33% higher bandwidth (6400 vs 4800 MT/s)
- Better for data-intensive preprocessing
- Negligible cost difference (~5%)

**vs DDR5-6800/7200**:
- Marginal gains for most workloads
- Higher cost (+20-30%)
- May require manual tuning

**Recommendation**: DDR5-6400 is the sweet spot (JEDEC standard).

### LLM Workload Considerations

**Why 192GB (2× GPU VRAM)?**

NVIDIA's recommendation: Have at least 2× GPU VRAM in system RAM for optimal performance.

**96GB GPU VRAM × 2 = 192GB minimum**

This enables:
- **Memory pinning**: Pre-load data in RAM for fast GPU transfers
- **Offload headroom**: Load model layers that don't fit on GPU
- **Multi-model serving**: Cache multiple models in RAM
- **Dataset preprocessing**: Process large datasets before training

**Example**: Llama 70B at FP16 = 140GB
- 70-90GB fits on GPU (with KV cache optimization)
- Remaining 50-70GB offloaded to CPU RAM
- **Without 192GB RAM**: Would need to use quantization (worse quality)
- **With 192GB RAM**: Can run full precision with offloading

### Latency vs Capacity Trade-off

| Config | Latency | Bandwidth | Capacity | Cost | Notes |
|--------|---------|-----------|----------|------|-------|
| **6× 32GB** (Recommended) | Good | Excellent | 192GB | $950 | Best balance |
| **8× 32GB** | Slightly higher | Best | 256GB | $1,264 | Max bandwidth |
| **4× 32GB** | Best | Good | 128GB | $632 | Insufficient for 96GB GPU |
| **6× 64GB** | Higher | Excellent | 384GB | $2,100 | Future upgrade |

**Note**: More DIMMs per channel = slightly higher latency, but better bandwidth.

### Recommended Brands

| Brand | Model | Compatibility | Warranty | Notes |
|-------|-------|---------------|----------|-------|
| **Samsung** | M393A4K40EB3-CWEBY | Excellent | 3 years | OEM, very reliable |
| **Crucial** | CT32G56C46S5 | Excellent | Lifetime | Micron chips |
| **Kingston** | KSM56R40BD4KI-32HA | Good | Lifetime | Server Memory |
| **SK Hynix** | HMCG88MEBRA107N | Excellent | 3 years | OEM |

**Recommendation**: Samsung or Crucial for best compatibility with ASUS WRX90 boards.

---

## Storage: NVMe SSDs

### Drive 1: Samsung 990 Pro 2TB (OS & Applications)

**Interface**: PCIe 4.0 x4, NVMe 1.4

| Specification | Value |
|---------------|-------|
| **Capacity** | 2TB (1,862 GiB usable) |
| **Form Factor** | M.2 2280 (80mm) |
| **Controller** | Samsung Proprietary (8nm) |
| **NAND** | Samsung V-NAND TLC (3-bit) |
| **DRAM Cache** | 2GB LPDDR4 |
| **Sequential Read** | Up to 7,450 MB/s |
| **Sequential Write** | Up to 6,900 MB/s |
| **Random Read (4K)** | Up to 1,400K IOPS |
| **Random Write (4K)** | Up to 1,550K IOPS |
| **Endurance (TBW)** | 1,200 TB |
| **MTBF** | 1.5 million hours |
| **Warranty** | 5 years |

**Use Case**: Operating system, applications, active projects, frequently accessed files

**Why 990 Pro for OS**:
- Proven reliability (Samsung's flagship consumer line)
- Excellent random I/O (critical for OS responsiveness)
- Good endurance for OS writes
- 5-year warranty

### Drive 2: Crucial T700 4TB (Datasets & Models)

**Interface**: PCIe 5.0 x4, NVMe 2.0

| Specification | Value |
|---------------|-------|
| **Capacity** | 4TB (3,725 GiB usable) |
| **Form Factor** | M.2 2280 (80mm) |
| **Controller** | Phison E26 (12nm) |
| **NAND** | Micron 232-layer TLC |
| **DRAM Cache** | 4GB DDR4 |
| **Sequential Read** | Up to 12,400 MB/s |
| **Sequential Write** | Up to 11,800 MB/s |
| **Random Read (4K)** | Up to 1,500K IOPS |
| **Random Write (4K)** | Up to 1,500K IOPS |
| **Endurance (TBW)** | 2,400 TB |
| **MTBF** | 1.5 million hours |
| **Warranty** | 5 years |

**Use Case**: Training datasets, model checkpoints, large model files (Llama 70B, 405B)

**Why T700 (PCIe 5.0) for Data**:
- 67% faster sequential read than PCIe 4.0 (12.4 vs 7.4 GB/s)
- **Model loading time**: Llama 70B (140GB) loads in ~11 seconds vs ~19 seconds
- Large dataset streaming benefits
- Future-proof for even larger models

**Model Loading Calculations**:

| Model | Size | PCIe 4.0 (7.4 GB/s) | PCIe 5.0 (12.4 GB/s) | Improvement |
|-------|------|---------------------|----------------------|-------------|
| **Llama 13B** | 26GB | 3.5 sec | 2.1 sec | 1.4 sec faster |
| **Llama 70B** | 140GB | 18.9 sec | 11.3 sec | 7.6 sec faster |
| **Llama 405B** | 810GB | 109 sec | 65 sec | 44 sec faster |

**ROI**: Faster iteration = more productive development!

### Storage Layout Recommendation

| Drive | Slot | Partition | Size | Purpose |
|-------|------|-----------|------|---------|
| **990 Pro** | M.2_1 | /boot/efi | 1GB | UEFI boot partition |
| **990 Pro** | M.2_1 | / (root) | 200GB | Ubuntu 24.04 LTS |
| **990 Pro** | M.2_1 | /home | 1,661GB | User files, projects |
| **T700** | M.2_2 | /data/datasets | 2TB | Training datasets |
| **T700** | M.2_2 | /data/models | 1.7TB | Model checkpoints, weights |

### Future Storage Expansion

**Option 1**: Add 3rd & 4th M.2 drives
- **M.2_3**: 4TB Crucial T700 (+$450)
- **M.2_4**: 4TB Crucial T700 (+$450)
- **Total**: 14TB NVMe (2TB + 4TB + 4TB + 4TB)

**Option 2**: Add SATA SSDs for archival
- **2× 4TB Samsung 870 EVO** in RAID 1 ($400)
- For model archives, backups

**Option 3**: SlimSAS NVMe expansion
- **U.2 NVMe enclosure**: 8× U.2 bays
- For massive dataset libraries (100TB+)

---

## Power Supply: Seasonic PRIME TX-1300

### Efficiency: 80 PLUS Titanium

| Specification | Value |
|---------------|-------|
| **Model** | PRIME TX-1300 |
| **Wattage** | 1300W |
| **Efficiency Rating** | 80 PLUS Titanium |
| **Efficiency (20% load)** | 94% |
| **Efficiency (50% load)** | 96% |
| **Efficiency (100% load)** | 94% |
| **Form Factor** | ATX 3.0 / ATX12V 3.0 |
| **Modularity** | Fully modular |
| **Fan Size** | 135mm Fluid Dynamic Bearing |
| **Fan Mode** | Hybrid (silent mode <300W) |
| **Dimensions** | 170mm (L) × 150mm (W) × 86mm (H) |
| **Warranty** | 12 years |
| **MTBF** | 120,000 hours |

### Connectors

**Power Connectors**:
- **ATX 24-pin**: 1× main motherboard power
- **EPS 12V (CPU)**: 2× 8-pin (4+4) [can power 500W+ CPUs]
- **PCIe 5.0 (12VHPWR)**: 2× 16-pin [600W each, 1200W total GPU power]
- **PCIe 8-pin**: 10× 6+2 pin [legacy GPUs, additional devices]
- **SATA**: 12× SATA power connectors
- **Molex**: 4× 4-pin peripheral power

**Cable Lengths**:
- ATX 24-pin: 650mm
- EPS 8-pin: 750mm
- PCIe 12VHPWR: 750mm
- SATA: 500mm + 150mm increments

### Power Budget Analysis

#### Single GPU Configuration (Current Build)

| Component | Idle | Typical | Peak | Notes |
|-----------|------|---------|------|-------|
| **GPU (Max-Q)** | 30W | 250W | 300W | Under full AI load |
| **CPU (9975WX)** | 50W | 200W | 400W | All-core turbo |
| **Motherboard + RAM** | 30W | 40W | 50W | VRM, chipset, 192GB RAM |
| **Storage (2× NVMe)** | 5W | 10W | 20W | Simultaneous writes |
| **Fans (5× 140mm)** | 10W | 15W | 25W | Full speed |
| **Peripherals** | 10W | 10W | 10W | USB devices |
| **Total** | **135W** | **525W** | **805W** | |
| **PSU Efficiency** | 70% | 96% | 94% | |
| **AC Draw** | 193W | 547W | 856W | From wall |

**Headroom**: 1300W - 805W = **495W available** (enough for 2nd GPU!)

#### Dual GPU Configuration (Future)

| Component | Idle | Typical | Peak |
|-----------|------|---------|------|
| **2× GPU (Max-Q)** | 60W | 500W | 600W |
| **CPU (9975WX)** | 50W | 200W | 400W |
| **Motherboard + RAM** | 30W | 40W | 50W |
| **Storage** | 5W | 10W | 20W |
| **Fans** | 10W | 15W | 25W |
| **Peripherals** | 10W | 10W | 10W |
| **Total** | **165W** | **775W** | **1,105W** |

**Headroom**: 1300W - 1,105W = **195W** (safe margin!)

**Efficiency Sweet Spot**: 775W typical load = ~60% PSU load = 96% efficient (optimal!)

### Why Titanium Efficiency?

**Gold vs Titanium Comparison** (annual cost at $0.15/kWh):

| Scenario | Hours/Year | Avg Load | Gold (90%) | Titanium (96%) | Annual Savings |
|----------|------------|----------|------------|----------------|----------------|
| **Light Use** | 2,000 | 300W | $100 | $94 | $6/year |
| **Heavy Use** | 4,000 | 600W | $400 | $375 | $25/year |
| **24/7 Training** | 8,760 | 800W | $1,168 | $1,095 | $73/year |

**ROI**: $100 premium for Titanium → pays for itself in ~2-3 years with heavy use

**Additional Benefits**:
- Less heat generation (96% efficient = 4% heat vs 10% heat)
- Quieter operation (less fan noise)
- Longer component life (less thermal stress)

### Protection Features

- **OVP**: Over Voltage Protection
- **UVP**: Under Voltage Protection
- **OPP**: Over Power Protection (auto shutdown >1430W)
- **OTP**: Over Temperature Protection
- **SCP**: Short Circuit Protection
- **OCP**: Over Current Protection (per rail)

### Comparison to Alternatives

| Model | Wattage | Efficiency | Warranty | Price | Notes |
|-------|---------|------------|----------|-------|-------|
| **Seasonic TX-1300** | 1300W | Titanium | 12yr | $380 | Recommended |
| **Corsair AX1600i** | 1600W | Titanium | 10yr | $550 | Overkill, expensive |
| **EVGA 1300 G+** | 1300W | Gold | 10yr | $280 | Save $100, less efficient |
| **Seasonic TX-1600** | 1600W | Titanium | 12yr | $500 | For 3-4 GPU builds |

---

## Cooling: Noctua NH-U14S TR5-SP6

### Design: Single Tower Air Cooler

| Specification | Value |
|---------------|-------|
| **Model** | NH-U14S TR5-SP6 |
| **Type** | Air cooler (tower design) |
| **Socket Compatibility** | sTR5 / SP6 (Threadripper PRO / EPYC) |
| **Height** | 165mm |
| **Width** | 150mm |
| **Depth** | 78mm |
| **Weight** | ~1.1 kg (with fan) |
| **Heatpipes** | 6× 6mm copper heatpipes |
| **Fin Stack** | Aluminum fins with nickel plating |
| **Base** | Copper (nickel-plated, mirror finish) |
| **TDP Rating** | 220W (continuous) |
| **Fan** | 1× Noctua NF-A15 PWM (140mm) |

### Fan Specifications

| Feature | Value |
|---------|-------|
| **Model** | NF-A15 PWM |
| **Size** | 140mm × 150mm × 25mm |
| **Bearing** | SSO2 (Self-Stabilizing Oil-pressure) |
| **Speed Range** | 300 - 1,500 RPM |
| **Airflow** | 140.2 m³/h (at 1,500 RPM) |
| **Static Pressure** | 2.08 mm H₂O |
| **Noise Level** | 19.2 dB(A) @ 300 RPM, 24.6 dB(A) @ 1,500 RPM |
| **MTTF** | 150,000 hours |
| **Warranty** | 6 years |

### Thermal Performance

**Test Conditions**: Threadripper PRO 9975WX (350W TDP), 23°C ambient

| Workload | CPU Power | CPU Temp | Fan Speed | Noise |
|----------|-----------|----------|-----------|-------|
| **Idle** | 50W | 35-40°C | 300 RPM | Silent (19 dB) |
| **Light (Web/Dev)** | 100W | 45-50°C | 500 RPM | Very quiet (20 dB) |
| **Medium (Compile)** | 200W | 60-65°C | 900 RPM | Quiet (22 dB) |
| **Heavy (All-Core)** | 350W | 80-85°C | 1,500 RPM | Audible (25 dB) |
| **Sustained Training** | 300W avg | 75-80°C | 1,200 RPM | Moderate (23 dB) |

**Thermal Headroom**:
- **Recommended max**: 90°C (Tcase max is 95°C)
- **Typical training load**: 75-80°C (safe zone)
- **Peak short bursts**: 85°C (acceptable)

**Note**: For 24/7 LLM training at 350W, this cooler will run warm but within spec. For best results, consider custom loop upgrade later.

### Clearance & Compatibility

**RAM Clearance**:
- Offset design allows use of tall RAM
- Clearance: 52mm with fan centered
- Compatible with all standard server RAM (typically <50mm)

**Case Clearance**:
- Fractal Define 7 XL: ✅ Fits (185mm max, 165mm cooler)
- Most full tower cases: ✅ Fits

**PCIe Clearance**:
- Does NOT block PCIe slot 1 (GPU slot)
- Oriented perpendicular to motherboard length

### Installation

**Mounting System**:
- SecuFirm2 mounting kit (sTR5 specific)
- Spring-loaded screws for even pressure
- Requires motherboard removal for installation
- Pre-applied NT-H1 thermal paste (or use NT-H2)

**Installation Time**: ~30 minutes (first-time builders)

### Comparison: Air vs AIO vs Custom Loop

| Solution | TDP Rating | Noise | Maintenance | Cost | Notes |
|----------|-----------|-------|-------------|------|-------|
| **Noctua NH-U14S** | 220W | Low | None | $120 | Recommended for general use |
| **IceGiant ProSiphon** | 280W | Low | None | $170 | Best air cooling |
| **Arctic LF II 360** | 300W+ | Medium | Occasional | $140 | Good AIO |
| **Custom Loop (EK)** | 400W+ | Very Low | Regular | $800 | Best for 24/7 training |

**When to Upgrade to Custom Loop**:
- Sustained 350W+ CPU power draw for days
- Thermal throttling observed (CPU drops below boost clocks)
- Noise becomes issue during long training runs
- Planning for extreme overclocking

---

## Case: Fractal Design Define 7 XL

### Design Philosophy: Silent Professional Workstation

| Specification | Value |
|---------------|-------|
| **Model** | Define 7 XL Dark Tempered Glass |
| **Form Factor** | Full Tower |
| **Motherboard Support** | EEB, E-ATX, ATX, mATX, Mini-ITX |
| **Dimensions** | 604mm (H) × 240mm (W) × 547mm (D) |
| **Weight** | ~18 kg (empty) |
| **Material** | Steel (SECC), tempered glass panel |
| **Color** | Black (other colors available) |

### Clearances

| Component | Maximum Clearance | Our Build | Margin |
|-----------|------------------|-----------|--------|
| **GPU Length** | 491mm (no front fans), 315mm (with fans) | 267mm | 224mm / 48mm |
| **CPU Cooler Height** | 185mm | 165mm | 20mm |
| **PSU Length** | 300mm | 170mm | 130mm |
| **Radiator (Top)** | 420mm (3× 140mm) or 360mm (3× 120mm) | N/A | Future custom loop |
| **Radiator (Front)** | 420mm or 360mm | N/A | |
| **Radiator (Bottom)** | 240mm or 280mm | N/A | |

### Drive Support

**Internal**:
- 6× 3.5" or 2.5" (modular mounting cages)
- 4× 2.5" (dedicated SSD trays behind motherboard)
- **Total**: Up to 10 drives

**Our Build Usage**:
- 2× M.2 NVMe (motherboard)
- 0× 3.5"/2.5" initially
- **Expansion**: Room for 10 SATA drives later

### Expansion Slots

- **9× PCI expansion slots** (vertical GPU bracket compatible)
- **Multi-GPU Support**: Confirmed for 4× dual-slot GPUs
  - GPU 1: Slots 1-2
  - GPU 2: Slots 3-4
  - GPU 3: Slots 5-6
  - GPU 4: Slots 7-8
  - Slot 9: Available for NIC/other card

### Fan Mounts & Cooling

**Pre-installed Fans**:
- 3× Fractal Design Dynamic X2 GP-14 (140mm) PWM fans
  - 2× front intake
  - 1× rear exhaust
  - Speed: 400-1,200 RPM
  - Noise: 19-28 dB(A)

**Additional Fan Mounting**:
- **Front**: 3× 140mm or 3× 120mm
- **Top**: 3× 140mm or 3× 120mm
- **Bottom**: 3× 140mm or 3× 120mm (with PSU shroud removed)
- **Rear**: 1× 140mm or 1× 120mm
- **Side**: 1× 140mm or 1× 120mm (optional)

**Maximum Fans**: Up to 11× 140mm total

**Recommended Fan Config for AI Workstation**:
- **Front**: 3× 140mm intake (1200 RPM) – cool air over GPUs
- **Rear**: 1× 140mm exhaust (1000 RPM) – CPU heat exit
- **Top**: 2× 140mm exhaust (800 RPM) – GPU heat rise exit
- **Total**: 6× 140mm PWM fans (add 3 to stock config, ~$50)

### Sound Dampening

**ModuVent™ Design**:
- Removable sound-dampening panels on top
- Sound-dampening foam on front, top, side panels
- Noise reduction: ~10-15 dB vs non-dampened cases

**Airflow vs Silence Toggle**:
- Close ModuVent panels: Quieter, slightly higher temps (+2-3°C)
- Open ModuVent panels: Better airflow, slightly louder

**For LLM Training**:
- Recommend: Panels OPEN during training (better GPU cooling)
- Panels CLOSED during idle (quieter office environment)

### Front I/O

- 1× USB 3.1 Gen 2 Type-C (10 Gbps)
- 2× USB 3.0 Type-A (5 Gbps)
- Audio jack (headphone/microphone combo)
- Power button with LED
- Reset button

### Cable Management

- 25mm cable management space behind motherboard tray
- Multiple cable routing grommets
- Velcro straps included
- PSU shroud hides cables
- Vertical SSD mounting behind motherboard

### Build Quality

**Material**:
- Steel chassis (powder-coated)
- Tempered glass side panel (4mm thick)
- Magnetic dust filters (top, front, bottom)

**Filters**:
- Easily removable without tools
- Washable nylon mesh
- **Maintenance**: Clean filters monthly for optimal airflow

### Comparison to Alternatives

| Case | Size | GPU Support | Noise Dampening | Price | Notes |
|------|------|-------------|-----------------|-------|-------|
| **Fractal Define 7 XL** | Full Tower | 4× GPUs | ✅ Excellent | $200 | Recommended |
| **Corsair Obsidian 1000D** | Super Tower | 4× GPUs | ⚠️ Moderate | $500 | Premium, overkill |
| **Phanteks Enthoo Pro 2** | Full Tower | 4× GPUs | ⚠️ Moderate | $140 | Budget option |
| **Lian Li O11 Dynamic XL** | Full Tower | 4× GPUs | ❌ None | $200 | Show build, loud |

### Cooling Performance (Estimated)

**GPU Temperatures** (RTX PRO 6000 Max-Q, 300W, 23°C ambient):
- **Idle**: 30-35°C
- **Light Load (100W)**: 45-50°C
- **Training (250W avg)**: 65-70°C
- **Peak (300W)**: 75-80°C

**Thermal Strategy**:
- Positive pressure (more intake than exhaust)
- Front fans push cool air directly at GPUs
- Top exhaust removes hot air naturally (convection)
- Sound dampening reduces noise without sacrificing airflow

---

## Summary: Component Synergy

All components in this build are carefully chosen to work together:

1. **RTX PRO 6000 Max-Q** provides 96GB VRAM at 300W (efficient, expandable to 4× GPUs)
2. **Threadripper PRO 9975WX** delivers 128 PCIe 5.0 lanes for future multi-GPU expansion
3. **WRX90E-SAGE SE** motherboard enables 4× full x16 GPUs + 10GbE + IPMI
4. **192GB DDR5-6400 ECC** matches NVIDIA's 2× VRAM recommendation
5. **PCIe 5.0 NVMe (T700)** loads models 67% faster than PCIe 4.0
6. **1300W Titanium PSU** handles 2× GPUs efficiently (96% efficiency at load)
7. **Air cooling (Noctua)** keeps noise low and provides upgrade path to custom loop
8. **Define 7 XL case** accommodates everything with room for 4× GPUs and excellent sound dampening

**Result**: A professional LLM development workstation that scales from 1 to 4 GPUs while maintaining quiet, efficient operation.

---

**Last Updated**: October 6, 2025
**Sources**: NVIDIA, AMD, ASUS, manufacturer spec sheets, a16z build documentation
