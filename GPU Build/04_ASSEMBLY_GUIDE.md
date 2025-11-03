# Assembly Guide - Step by Step

**Document Version**: 1.0
**Date**: October 6, 2025
**Estimated Build Time**: 3-4 hours (first-time builder)
**Difficulty**: Intermediate

---

## ⚠️ Important Pre-Build Checklist

Before starting assembly:

- [ ] Anti-static wrist strap available
- [ ] Clean, well-lit workspace (large table or desk)
- [ ] Phillips head screwdriver (magnetic tip recommended)
- [ ] All components unboxed and verified
- [ ] Motherboard manual downloaded/printed
- [ ] BIOS update prepared (if needed for TR PRO 9000 support)
- [ ] 2-3 hours of uninterrupted time

---

## Phase 1: Pre-Assembly Preparation

### Step 1.1: Inventory Check

**Unbox and verify all components**:

| Component | Verify | Accessories |
|-----------|--------|-------------|
| **GPU** | Physical condition, no bent pins on connector | Power adapter cable (12VHPWR), manual |
| **CPU** | Sealed box, check manufacturing date | Torx driver (may be included), manual |
| **Motherboard** | No bent pins in socket, check BIOS version sticker | I/O shield, SATA cables, M.2 screws |
| **RAM** | All 6 modules present, labels match specs | None |
| **PSU** | All modular cables present | Power cable, cable bag |
| **Cooler** | Mounting hardware, thermal paste | Fan, installation manual |
| **Case** | No shipping damage, all panels removable | Extra screws, standoffs, cable ties |
| **Storage** | Both drives present, check capacities | M.2 screws (usually with motherboard) |

### Step 1.2: BIOS Update Preparation (CRITICAL!)

**Check ASUS WRX90E-SAGE SE BIOS version**:

1. Look for sticker on motherboard box or board itself
2. Check if BIOS version supports Threadripper PRO 9000 series:
   - **Required**: BIOS 0803 or later (released July 2025)
   - **If older**: You MUST update BIOS before installing CPU!

**How to update BIOS without CPU** (BIOS FlashBack):

1. Download latest BIOS from ASUS support website
2. Format USB drive as FAT32
3. Rename BIOS file to exactly: `WRX90ESE.CAP`
4. Copy to root of USB drive
5. With motherboard powered (24-pin + 8-pin EPS connected, NO CPU):
   - Insert USB drive into FlashBack port (check manual)
   - Press BIOS FlashBack button on rear I/O
   - LED will blink for 5-10 minutes
   - When LED stops blinking, update complete
6. Power off, remove USB, proceed with CPU installation

**Why this matters**: Installing TR PRO 9000 CPU on old BIOS = system won't POST!

### Step 1.3: Workspace Setup

1. **Clear large workspace** (kitchen table, desk)
2. **Ground yourself**: Use anti-static wrist strap OR touch metal case frequently
3. **Lighting**: Ensure adequate light (headlamp recommended for case interior)
4. **Organization**: Keep screws in labeled containers (motherboard screws, case screws, etc.)
5. **Manuals**: Have motherboard manual readily available

---

## Phase 2: Motherboard Preparation (Outside Case)

**Why build outside case first?** Easier to install CPU, RAM, and troubleshoot potential issues before mounting in case.

### Step 2.1: Unpack Motherboard

1. Place motherboard on anti-static bag (that it came in) or cardboard box
2. Remove protective plastic covering I/O ports
3. Locate the following on motherboard:
   - CPU socket (large, center-left area)
   - 8× RAM slots (right side of socket)
   - 24-pin ATX power (right edge)
   - 2× 8-pin EPS CPU power (top-left)
   - M.2 slots (check manual for locations - usually near PCIe slots and bottom)

### Step 2.2: Install CPU (Threadripper PRO 9975WX)

**⚠️ MOST DELICATE STEP - TAKE YOUR TIME!**

**sTR5 Socket Installation Process**:

1. **Unlock socket**:
   - Locate socket lever/latch mechanism
   - Push down slightly and pull lever away from socket
   - Lift metal frame upward to reveal socket pins

2. **Prepare CPU**:
   - Remove CPU from plastic clamshell (do NOT touch gold contacts)
   - Note triangular alignment marker on CPU corner
   - Identify matching triangle on socket

3. **Install CPU**:
   - Hold CPU by edges only
   - Align triangular markers (CPU triangle to socket triangle)
   - Gently lower CPU straight down onto socket pins
   - **DO NOT PRESS DOWN** - CPU should seat by gravity alone
   - Verify CPU is flush and fully seated (check all edges)

4. **Lock socket**:
   - Lower metal frame back over CPU
   - Push lever back toward socket until it clicks/latches
   - Frame should apply even pressure on CPU IHS (lid)

5. **Verify**:
   - CPU should NOT move if gently nudged
   - All edges should be flush with socket frame

**Common Mistakes to Avoid**:
- ❌ Forcing CPU into socket (bent pins!)
- ❌ Wrong orientation (check triangles!)
- ❌ Forgetting to unlock socket before placing CPU
- ❌ Touching CPU contacts or socket pins

### Step 2.3: Install RAM (6× 32GB DDR5-6400)

**Optimal RAM Configuration for 8-channel**:

ASUS WRX90 boards use 8 DIMM slots. For 6× 32GB, populate in this order for best performance:

**Recommended Slot Population** (check motherboard manual for your specific board):
- **Channel A1**: Slot 1 ✅ Populated
- **Channel A2**: Slot 2 ✅ Populated
- **Channel B1**: Slot 3 ⬜ Empty
- **Channel B2**: Slot 4 ✅ Populated
- **Channel C1**: Slot 5 ✅ Populated
- **Channel C2**: Slot 6 ⬜ Empty
- **Channel D1**: Slot 7 ✅ Populated
- **Channel D2**: Slot 8 ✅ Populated

**Consult motherboard manual** for exact slot labeling (may vary).

**Installation Process**:

1. **Identify RAM slots**: Locate all 8 DIMM slots (right side of CPU socket)
2. **Open latches**: Push down tabs on both ends of each slot
3. **Align notch**: DDR5 has an off-center notch - align with slot key
4. **Install RAM**:
   - Hold RAM stick by edges (avoid touching gold contacts)
   - Align notch with slot key
   - Press down firmly on both ends simultaneously
   - You should hear/feel a CLICK when latches engage
   - Latches should automatically snap up around RAM
5. **Repeat** for all 6 modules in designated slots
6. **Verify**: All modules should be fully seated, latches engaged

### Step 2.4: Install M.2 SSDs

**Drive 1: Samsung 990 Pro 2TB** (OS drive - install in M.2_1)

1. Locate M.2_1 slot (usually closest to CPU, check manual)
2. Remove M.2 heatsink:
   - Unscrew heatsink screws (usually 1-2 screws)
   - Remove thermal pad protective film
3. Install SSD:
   - Remove M.2 screw from slot (if present)
   - Insert SSD at 30° angle into M.2 slot (notch aligned)
   - Press down flat and secure with M.2 screw (included with motherboard)
   - **Torque**: Snug, but not overly tight (strip risk!)
4. Apply thermal pad (if included with heatsink) or use existing pad
5. Reinstall M.2 heatsink

**Drive 2: Crucial T700 4TB** (Data drive - install in M.2_2)

- Repeat process above for second M.2 slot

**Note**: Leave M.2_3 and M.2_4 empty for future expansion.

### Step 2.5: Test POST (Power-On Self Test)

**Before installing in case, verify system POSTs**:

1. **Connect Power**:
   - Connect 24-pin ATX power cable (from PSU) to motherboard
   - Connect both 8-pin EPS CPU power cables to motherboard (top-left)
   - Connect PSU to wall outlet

2. **Connect Display**:
   - **Important**: Threadripper PRO CPUs do NOT have integrated graphics!
   - You MUST install GPU to get display output for BIOS
   - Temporarily install GPU in PCIe slot 1 (see Step 3.2 for full GPU install)
   - Connect display cable to GPU (use DisplayPort if available)
   - Connect PCIe 12VHPWR power to GPU

3. **Short Power Pins**:
   - Locate front panel header on motherboard (bottom-right area)
   - Find PWR_SW (Power Switch) pins
   - Use screwdriver to briefly short these pins (touch both pins simultaneously for 1 second)

4. **Observe**:
   - ✅ **Success**: Fans spin, POST beep (if speaker connected), BIOS screen appears
   - ❌ **Failure**: No power, no display - troubleshoot before continuing

**Troubleshooting POST Failures**:
- Verify all power connections are fully seated
- Check CPU is fully installed (re-seat if needed)
- Remove all RAM except 1 stick, try different slots
- Clear CMOS (button on rear I/O or jumper on motherboard)

5. **Enter BIOS**:
   - Press DEL or F2 during boot
   - Verify CPU is detected (should show: AMD Ryzen Threadripper PRO 9975WX)
   - Verify RAM is detected (should show: 192GB or close to it)
   - Verify both M.2 SSDs detected
   - **Set RAM to XMP/EXPO profile** for DDR5-6400 speed (if not auto)
   - **Save and Exit**

6. **Power Off**:
   - Shut down system
   - Disconnect power cables
   - Remove GPU temporarily (will reinstall in case)

---

## Phase 3: Case Preparation

### Step 3.1: Prepare Fractal Define 7 XL

1. **Remove Panels**:
   - Remove both side panels (usually thumbscrews or latches)
   - Remove front panel (gently pull from bottom)
   - Set panels aside in safe location

2. **Remove Drive Cages** (if needed for airflow):
   - Front drive cages can be removed for better GPU airflow
   - Keep screws organized for later reinstallation

3. **Install I/O Shield**:
   - Locate motherboard I/O shield (metal rectangle, came with motherboard)
   - Pop into rear case opening from INSIDE case
   - Press firmly on all edges until clips engage
   - Verify no tabs are bent inward (will interfere with ports)

4. **Install Motherboard Standoffs**:
   - Fractal Define 7 XL usually has standoffs pre-installed for ATX
   - **Verify EEB standoff alignment** (12" × 13" motherboard!)
   - If needed, install additional standoffs for EEB screw holes
   - **CRITICAL**: Do NOT overtighten standoffs - they should be snug, finger-tight + ¼ turn

5. **Plan Cable Routing**:
   - Identify cable management grommets
   - Plan routes for:
     - 24-pin ATX (right side of motherboard)
     - 8-pin EPS ×2 (top-left)
     - PCIe 12VHPWR (left side, to GPU area)
     - SATA power (if using SATA drives later)
     - Front panel connectors (bottom-right)

### Step 3.2: Install PSU (Seasonic PRIME TX-1300)

1. **Position PSU**:
   - Orient fan DOWN (toward ventilation holes in case bottom)
   - Slide into PSU bay (bottom-rear of case)
   - Align screw holes

2. **Secure PSU**:
   - Use 4× PSU screws (usually included with case)
   - Screw from rear of case
   - **Torque**: Firm, but not over-tightened

3. **Connect Modular Cables** (route through cable management):
   - **24-pin ATX**: Connect to PSU, route through grommet to motherboard right side
   - **2× 8-pin EPS (CPU)**: Connect to PSU, route to top-left of motherboard area
   - **2× PCIe 12VHPWR** (for GPU now + future 2nd GPU): Connect to PSU, route to GPU area
   - **SATA power** (for future drives): Can wait until needed
   - **Molex** (for peripherals): Can wait until needed

**Cable Management Tips**:
- Use Velcro straps (included with case) behind motherboard tray
- Excess cable slack should be tucked behind PSU shroud
- Keep cables neat - improves airflow and aesthetics

---

## Phase 4: Motherboard Installation in Case

### Step 4.1: Mount Motherboard

**This requires precision - take your time!**

1. **Prepare Motherboard**:
   - CPU, RAM, M.2 SSDs already installed from Phase 2
   - Carefully lift motherboard by edges (avoid touching components)

2. **Position Motherboard**:
   - Lower motherboard into case at angle
   - Align I/O ports with I/O shield opening
   - Gently press I/O ports through shield (may require firm pressure)
   - **Verify**: All I/O shield tabs are OUTSIDE ports (not blocking)

3. **Align Screw Holes**:
   - Lower motherboard flat onto standoffs
   - Align all screw holes (EEB boards have many!)
   - Verify motherboard is flush on all standoffs

4. **Install Screws**:
   - Start with 4 corner screws (finger-tight only)
   - Install remaining screws (usually 8-10 screws total for EEB)
   - **Tightening pattern**: Cross-pattern (like lug nuts on a wheel)
   - **Final torque**: Snug, but not overly tight
     - ✅ Correct: Motherboard firmly attached, no movement
     - ❌ Too tight: Motherboard PCB flexing, cracking risk

5. **Connect Power**:
   - **24-pin ATX**: Press firmly until latch clicks
   - **8-pin EPS ×2**: Press firmly until fully seated
   - Both should require moderate force to disconnect

6. **Connect Front Panel Connectors**:
   - Locate front panel header (bottom-right of motherboard)
   - Consult motherboard manual for pinout
   - Connect (small connectors, polarity usually matters):
     - **PWR_SW** (Power Switch): Usually 2-pin, no polarity
     - **PWR_LED** (Power LED): Usually 2-pin, has polarity (+/-)
     - **RST_SW** (Reset Switch): Usually 2-pin, no polarity
     - **HD_LED** (Hard Drive LED): Usually 2-pin, has polarity
     - **USB 3.0/3.1 headers**: Keyed connector, can only go one way
     - **HD_AUDIO** (Audio jack): Keyed connector

---

## Phase 5: GPU and Cooling Installation

### Step 5.1: Install GPU (RTX PRO 6000 Blackwell Max-Q)

1. **Remove PCIe Slot Covers**:
   - Rear of case: Remove 2× slot covers (for dual-slot GPU)
   - Save screws for securing GPU bracket later

2. **Prepare PCIe Slot**:
   - Locate PCIe slot 1 (top x16 slot)
   - Push down latch at end of slot to "unlock" position

3. **Install GPU**:
   - Align GPU connector with PCIe slot
   - **Ensure I/O bracket is outside case** (aligned with slot cover opening)
   - Press down firmly and evenly on both ends of GPU
   - You should hear/feel a CLICK when latch engages
   - Verify latch is in "locked" position

4. **Secure GPU Bracket**:
   - Use 2× screws to secure GPU I/O bracket to case
   - **Torque**: Snug, supports GPU weight

5. **Connect Power**:
   - **RTX PRO 6000 Max-Q**: Requires 1× 12VHPWR (16-pin) connector
   - Route cable from PSU through cable management
   - Press firmly until connector clicks
   - **Verify**: Cable is fully seated (no gaps)

6. **GPU Support** (optional but recommended):
   - Install GPU support bracket (if included with case)
   - OR use GPU sag bracket to prevent PCIe slot stress
   - Heavy GPUs can sag over time, causing damage

### Step 5.2: Install CPU Cooler (Noctua NH-U14S TR5-SP6)

**⚠️ Most challenging step - motherboard must be installed in case first!**

**Mounting System**: SecuFirm2 for sTR5 socket

1. **Verify Thermal Paste**:
   - Noctua includes NT-H1 thermal paste pre-applied OR in syringe
   - If pre-applied: Use as-is (don't wipe off!)
   - If NOT pre-applied: Apply small pea-sized dot in center of CPU IHS

2. **Install Backplate** (if not pre-installed on motherboard):
   - Access rear of motherboard (behind CPU area)
   - Align TR5-SP6 backplate with mounting holes around CPU socket
   - Secure with provided standoffs (from front side of motherboard)

3. **Attach Mounting Brackets**:
   - Place mounting brackets on front of motherboard (over CPU)
   - Align with backplate standoffs
   - Secure with spring-loaded screws (DO NOT fully tighten yet)

4. **Install Cooler**:
   - Remove fan from heatsink (for easier installation)
   - Lower heatsink onto CPU, aligning with mounting brackets
   - Secure heatsink to brackets using provided screws
   - **Tightening pattern**: Cross-pattern, gradually
     - Tighten each screw ¼ turn at a time
     - Alternate between screws (distribute pressure evenly)
     - Continue until all screws are snug (spring-loaded, so you'll feel resistance)
   - **DO NOT OVERTIGHTEN** - springs provide correct pressure

5. **Attach Fan**:
   - Slide fan onto heatsink using provided fan clips
   - Orient fan to exhaust toward rear of case
   - Connect fan PWM cable to CPU_FAN header on motherboard (near CPU socket)

6. **Cable Management**:
   - Route fan cable behind motherboard tray (if possible)
   - Use cable ties to secure excess cable

### Step 5.3: Install Case Fans (Optional - Improve Airflow)

**Stock Configuration**:
- Fractal Define 7 XL includes 3× 140mm fans (2× front, 1× rear)

**Recommended Upgrade** (for AI workstation with 300W GPU):

Add 3× additional 140mm PWM fans:
- **Top exhaust**: 2× 140mm (remove ModuVent panel for better airflow)
- **Front intake**: Add 1× 140mm (total 3× front intake)

**Installation**:
1. Mount fans using included screws
2. Orient fans:
   - **Intake** (front, bottom): Blowing INTO case
   - **Exhaust** (rear, top): Blowing OUT of case
3. Connect to:
   - **Motherboard fan headers**: Better PWM control
   - **Splitters**: If not enough headers (share header with 2 fans)
   - **Fan hub**: Case may include built-in hub

**Fan Curve Recommendation** (in BIOS later):
- Idle: 400 RPM (silent)
- 50°C: 600 RPM
- 70°C: 900 RPM
- 80°C+: 1,200 RPM (max)

---

## Phase 6: Final Assembly & Cable Management

### Step 6.1: Cable Management

**Goal**: Clean interior, optimal airflow

1. **Primary Power Cables** (already routed):
   - 24-pin ATX
   - 8-pin EPS ×2
   - 12VHPWR (GPU)

2. **Fan Cables**:
   - Route behind motherboard tray
   - Connect to motherboard fan headers:
     - **CPU_FAN**: CPU cooler (Noctua)
     - **CHA_FAN1-4**: Case fans
   - Use cable extensions if needed

3. **Front Panel USB/Audio**:
   - Already connected during Phase 4

4. **Organize Excess Cable**:
   - Use Velcro straps behind motherboard tray
   - Tuck excess in PSU shroud area
   - Avoid blocking airflow paths

5. **Double-Check All Connections**:
   - [ ] 24-pin ATX power
   - [ ] 2× 8-pin EPS CPU power
   - [ ] 12VHPWR GPU power
   - [ ] CPU fan (4-pin PWM)
   - [ ] Case fans (4-pin PWM or 3-pin DC)
   - [ ] Front panel connectors (power, reset, LEDs, USB, audio)
   - [ ] GPU firmly seated in PCIe slot
   - [ ] All RAM sticks fully seated

### Step 6.2: Pre-Boot Inspection

**Before powering on**:

1. **Visual Inspection**:
   - No loose screws inside case
   - No cables touching fans
   - All components firmly seated
   - No shipping plastic left on components

2. **Reseat Check** (press down firmly on each):
   - GPU in PCIe slot
   - All RAM sticks
   - All power connectors

3. **External Connections**:
   - DisplayPort/HDMI cable from monitor to GPU (NOT motherboard!)
   - Keyboard to USB port (rear I/O or front panel)
   - Mouse to USB port
   - Ethernet cable (if using wired)
   - PSU power cable to wall outlet
   - **PSU power switch**: Set to "I" (ON)

---

## Phase 7: First Boot

### Step 7.1: Power On

1. **Press power button** on case front panel
2. **Observe**:
   - ✅ Fans spin (GPU, CPU, case fans)
   - ✅ Motherboard LEDs illuminate
   - ✅ No beeps or error codes (check motherboard Q-LED or speaker)
   - ✅ Display signal detected

3. **Enter BIOS**:
   - Press **DEL** or **F2** repeatedly during boot
   - Should enter ASUS UEFI BIOS

### Step 7.2: BIOS Configuration

**Essential Settings**:

1. **Verify Hardware Detection**:
   - **CPU**: AMD Ryzen Threadripper PRO 9975WX, 32 cores
   - **RAM**: 192GB (or close, like 196GB) - DDR5
   - **Storage**: Both NVMe drives listed
   - **GPU**: NVIDIA RTX PRO 6000 Blackwell Max-Q

2. **Enable XMP/EXPO** (for DDR5-6400):
   - Navigate to: Ai Tweaker → Memory Frequency
   - Select: DDR5-6400 profile (EXPO or XMP)
   - Save

3. **Configure Boot Priority**:
   - Boot → Boot Option #1
   - Select: Samsung 990 Pro (2TB OS drive)

4. **Fan Curves** (optional, can configure in OS later):
   - Qfan Control → Enable
   - Set fan curves for CPU_FAN and CHA_FANs
   - Recommend: Silent profile for development, Performance for training

5. **Save & Exit**:
   - Save Changes and Reset

### Step 7.3: Verify Stability

1. **System should reboot**
2. **Check for**:
   - No boot errors
   - RAM running at DDR5-6400 (can verify in BIOS after reboot)
   - Smooth boot process

---

## Phase 8: Install Operating System

**See 05_SOFTWARE_SETUP.md for detailed Ubuntu 24.04 LTS installation guide.**

**Quick Steps**:

1. **Create Ubuntu 24.04 LTS bootable USB**:
   - Download from ubuntu.com/download
   - Use Rufus (Windows) or balenaEtcher (Mac/Linux) to create bootable USB

2. **Boot from USB**:
   - Insert USB into workstation
   - Restart
   - Press F8 (or DEL) during boot to enter boot menu
   - Select USB drive

3. **Install Ubuntu**:
   - Follow installation wizard
   - **Storage layout** (recommended):
     - **Samsung 990 Pro**:
       - 1GB EFI partition
       - 200GB root (/)
       - Remaining for /home
     - **Crucial T700**:
       - 2TB /data/datasets
       - 1.7TB /data/models

4. **Complete Installation**:
   - Set username, password
   - Install updates
   - Reboot

---

## Post-Assembly Checklist

After successful boot to Ubuntu:

- [ ] All fans operational (check in BIOS or with sensors)
- [ ] Temperatures normal (CPU <50°C idle, GPU <40°C idle)
- [ ] All RAM detected (192GB)
- [ ] Both NVMe drives detected
- [ ] GPU detected (run `nvidia-smi` after driver install)
- [ ] No unusual noises (coil whine, grinding fans)
- [ ] All USB ports functional (front and rear)
- [ ] Network connectivity working (if using Ethernet)

---

## Troubleshooting Common Issues

### System Won't POST (No Display)

**Symptoms**: Fans spin, no display signal

**Solutions**:
1. Verify GPU power cable connected (12VHPWR)
2. Verify display cable connected to **GPU** (not motherboard - no iGPU!)
3. Try different DisplayPort/HDMI cable or port on GPU
4. Reseat GPU in PCIe slot
5. Remove all RAM except 1 stick, try different slots
6. Clear CMOS (button on rear I/O)

### RAM Not Detected or Only Partial

**Symptoms**: BIOS shows less than 192GB

**Solutions**:
1. Reseat all RAM sticks (remove and reinstall firmly)
2. Verify RAM is in correct slots (consult manual)
3. Try booting with 1 stick at a time to identify faulty module
4. Update BIOS to latest version
5. Check RAM compatibility list on ASUS website

### CPU Overheating

**Symptoms**: CPU temps >90°C under load, thermal throttling

**Solutions**:
1. Verify CPU cooler is properly mounted (should have resistance when trying to wiggle)
2. Check thermal paste application (remove cooler, verify coverage)
3. Ensure CPU fan is spinning and connected to CPU_FAN header
4. Verify CPU fan curve in BIOS (should ramp up with temperature)
5. Check case airflow (all fans operational, intake/exhaust balanced)

### GPU Not Detected

**Symptoms**: nvidia-smi shows "No devices found"

**Solutions**:
1. Verify GPU power cable connected
2. Reseat GPU in PCIe slot
3. Check BIOS: Ensure PCIe slot is not disabled
4. Try GPU in different PCIe slot
5. Update motherboard BIOS
6. Install latest NVIDIA drivers (see Software Setup guide)

---

## What's Next?

**✅ Assembly Complete!**

**Next Steps**:

1. **Software Setup** (05_SOFTWARE_SETUP.md):
   - Install NVIDIA drivers
   - Install CUDA toolkit
   - Setup LLM frameworks (llama.cpp, vLLM)

2. **Performance Testing** (03_PERFORMANCE_BENCHMARKS.md):
   - Run baseline benchmarks
   - Verify cooling performance
   - Test Llama 70B inference

3. **Start Developing**!
   - Download models
   - Begin LLM experimentation
   - Enjoy your workstation!

---

**Assembly Guide Complete!**

**Estimated Total Time**: 3-4 hours for first-time build

For questions or issues, consult:
- Motherboard manual (most comprehensive resource)
- Component manufacturer support websites
- r/buildapc or r/ASUS communities

---

**Last Updated**: October 6, 2025
**Author**: Based on ASUS manual, Noctua instructions, a16z build documentation
