# FAQ & Troubleshooting Guide

**Document Version**: 1.0
**Date**: October 6, 2025

---

## Table of Contents

1. [General Questions](#general-questions)
2. [Hardware Questions](#hardware-questions)
3. [Software & Performance](#software--performance)
4. [Common Issues & Solutions](#common-issues--solutions)
5. [Upgrade Questions](#upgrade-questions)
6. [Cost & ROI Questions](#cost--roi-questions)

---

## General Questions

### Q1: Is this build suitable for beginners?

**A**: Assembly difficulty: **Intermediate**

**Beginner-Friendly Aspects**:
- Standard PC components (no exotic parts)
- Comprehensive build guide included
- Large case with good access
- Community support (r/buildapc, r/ASUS)

**Challenging Aspects**:
- Large CPU (TR5 socket requires care)
- EEB motherboard (bigger than standard ATX)
- BIOS update may be needed before first boot
- Cable management in full tower

**Recommendation**:
- ✅ **First-time builder with research**: Doable (allow 6-8 hours)
- ✅ **Pay for professional assembly**: $300-500 (worth it for peace of mind)
- ⚠️ **Never built a PC before**: Watch YouTube build guides first, or hire pro

---

### Q2: Why not just use cloud GPUs?

**A**: **Cloud is better IF**:
- Using <200 hours/month
- Short-term project (<6 months)
- Need extreme scalability (100+ GPUs for brief periods)
- No budget for upfront cost

**Local workstation is better IF**:
- Using >320 hours/month
- Long-term AI/ML work (2+ years)
- Need data privacy
- Hate queue times / want instant availability
- Budget allows $15k upfront

**See 06_ROI_ANALYSIS.md for detailed breakdown.**

---

### Q3: Can I build this cheaper?

**A**: Yes, but with trade-offs:

**Budget Cuts** (save ~$5,000):

| Change | Savings | Impact |
|--------|---------|--------|
| Ryzen 9 7950X (16c) instead of TR PRO 9975WX | -$3,500 | ❌ Lose PCIe lanes (no 4-GPU expansion) |
| RTX 4090 (24GB) instead of RTX PRO 6000 | -$5,750 | ❌ Lose 72GB VRAM, no ECC, consumer GPU |
| 128GB RAM instead of 192GB | -$300 | ⚠️ Below NVIDIA's 2× VRAM recommendation |
| Air cooling (keep) | $0 | ✅ No change |
| Standard ATX case | -$100 | ⚠️ May limit future expansion |

**"Budget" Build**: ~$9,000
- 16-core Ryzen, RTX 4090 24GB, 128GB RAM
- **Good for**: Solo dev, 7B-13B models only
- **Bad for**: Fine-tuning 70B, multi-GPU expansion

**Recommendation**: If budget is tight, save longer OR use cloud until you can afford the full build. Cutting corners on core components hurts expansion potential.

---

### Q4: How long will this build last?

**A**: **5-7 years** of relevance (estimated)

**Historical Context**:
- RTX Titan (2018, 24GB): Still usable today for many LLM tasks
- Threadripper 3990X (2020, 64c): Still competitive in 2025

**Our Build Longevity Factors**:
- ✅ **Latest Architecture**: Blackwell (2025), Zen 5 (2025)
- ✅ **Massive VRAM**: 96GB future-proofs for larger models
- ✅ **Expansion Ready**: Can add 3 more GPUs (384GB total)
- ✅ **PCIe 5.0**: Won't be saturated for years

**Upgrade Timeline**:
- **Years 0-3**: Cutting edge
- **Years 3-5**: Still very capable, add 2nd GPU if needed
- **Years 5-7**: Aging but usable, consider full replacement

**Resale Value** (Year 3): ~$9,000 (60% of original)

---

### Q5: What if I need more than 4 GPUs?

**A**: **This platform maxes at 4 GPUs** (PCIe slot limitations)

**For 5-8 GPUs**, consider:

**Option A**: Build a second workstation
- Cost: $15k × 2 = $30k
- Benefit: 8 GPUs total (2× 4-GPU systems)
- Network them for distributed training

**Option B**: Server Platform (AMD EPYC or Intel Xeon Scalable)
- Motherboards with 8× PCIe 5.0 x16 slots exist
- Cost: $40-80k for 8-GPU server
- Requires rack, data center-grade cooling

**Option C**: Cloud (for >4 GPU bursts)
- Hybrid: Local 4 GPUs for daily work
- Cloud for occasional massive parallelism

**Recommendation**: 4 GPUs is enough for 99% of LLM development. If you genuinely need 8+ GPUs, you're likely at a scale where cloud or dedicated server is more appropriate.

---

## Hardware Questions

### Q6: Why Threadripper PRO vs Regular Threadripper or Ryzen?

**A**: **Threadripper PRO advantages**:

| Feature | TR PRO 9975WX | TR 9950X | Ryzen 9 7950X |
|---------|---------------|----------|---------------|
| **Cores** | 32 | 24 | 16 |
| **PCIe Lanes** | 128 | 88 | 28 |
| **RAM Channels** | 8 | 4 | 2 |
| **ECC Support** | ✅ Yes | ✅ Yes | ❌ No |
| **Max RAM** | 2TB | 1TB | 128GB |
| **Multi-GPU** | 4× x16 | 2× x16 | 1× x16 + 1× x8 |
| **Price** | $4,099 | $2,699 | $699 |

**For LLM Workstations**: TR PRO is worth the premium for:
- ✅ 4-GPU expansion (needs 128 PCIe lanes)
- ✅ 8-channel RAM (higher bandwidth)
- ✅ ECC support (data integrity during training)

**If on tight budget**: Ryzen 9 7950X is OK for 1-GPU build, but can't expand to 4 GPUs later.

---

### Q7: Why Max-Q GPU instead of standard 600W variant?

**A**: **Max-Q (300W) advantages**:

| Factor | Max-Q (300W) | Standard (600W) |
|--------|-------------|-----------------|
| **Performance** | 88% of standard | 100% |
| **Power Draw** | 300W | 600W |
| **Thermal Output** | Lower | Higher |
| **Multi-GPU Feasible?** | ✅ Yes (4× tested by a16z) | ⚠️ Challenging (2× max practical) |
| **PSU Requirement (4 GPUs)** | 1600W | 2800W (not standard PSUs) |
| **Cooling (4 GPUs)** | Custom loop OK | Extreme cooling required |

**Decision**: 12% performance sacrifice is worth it for:
- Better thermals (can run 24/7 without overheating)
- Multi-GPU scalability (can add 3 more later)
- Standard PSU support (1600W available)

**If you absolutely need max performance**: Get Standard (600W), but plan for 1-2 GPU max.

---

### Q8: Can I use cheaper consumer RAM instead of ECC?

**A**: **Technically yes, but not recommended.**

| RAM Type | Our Build (ECC) | Alternative (Non-ECC) | Savings |
|----------|----------------|----------------------|---------|
| 192GB DDR5-6400 ECC | $950 | 192GB DDR5-6400 Non-ECC: $700 | $250 |

**Why ECC Matters for LLM Work**:
- **Training**: Single bit flip during 48-hour training run = corrupted model
- **Data Integrity**: ECC detects and corrects memory errors
- **Professional Use**: All serious AI workstations use ECC

**When Non-ECC is OK**:
- Inference only (not training)
- Short experiments (<1 hour)
- Can easily re-run if corruption occurs

**Recommendation**: ✅ **Stick with ECC**. $250 savings not worth risking days of training work.

---

### Q9: Do I need the PCIe 5.0 storage or is PCIe 4.0 enough?

**A**: **PCIe 5.0 is a nice-to-have, not must-have.**

**Model Loading Speed Comparison**:

| Model | PCIe 4.0 (7.4 GB/s) | PCIe 5.0 (12.4 GB/s) | Time Saved |
|-------|-------------------|---------------------|------------|
| Llama 7B (13GB) | 1.8 sec | 1.0 sec | 0.8 sec |
| Llama 70B (140GB) | 18.9 sec | 11.3 sec | 7.6 sec |
| Llama 405B (810GB) | 109 sec | 65 sec | 44 sec |

**Budget Alternative**:

| Config | Cost | Performance |
|--------|------|-------------|
| **Our Build**: 2TB PCIe 4.0 + 4TB PCIe 5.0 | $650 | Best of both |
| **Budget**: 2× 4TB PCIe 4.0 | $450 | 95% as good |

**Savings**: $200 by using all PCIe 4.0

**Recommendation**:
- ✅ **Budget allows**: Get PCIe 5.0 for data drive (as spec'd)
- ⚠️ **Tight budget**: PCIe 4.0 is fine (save $200)

---

### Q10: Why such a large PSU? Can I use 1000W?

**A**: **1300W is for future expansion.**

**Current Build** (1 GPU):
- Peak power: 805W
- 1000W PSU would work (805W / 1000W = 80% load)

**But**:
- Adding 2nd GPU: 1,105W peak → 1000W PSU too small! ❌
- 1300W PSU: Allows 2 GPUs comfortably (1,105W / 1300W = 85% load) ✅

**Alternative**:
- Start with 1000W PSU (save $100-150)
- Upgrade to 1600W when adding 2nd GPU

**Recommendation**: ✅ **Get 1300W now** to avoid replacing PSU later (PSU swaps are annoying).

---

## Software & Performance

### Q11: Ubuntu vs Windows for LLM work?

**A**: **Ubuntu 24.04 LTS strongly recommended.**

| Factor | Ubuntu 24.04 LTS | Windows 11 |
|--------|-----------------|------------|
| **NVIDIA Driver Support** | ✅ Excellent | ✅ Good |
| **CUDA Toolkit** | ✅ Native | ⚠️ WSL2 only |
| **PyTorch / TensorFlow** | ✅ Native performance | ⚠️ ~10% slower (WSL overhead) |
| **llama.cpp** | ✅ Best performance | ⚠️ Requires compilation |
| **vLLM** | ✅ Full support | ❌ Limited (WSL2) |
| **System Overhead** | Low (~2GB RAM idle) | Higher (~6GB RAM idle) |
| **Professional Ecosystem** | ✅ Standard for AI/ML | ⚠️ Niche |

**Dual Boot Option**:
- Ubuntu (primary): 180GB partition for LLM work
- Windows (secondary): 50GB partition for compatibility if needed

**Recommendation**: ✅ **Ubuntu 24.04 LTS** for best performance. Use Windows VM if specific apps needed.

---

### Q12: How do I monitor GPU usage during training?

**A**: **Multiple tools available:**

**Basic** (nvidia-smi):
```bash
watch -n 1 nvidia-smi
```

**Better** (nvitop):
```bash
pip install nvitop
nvitop
```

**Best** (wandb for ML tracking):
```bash
pip install wandb
# Integrate with training script for full metrics
```

**Also Useful**:
- `htop`: CPU/RAM monitoring
- `iotop`: Disk I/O
- `btop`: All-in-one TUI

---

### Q13: Why is my GPU inference slower than benchmarks?

**Troubleshooting Checklist**:

1. **Check GPU is being used**:
   ```bash
   nvidia-smi  # Should show GPU utilization >80% during inference
   ```

2. **Verify CUDA is working**:
   ```bash
   python3 -c "import torch; print(torch.cuda.is_available())"
   # Should print: True
   ```

3. **Check power mode**:
   ```bash
   nvidia-smi -q | grep "Power Limit"
   # Should show: 300W (not throttled to lower)
   ```

4. **Disable CPU offloading** (if using llama.cpp):
   ```bash
   # Use -ngl 99 to offload ALL layers to GPU
   ./llama-cli -m model.gguf -ngl 99 -p "test"
   ```

5. **Check thermal throttling**:
   ```bash
   nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader
   # Should be <85°C. If >85°C, improve cooling.
   ```

---

### Q14: Can I train models while doing inference?

**A**: **Yes, but with performance impact.**

| Scenario | Feasible? | Performance Impact |
|----------|-----------|-------------------|
| **Light inference** (1-2 requests/min) + training | ✅ Yes | ~5-10% slower training |
| **Heavy inference** (10+ requests/min) + training | ⚠️ Possible | ~30-50% slower training |
| **Training + training** (2 models) | ✅ Yes | Split VRAM, 2× slower each |

**Recommendation**:
- Single GPU: Dedicate to training OR inference (not both)
- Dual GPU: GPU 1 for training, GPU 2 for inference ✅

---

### Q15: How do I update NVIDIA drivers?

**Ubuntu**:

```bash
# Check current driver
nvidia-smi

# Update to latest driver
sudo ubuntu-drivers install

# Or specific version
sudo apt install nvidia-driver-570  # Example: driver 570

# Reboot
sudo reboot

# Verify
nvidia-smi
```

**Frequency**: Check for updates monthly. NVIDIA releases driver updates every 1-2 months.

---

## Common Issues & Solutions

### Issue 1: System won't POST (no display)

**Symptoms**: Fans spin, no display output

**Solutions** (in order):

1. **Verify display cable connected to GPU** (NOT motherboard - TR PRO has no iGPU!)
2. **Check GPU power cable** (12VHPWR must be fully seated)
3. **Reseat GPU** in PCIe slot (remove and reinstall)
4. **Try different DisplayPort/HDMI port** on GPU
5. **Clear CMOS** (button on rear I/O or jumper on motherboard)
6. **Remove all RAM except 1 stick**, try different slots
7. **Verify CPU is properly installed** (rare, but check)

**If still no POST**: Contact motherboard manufacturer support or seek professional help.

---

### Issue 2: Only detecting partial RAM (e.g., 128GB instead of 192GB)

**Symptoms**: BIOS or OS shows less RAM than installed

**Solutions**:

1. **Reseat ALL RAM sticks** (remove and firmly reinstall)
2. **Verify correct slot population** (consult motherboard manual for 6-DIMM config)
3. **Test one stick at a time** to identify faulty module
4. **Update BIOS** to latest version (improves RAM compatibility)
5. **Check RAM compatibility list** on ASUS website
6. **Try different RAM slots** (some slots may be faulty)

**If one stick faulty**: RMA it (return to manufacturer)

---

### Issue 3: GPU detected but nvidia-smi shows "No devices found"

**Symptoms**: GPU in BIOS, but Linux can't see it

**Solutions**:

1. **Verify driver installation**:
   ```bash
   nvidia-smi
   # If error: install drivers
   sudo ubuntu-drivers install
   sudo reboot
   ```

2. **Check secure boot** (may block NVIDIA driver):
   ```bash
   mokutil --sb-state
   # If "SecureBoot enabled", disable in BIOS
   ```

3. **Manually install driver** from NVIDIA:
   ```bash
   # Download from nvidia.com/drivers
   sudo sh NVIDIA-Linux-x86_64-565.XX.run
   ```

4. **Check kernel modules**:
   ```bash
   lsmod | grep nvidia
   # Should show: nvidia, nvidia_uvm, nvidia_modeset
   ```

---

### Issue 4: CPU temperatures high (>90°C) under load

**Symptoms**: CPU thermal throttling, performance degradation

**Solutions**:

1. **Check CPU cooler is properly mounted**:
   - Should have resistance when trying to wiggle heatsink
   - All screws tightened evenly (cross-pattern)

2. **Verify thermal paste application**:
   - Remove cooler, check coverage on CPU IHS
   - Reapply if needed (pea-sized dot in center)

3. **Check fan is spinning and connected**:
   ```bash
   sensors  # Should show CPU fan RPM >800
   ```

4. **Adjust fan curve in BIOS**:
   - Set to "Performance" mode or custom curve
   - Max RPM at 80°C, not 90°C

5. **Improve case airflow**:
   - Add more intake/exhaust fans
   - Open ModuVent panels on case

6. **Upgrade cooling** (if persistent):
   - Consider AIO (Arctic Liquid Freezer II 360)
   - Or custom loop (see Upgrade Path)

---

### Issue 5: Slow model loading times (longer than benchmarks)

**Symptoms**: Llama 70B takes 60+ seconds to load (should be ~20 sec)

**Causes & Solutions**:

1. **Check if using correct NVMe drive**:
   ```bash
   df -h  # Verify model on PCIe 5.0 drive (/data/models)
   ```

2. **Check NVMe performance**:
   ```bash
   # Install fio
   sudo apt install fio

   # Benchmark read speed
   sudo fio --name=seqread --rw=read --bs=1M --size=10G --filename=/data/models/test
   # Should show ~12,000 MB/s for Crucial T700
   ```

3. **Verify PCIe 5.0 mode** (not downgraded to PCIe 3.0):
   ```bash
   sudo lspci -vv | grep "LnkSta"
   # Look for: Speed 32GT/s (PCIe 5.0)
   ```

4. **Check for background processes** using disk:
   ```bash
   sudo iotop  # Look for high I/O processes
   ```

---

### Issue 6: "Out of memory" errors during fine-tuning

**Symptoms**: CUDA out of memory, training crashes

**Solutions**:

1. **Reduce batch size**:
   ```python
   # In training script
   batch_size = 1  # Reduce from 4 to 1
   ```

2. **Enable gradient accumulation**:
   ```python
   gradient_accumulation_steps = 4  # Simulate batch=4 with batch=1
   ```

3. **Use gradient checkpointing**:
   ```python
   model.gradient_checkpointing_enable()
   ```

4. **Switch to QLoRA** (instead of full fine-tune):
   ```python
   # Use 4-bit quantization for base model
   model = AutoModelForCausalLM.from_pretrained(
       model_name,
       load_in_4bit=True,
       bnb_4bit_quant_type="nf4"
   )
   ```

5. **Monitor VRAM usage**:
   ```bash
   watch -n 1 nvidia-smi  # Check VRAM during training
   ```

---

## Upgrade Questions

### Q16: When should I add a 2nd GPU?

**Add 2nd GPU IF**:

✅ **GPU utilization >80%** consistently (check with `nvidia-smi`)
✅ **Running out of VRAM** (need >96GB for models)
✅ **Training multiple models** simultaneously
✅ **Long queue times** waiting for single GPU to finish

**DON'T add 2nd GPU if**:
- GPU utilization <50% most of the time
- Not hitting VRAM limits
- Budget could be better spent on cloud bursts

**ROI**: If you're paying for cloud GPU 320+ hours/month, 2nd GPU pays for itself in <2 years.

---

### Q17: Can I mix GPUs (e.g., RTX 4090 + RTX PRO 6000)?

**A**: **Technically yes, but not recommended.**

**Challenges**:
- Different VRAM (24GB vs 96GB) = can't pool memory
- Different architectures = may not work well for multi-GPU training
- Software compatibility issues

**Better Approach**:
- Sell RTX 4090 (~$1,200 used)
- Buy 2× RTX PRO 6000 Max-Q for matched performance

---

### Q18: How do I know if I need more RAM?

**Monitor RAM usage**:

```bash
htop  # Look at "Mem" bar (should be <85% used during heavy workloads)
```

**Add RAM IF**:
- Consistently using >85% RAM during training
- Getting "Out of memory" errors (not CUDA, but system RAM)
- Running multiple large datasets in memory

**Most users**: 192GB is sufficient for years. Only upgrade if measurably constrained.

---

## Cost & ROI Questions

### Q19: What's the true total cost of ownership over 5 years?

**A**: See detailed breakdown in 06_ROI_ANALYSIS.md

**Summary** (Medium Use: 320h/month):

| Year | Hardware | Electricity | Upgrades | Annual Total |
|------|----------|-------------|----------|--------------|
| 1 | $14,949 | $960 | $1,050 (UPS + Storage) | $16,959 |
| 2 | $0 | $960 | $8,300 (2nd GPU) | $9,260 |
| 3 | $0 | $960 | $0 | $960 |
| 4 | $0 | $960 | $0 | $960 |
| 5 | $0 | $960 | $0 | $960 |
| **Total 5yr** | | | | **$29,099** |

**Cloud Equivalent** (Lambda Labs, 320h/month × 60 months):
- $352/month × 60 = **$21,120**

**But**: Local includes 2× GPUs (192GB VRAM) vs cloud single GPU

**Adjusted Cloud** (2× A100 for fair comparison):
- $704/month × 60 = **$42,240**

**5-Year Savings**: $42,240 - $29,099 = **$13,141** ✅

---

### Q20: Can I claim this as a tax deduction?

**A**: **Consult a tax professional** (laws vary by country/state)

**General Guidance (US)**:

**If Self-Employed or Freelancer**:
- ✅ Likely deductible as business equipment
- Depreciate over 5 years using Modified Accelerated Cost Recovery System (MACRS)
- Year 1 deduction: ~$3,000 (20% of $14,949)
- Consult CPA for Section 179 immediate expensing option

**If Employee (W-2)**:
- ⚠️ Harder to deduct (unreimbursed employee expenses not deductible in most cases)
- May qualify if required for work and not reimbursed by employer

**Documentation**:
- Keep all receipts
- Document business use percentage (e.g., 90% work, 10% personal)
- Track usage logs

**Disclaimer**: Not tax advice! Always consult a professional.

---

## Final Tips

### Maintenance Checklist (Monthly)

- [ ] Clean dust filters on case (wash with water, let dry)
- [ ] Check GPU/CPU temperatures (log over time, watch for increases)
- [ ] Monitor drive health: `sudo smartctl -a /dev/nvme0n1`
- [ ] Update NVIDIA drivers if new version available
- [ ] Backup important model checkpoints to external storage

### When to Seek Professional Help

**Contact Manufacturer Support**:
- Hardware failures under warranty
- Persistent POST issues
- Component defects

**Hire Professional**:
- Complex custom water cooling installation
- Diagnosing intermittent crashes
- Performance tuning for extreme workloads

**Community Resources**:
- r/buildapc (Reddit)
- Tom's Hardware Forums
- ASUS Support Forums
- NVIDIA Developer Forums

---

**Last Updated**: October 6, 2025
**For Additional Questions**: Consult component manuals or manufacturer support
