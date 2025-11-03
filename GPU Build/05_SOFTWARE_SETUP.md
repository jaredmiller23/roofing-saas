# Software Setup Guide - Ubuntu 24.04 LTS for LLM Development

**Document Version**: 1.0
**Date**: October 6, 2025
**OS**: Ubuntu 24.04 LTS (Noble Numbat)
**Target**: RTX PRO 6000 Blackwell + Threadripper PRO 9975WX

---

## Table of Contents

1. [Ubuntu Installation](#ubuntu-installation)
2. [NVIDIA Driver Installation](#nvidia-driver-installation)
3. [CUDA Toolkit Setup](#cuda-toolkit-setup)
4. [Python Environment](#python-environment)
5. [LLM Frameworks Installation](#llm-frameworks-installation)
6. [System Monitoring Tools](#system-monitoring-tools)
7. [Performance Optimization](#performance-optimization)

---

## Ubuntu Installation

### Download Ubuntu 24.04 LTS

1. Visit: https://ubuntu.com/download/desktop
2. Download: Ubuntu 24.04.1 LTS (64-bit)
3. Verify checksum (optional but recommended)

### Create Bootable USB

**On Windows**:
```bash
# Download Rufus from rufus.ie
# Select Ubuntu ISO
# Select USB drive
# Click Start
```

**On macOS/Linux**:
```bash
# Using balenaEtcher (etcher.io)
# Or use dd command (advanced users)
sudo dd if=ubuntu-24.04.1-desktop-amd64.iso of=/dev/sdX bs=4M status=progress
```

### Installation Process

1. **Boot from USB**:
   - Restart workstation
   - Press F8 or DEL during boot
   - Select USB drive from boot menu

2. **Choose Installation Type**:
   - Select "Install Ubuntu"
   - Choose language (English recommended for LLM development)

3. **Keyboard Layout**: Select your keyboard layout

4. **Updates and Software**:
   - ✅ Normal installation
   - ✅ Download updates while installing
   - ✅ Install third-party software (important for NVIDIA drivers later)

5. **Installation Type**: Manual partitioning recommended

### Recommended Partition Scheme

**Samsung 990 Pro 2TB (OS Drive)**:

| Partition | Size | Mount Point | File System | Flags |
|-----------|------|-------------|-------------|-------|
| EFI | 1GB | /boot/efi | FAT32 | boot, esp |
| Root | 200GB | / | ext4 | - |
| Home | ~1,661GB | /home | ext4 | - |

**Crucial T700 4TB (Data Drive)**:

| Partition | Size | Mount Point | File System |
|-----------|------|-------------|-------------|
| Datasets | 2TB | /data/datasets | ext4 |
| Models | ~1.7TB | /data/models | ext4 |

**Partition Commands** (during installation, use "Something else" option):

```bash
# Samsung 990 Pro
# /dev/nvme0n1p1: 1GB, EFI
# /dev/nvme0n1p2: 200GB, ext4, mount /
# /dev/nvme0n1p3: remaining, ext4, mount /home

# Crucial T700
# /dev/nvme1n1p1: 2000GB, ext4, mount /data/datasets
# /dev/nvme1n1p2: remaining, ext4, mount /data/models
```

6. **User Setup**:
   - Create username (lowercase recommended)
   - Set strong password
   - Choose "Require password to log in" (for security)

7. **Complete Installation**:
   - Wait for installation (10-20 minutes)
   - Remove USB when prompted
   - Reboot

---

## Post-Installation System Updates

### Update System

```bash
# Update package list
sudo apt update

# Upgrade all packages
sudo apt upgrade -y

# Install essential build tools
sudo apt install -y \
    build-essential \
    git \
    curl \
    wget \
    vim \
    htop \
    net-tools \
    openssh-server
```

### Install System Monitoring Tools

```bash
# Install sensors for hardware monitoring
sudo apt install -y lm-sensors
sudo sensors-detect --auto

# Test sensors
sensors
```

---

## NVIDIA Driver Installation

### Method 1: Using Ubuntu Drivers (Recommended)

```bash
# List available NVIDIA drivers
ubuntu-drivers list

# Install recommended driver (should be 565+ for Blackwell)
sudo ubuntu-drivers install

# OR manually specify driver version
sudo apt install -y nvidia-driver-565

# Reboot to load driver
sudo reboot
```

### Method 2: NVIDIA Official Driver (Latest)

```bash
# Add NVIDIA PPA
sudo add-apt-repository ppa:graphics-drivers/ppa -y
sudo apt update

# Install latest driver
sudo apt install -y nvidia-driver-565

# Reboot
sudo reboot
```

### Verify Driver Installation

```bash
# Check NVIDIA driver
nvidia-smi

# Expected output:
# +-----------------------------------------------------------------------------------------+
# | NVIDIA-SMI 565.XX.XX              Driver Version: 565.XX.XX      CUDA Version: 12.9     |
# |---------|-------------------------|-------------------------|----------------------------+
# | GPU  Name                 TCC/WDDM | Bus-Id          Disp.A |  Volatile Uncorr. ECC |
# | Fan  Temp   Perf          Pwr:Usage/Cap |           Memory-Usage | GPU-Util  Compute M. |
# |=========+=================+==================+=====================+================|
# |   0  NVIDIA RTX PRO 6000 ...  Off | 00000000:01:00.0  On  |                   Off |
# |  30%   32C    P8             30W / 300W |   1024MiB / 98304MiB |      0%      Default |
# +-----------------------------------------------------------------------------------------+
```

**Verify**:
- ✅ Driver version 565.XX or higher
- ✅ CUDA Version 12.6+ reported
- ✅ GPU detected as "NVIDIA RTX PRO 6000"
- ✅ 96GB VRAM shown (~98,304 MiB)

---

## CUDA Toolkit Setup

### Check Compatible CUDA Version

```bash
# Your driver (565+) supports CUDA 12.6-12.9
nvidia-smi | grep "CUDA Version"
```

### Install CUDA 12.6

**Method 1: Ubuntu Package** (Recommended):

```bash
# Install CUDA toolkit from Ubuntu repos
sudo apt install -y nvidia-cuda-toolkit

# Verify installation
nvcc --version
```

**Method 2: NVIDIA Official CUDA** (Latest):

```bash
# Download CUDA 12.6+ from NVIDIA
wget https://developer.download.nvidia.com/compute/cuda/12.6.0/local_installers/cuda_12.6.0_565.xx_linux.run

# Run installer
sudo sh cuda_12.6.0_565.xx_linux.run

# Follow prompts:
# - Accept license
# - DESELECT "Install NVIDIA Driver" (already installed)
# - SELECT "Install CUDA Toolkit"
# - Install to /usr/local/cuda-12.6
```

### Configure Environment Variables

```bash
# Edit .bashrc
nano ~/.bashrc

# Add to end of file:
export PATH=/usr/local/cuda-12.6/bin:$PATH
export LD_LIBRARY_PATH=/usr/local/cuda-12.6/lib64:$LD_LIBRARY_PATH

# Save and exit (Ctrl+O, Enter, Ctrl+X)

# Reload bashrc
source ~/.bashrc
```

### Verify CUDA Installation

```bash
# Check nvcc (CUDA compiler)
nvcc --version

# Expected output:
# nvcc: NVIDIA (R) Cuda compiler driver
# Cuda compilation tools, release 12.6, V12.6.XXX

# Compile sample program (optional)
cd /usr/local/cuda-12.6/samples/1_Utilities/deviceQuery
sudo make
./deviceQuery

# Should output GPU details and "Result = PASS"
```

---

## Python Environment

### Install Python 3.12

```bash
# Ubuntu 24.04 ships with Python 3.12
python3 --version

# Should show: Python 3.12.x

# Install pip and venv
sudo apt install -y python3-pip python3-venv
```

### Create Virtual Environment for LLM Work

```bash
# Create venv in home directory
cd ~
python3 -m venv llm-env

# Activate environment
source llm-env/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install essential packages
pip install \
    numpy \
    pandas \
    matplotlib \
    jupyter \
    ipython
```

**Add to .bashrc** for easy activation:

```bash
nano ~/.bashrc

# Add alias
alias llm='source ~/llm-env/bin/activate'

# Reload
source ~/.bashrc

# Now you can activate with:
llm
```

### Install PyTorch with CUDA Support

```bash
# Activate environment
llm

# Install PyTorch with CUDA 12.6 support
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu126

# Verify PyTorch CUDA
python3 -c "import torch; print(f'PyTorch version: {torch.__version__}'); print(f'CUDA available: {torch.cuda.is_available()}'); print(f'CUDA version: {torch.version.cuda}'); print(f'GPU: {torch.cuda.get_device_name(0)}')"

# Expected output:
# PyTorch version: 2.5.0+cu126
# CUDA available: True
# CUDA version: 12.6
# GPU: NVIDIA RTX PRO 6000 Blackwell Max-Q Workstation Edition
```

---

## LLM Frameworks Installation

### 1. llama.cpp (CPU/GPU Inference)

**Build from Source with CUDA**:

```bash
# Install dependencies
sudo apt install -y cmake

# Clone repo
cd ~
git clone https://github.com/ggml-org/llama.cpp
cd llama.cpp

# Build with CUDA support
cmake -B build -DGGML_CUDA=ON
cmake --build build --config Release -j $(nproc)

# Test build
./build/bin/llama-cli --version
```

**Download Models**:

```bash
# Create models directory
mkdir -p /data/models/llama.cpp
cd /data/models/llama.cpp

# Download Llama 3.1 8B Q8 (example)
wget https://huggingface.co/TheBloke/Llama-3.1-8B-GGUF/resolve/main/llama-3.1-8b.Q8_0.gguf

# Or use huggingface-cli for larger models
pip install huggingface-hub

# Example: Download Llama 70B Q8
huggingface-cli download TheBloke/Llama-3.1-70B-GGUF llama-3.1-70b.Q8_0.gguf --local-dir /data/models/llama.cpp
```

**Test Inference**:

```bash
cd ~/llama.cpp

# Run inference (adjust paths)
./build/bin/llama-cli \
    -m /data/models/llama.cpp/llama-3.1-8b.Q8_0.gguf \
    -p "Explain quantum computing in simple terms:" \
    -n 256 \
    -ngl 99  # Offload all layers to GPU

# Should see GPU utilization in nvidia-smi during inference
```

### 2. vLLM (Production Inference)

```bash
# Activate Python environment
llm

# Install vLLM
pip install vllm

# Verify installation
python3 -c "import vllm; print(vllm.__version__)"
```

**Test vLLM**:

```python
# test_vllm.py
from vllm import LLM, SamplingParams

# Initialize LLM (downloads model from HuggingFace)
llm = LLM(model="meta-llama/Llama-3.1-8B")

# Create sampling parameters
sampling_params = SamplingParams(temperature=0.7, top_p=0.9, max_tokens=256)

# Generate
prompts = ["Explain quantum computing:"]
outputs = llm.generate(prompts, sampling_params)

# Print output
for output in outputs:
    print(output.outputs[0].text)
```

Run:
```bash
python3 test_vllm.py
```

### 3. Hugging Face Transformers

```bash
llm

# Install transformers and dependencies
pip install transformers accelerate bitsandbytes

# Test installation
python3 -c "from transformers import AutoTokenizer, AutoModelForCausalLM; print('Transformers installed successfully')"
```

**Example Inference Script**:

```python
# test_hf.py
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

model_name = "meta-llama/Llama-3.1-8B"

# Load tokenizer and model
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.float16,
    device_map="auto"  # Automatically use GPU
)

# Inference
prompt = "Explain quantum computing:"
inputs = tokenizer(prompt, return_tensors="pt").to("cuda")

outputs = model.generate(**inputs, max_new_tokens=256)
print(tokenizer.decode(outputs[0], skip_special_tokens=True))
```

### 4. Ollama (Easy LLM Management)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Verify installation
ollama --version

# Pull a model (e.g., Llama 3.1 8B)
ollama pull llama3.1:8b

# Run inference
ollama run llama3.1:8b "Explain quantum computing"

# List installed models
ollama list
```

---

## System Monitoring Tools

### 1. GPU Monitoring

**nvidia-smi with watch**:

```bash
# Real-time GPU monitoring (updates every 1 second)
watch -n 1 nvidia-smi
```

**nvitop** (Better TUI):

```bash
pip install nvitop

# Run nvitop
nvitop
```

### 2. CPU Monitoring

**htop**:

```bash
# Already installed, just run:
htop
```

**Sensors** (Temperature):

```bash
# Monitor CPU/motherboard temperatures
watch -n 2 sensors
```

### 3. Disk I/O

**iotop**:

```bash
sudo apt install -y iotop

# Monitor disk I/O (requires sudo)
sudo iotop
```

### 4. Network Monitoring

**nethogs**:

```bash
sudo apt install -y nethogs

# Monitor per-process network usage
sudo nethogs
```

### 5. All-in-One: btop

```bash
# Install btop (better than htop)
sudo apt install -y btop

# Run btop
btop
```

---

## Performance Optimization

### 1. CPU Performance Scaling

```bash
# Check current governor
cat /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Set to "performance" mode (for sustained workloads)
echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Make persistent (create systemd service)
sudo nano /etc/systemd/system/cpu-performance.service

# Add:
[Unit]
Description=Set CPU governor to performance

[Service]
Type=oneshot
ExecStart=/bin/bash -c 'echo performance | tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor'

[Install]
WantedBy=multi-user.target

# Enable service
sudo systemctl enable cpu-performance.service
sudo systemctl start cpu-performance.service
```

### 2. GPU Persistence Mode

```bash
# Enable GPU persistence (reduces latency)
sudo nvidia-smi -pm 1

# Verify
nvidia-smi -q | grep "Persistence Mode"

# Make persistent (create systemd service)
sudo nano /etc/systemd/system/nvidia-persistenced.service

# Add:
[Unit]
Description=NVIDIA Persistence Daemon
Wants=syslog.target

[Service]
Type=forking
ExecStart=/usr/bin/nvidia-persistenced --user nvidia-persistenced
ExecStopPost=/bin/rm -rf /var/run/nvidia-persistenced

[Install]
WantedBy=multi-user.target

# Enable
sudo systemctl enable nvidia-persistenced.service
sudo systemctl start nvidia-persistenced.service
```

### 3. Increase File Limits (for large models)

```bash
# Edit limits.conf
sudo nano /etc/security/limits.conf

# Add:
* soft nofile 1048576
* hard nofile 1048576

# Save and reboot
sudo reboot
```

### 4. Swap Configuration

```bash
# Check current swap
free -h

# Ubuntu 24.04 uses a swapfile
# Recommend: Reduce swappiness for performance
sudo nano /etc/sysctl.conf

# Add:
vm.swappiness=10

# Apply immediately
sudo sysctl -p
```

---

## Recommended Directory Structure

```bash
/data/
├── datasets/          # Training datasets
│   ├── raw/
│   ├── processed/
│   └── temp/
└── models/            # Model checkpoints and weights
    ├── base/          # Base models (Llama, Mistral, etc.)
    ├── fine-tuned/    # Your fine-tuned models
    ├── checkpoints/   # Training checkpoints
    └── llama.cpp/     # GGUF models for llama.cpp

/home/username/
├── llm-env/           # Python virtual environment
├── projects/          # Your code
└── notebooks/         # Jupyter notebooks
```

Create structure:

```bash
sudo mkdir -p /data/datasets/{raw,processed,temp}
sudo mkdir -p /data/models/{base,fine-tuned,checkpoints,llama.cpp}
sudo chown -R $USER:$USER /data
```

---

## Verification Checklist

After completing setup, verify:

```bash
# 1. NVIDIA Driver
nvidia-smi  # Should show RTX PRO 6000, 96GB VRAM, driver 565+

# 2. CUDA Toolkit
nvcc --version  # Should show CUDA 12.6+

# 3. PyTorch CUDA
python3 -c "import torch; print(torch.cuda.is_available())"  # Should print True

# 4. llama.cpp
~/llama.cpp/build/bin/llama-cli --version  # Should show version

# 5. Disk mounts
df -h  # Verify /data/datasets and /data/models mounted

# 6. CPU Performance
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor  # Should show "performance"

# 7. GPU Persistence
nvidia-smi -q | grep "Persistence Mode"  # Should show "Enabled"
```

---

## Next Steps

**✅ Software Setup Complete!**

**Ready for**:
1. Download LLM models (Llama 70B, etc.)
2. Run benchmarks (see 03_PERFORMANCE_BENCHMARKS.md)
3. Start fine-tuning experiments
4. Deploy inference servers

---

**Last Updated**: October 6, 2025
**Ubuntu Version**: 24.04 LTS (Noble Numbat)
**References**: NVIDIA CUDA Docs, Ubuntu Documentation, llama.cpp GitHub
