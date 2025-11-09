# ☁️ CLOUD DEPLOYMENT SPECIFICATIONS
## Sri Lakshmi Narasimha City Diagnostic Center

**Date:** 2025-11-08  
**Application:** LMS SLNCity V1  
**Stack:** React 19 + Node.js 18 + PostgreSQL 16

---

## 📊 MINIMUM REQUIREMENTS

### **Small Clinic (1-50 patients/day)**

#### **Server Specifications:**
- **CPU:** 2 vCPUs (2 cores)
- **RAM:** 4 GB
- **Storage:** 40 GB SSD
- **Bandwidth:** 1 TB/month
- **OS:** Ubuntu 22.04 LTS

#### **Cost Estimate:**
- **AWS EC2:** t3.medium (~$30-35/month)
- **DigitalOcean:** Basic Droplet (~$24/month)
- **Linode:** Shared 4GB (~$24/month)
- **Hetzner:** CX21 (~€5.83/month = ~$6.50/month) ⭐ **BEST VALUE**

#### **Resource Breakdown:**
```
PostgreSQL:     1 GB RAM, 1 vCPU, 20 GB storage
Backend:        1 GB RAM, 0.5 vCPU
Frontend:       0.5 GB RAM, 0.25 vCPU
Nginx:          0.25 GB RAM, 0.25 vCPU
OS + Buffer:    1.25 GB RAM
```

---

## 🚀 RECOMMENDED REQUIREMENTS

### **Medium Clinic (50-200 patients/day)**

#### **Server Specifications:**
- **CPU:** 4 vCPUs (4 cores)
- **RAM:** 8 GB
- **Storage:** 80 GB SSD
- **Bandwidth:** 2 TB/month
- **OS:** Ubuntu 22.04 LTS

#### **Cost Estimate:**
- **AWS EC2:** t3.large (~$60-70/month)
- **DigitalOcean:** 8GB Droplet (~$48/month)
- **Linode:** Dedicated 8GB (~$48/month)
- **Hetzner:** CX31 (~€11.66/month = ~$13/month) ⭐ **BEST VALUE**

#### **Resource Breakdown:**
```
PostgreSQL:     2 GB RAM, 2 vCPU, 40 GB storage
Backend:        2 GB RAM, 1 vCPU
Frontend:       1 GB RAM, 0.5 vCPU
Nginx:          0.5 GB RAM, 0.5 vCPU
OS + Buffer:    2.5 GB RAM
```

---

## 💪 PRODUCTION REQUIREMENTS

### **Large Clinic (200-500 patients/day)**

#### **Server Specifications:**
- **CPU:** 8 vCPUs (8 cores)
- **RAM:** 16 GB
- **Storage:** 160 GB SSD
- **Bandwidth:** 4 TB/month
- **OS:** Ubuntu 22.04 LTS

#### **Cost Estimate:**
- **AWS EC2:** t3.xlarge (~$120-140/month)
- **DigitalOcean:** 16GB Droplet (~$96/month)
- **Linode:** Dedicated 16GB (~$96/month)
- **Hetzner:** CX41 (~€23.32/month = ~$26/month) ⭐ **BEST VALUE**

#### **Resource Breakdown:**
```
PostgreSQL:     4 GB RAM, 4 vCPU, 80 GB storage
Backend:        4 GB RAM, 2 vCPU
Frontend:       2 GB RAM, 1 vCPU
Nginx:          1 GB RAM, 1 vCPU
OS + Buffer:    5 GB RAM
```

---

## 🏢 ENTERPRISE REQUIREMENTS

### **Multi-Branch / High Volume (500+ patients/day)**

#### **Server Specifications:**
- **CPU:** 16 vCPUs (16 cores)
- **RAM:** 32 GB
- **Storage:** 320 GB SSD
- **Bandwidth:** 8 TB/month
- **OS:** Ubuntu 22.04 LTS

#### **Cost Estimate:**
- **AWS EC2:** t3.2xlarge (~$240-280/month)
- **DigitalOcean:** 32GB Droplet (~$192/month)
- **Linode:** Dedicated 32GB (~$192/month)
- **Hetzner:** CX51 (~€46.64/month = ~$52/month) ⭐ **BEST VALUE**

#### **Resource Breakdown:**
```
PostgreSQL:     8 GB RAM, 8 vCPU, 160 GB storage
Backend:        8 GB RAM, 4 vCPU
Frontend:       4 GB RAM, 2 vCPU
Nginx:          2 GB RAM, 2 vCPU
OS + Buffer:    10 GB RAM
```

---

## 💾 STORAGE REQUIREMENTS

### **Database Growth Estimation:**

#### **Per Patient Record:**
- Patient data: ~2 KB
- Visit data: ~1 KB
- Test results: ~5-10 KB (standard) / ~50-100 KB (culture with images)
- **Average per visit:** ~10-15 KB

#### **Annual Storage (Medium Clinic - 100 patients/day):**
```
100 patients/day × 365 days = 36,500 visits/year
36,500 visits × 15 KB = 547.5 MB/year

With audit logs, backups, and overhead:
~2-3 GB/year
```

#### **5-Year Storage Projection:**
- **Small Clinic:** 5-10 GB
- **Medium Clinic:** 10-20 GB
- **Large Clinic:** 20-40 GB
- **Enterprise:** 40-100 GB

#### **Recommended Storage:**
- **Minimum:** 40 GB SSD (allows 10+ years of data)
- **Recommended:** 80 GB SSD (comfortable buffer)
- **Production:** 160 GB SSD (multi-branch or high volume)

---

## 🌐 BANDWIDTH REQUIREMENTS

### **Per Visit:**
- Patient registration: ~50 KB
- Test report generation: ~200-500 KB
- PDF download: ~200-500 KB
- **Average per visit:** ~1 MB

### **Monthly Bandwidth (Medium Clinic - 100 patients/day):**
```
100 patients/day × 30 days = 3,000 visits/month
3,000 visits × 1 MB = 3 GB/month

With overhead, API calls, and staff usage:
~10-20 GB/month
```

### **Recommended Bandwidth:**
- **Small Clinic:** 500 GB - 1 TB/month
- **Medium Clinic:** 1-2 TB/month
- **Large Clinic:** 2-4 TB/month
- **Enterprise:** 4-8 TB/month

---

## 🔧 COMPONENT RESOURCE USAGE

### **PostgreSQL Database:**
- **Idle:** 100-200 MB RAM
- **Active (10 connections):** 500 MB - 1 GB RAM
- **Active (50 connections):** 1-2 GB RAM
- **Active (100 connections):** 2-4 GB RAM
- **CPU:** 0.5-2 vCPU (depends on query complexity)

### **Node.js Backend:**
- **Idle:** 50-100 MB RAM
- **Active (10 requests/sec):** 200-500 MB RAM
- **Active (50 requests/sec):** 500 MB - 1 GB RAM
- **Max Memory Restart:** 500 MB (configured in PM2)
- **CPU:** 0.5-2 vCPU (depends on load)

### **React Frontend (Nginx):**
- **Nginx:** 10-50 MB RAM
- **Static files:** 20-50 MB storage
- **CPU:** 0.1-0.5 vCPU (minimal)

### **Operating System:**
- **Ubuntu 22.04:** 500 MB - 1 GB RAM
- **System processes:** 200-500 MB RAM
- **Buffer/Cache:** 500 MB - 2 GB RAM

---

## 🏆 RECOMMENDED CLOUD PROVIDERS

### **1. Hetzner Cloud (Germany) ⭐ BEST VALUE**
**Why:** Excellent price-to-performance ratio, reliable, EU data center

| Plan | vCPU | RAM | Storage | Price/Month |
|------|------|-----|---------|-------------|
| CX21 | 2 | 4 GB | 40 GB | €5.83 (~$6.50) |
| CX31 | 2 | 8 GB | 80 GB | €11.66 (~$13) |
| CX41 | 4 | 16 GB | 160 GB | €23.32 (~$26) |
| CX51 | 8 | 32 GB | 320 GB | €46.64 (~$52) |

**Pros:**
- ✅ Cheapest option
- ✅ Excellent performance
- ✅ 20 TB bandwidth included
- ✅ Reliable infrastructure

**Cons:**
- ⚠️ EU-based (may have higher latency for India)
- ⚠️ Less popular than AWS/Azure

---

### **2. DigitalOcean (USA/India) 🌟 GOOD BALANCE**
**Why:** Easy to use, good documentation, India data centers

| Plan | vCPU | RAM | Storage | Price/Month |
|------|------|-----|---------|-------------|
| Basic | 2 | 4 GB | 80 GB | $24 |
| Basic | 2 | 8 GB | 160 GB | $48 |
| Basic | 4 | 16 GB | 320 GB | $96 |
| Basic | 8 | 32 GB | 640 GB | $192 |

**Pros:**
- ✅ India data centers (Bangalore)
- ✅ Easy to use
- ✅ Good documentation
- ✅ Managed databases available

**Cons:**
- ⚠️ More expensive than Hetzner
- ⚠️ Bandwidth limits (4-8 TB)

---

### **3. AWS EC2 (Global) 🏢 ENTERPRISE**
**Why:** Most popular, highly scalable, many services

| Plan | vCPU | RAM | Storage | Price/Month |
|------|------|-----|---------|-------------|
| t3.medium | 2 | 4 GB | 40 GB | ~$35 |
| t3.large | 2 | 8 GB | 80 GB | ~$70 |
| t3.xlarge | 4 | 16 GB | 160 GB | ~$140 |
| t3.2xlarge | 8 | 32 GB | 320 GB | ~$280 |

**Pros:**
- ✅ Most popular
- ✅ Highly scalable
- ✅ Many additional services
- ✅ India data centers (Mumbai)

**Cons:**
- ⚠️ Most expensive
- ⚠️ Complex pricing
- ⚠️ Steep learning curve

---

### **4. Linode (USA/India) 💼 RELIABLE**
**Why:** Good balance of price and features, India data center

| Plan | vCPU | RAM | Storage | Price/Month |
|------|------|-----|---------|-------------|
| Shared 4GB | 2 | 4 GB | 80 GB | $24 |
| Dedicated 8GB | 4 | 8 GB | 160 GB | $48 |
| Dedicated 16GB | 8 | 16 GB | 320 GB | $96 |
| Dedicated 32GB | 16 | 32 GB | 640 GB | $192 |

**Pros:**
- ✅ India data center (Mumbai)
- ✅ Good performance
- ✅ Simple pricing
- ✅ Good support

**Cons:**
- ⚠️ Less popular than AWS/DigitalOcean
- ⚠️ Fewer additional services

---

## 🎯 RECOMMENDATION BY USE CASE

### **Starting Out (Testing/Pilot):**
- **Provider:** Hetzner CX21 or DigitalOcean Basic 4GB
- **Cost:** $6-24/month
- **Specs:** 2 vCPU, 4 GB RAM, 40-80 GB SSD
- **Suitable for:** 1-50 patients/day

### **Small to Medium Clinic:**
- **Provider:** Hetzner CX31 or DigitalOcean Basic 8GB
- **Cost:** $13-48/month
- **Specs:** 2-4 vCPU, 8 GB RAM, 80-160 GB SSD
- **Suitable for:** 50-200 patients/day

### **Large Clinic:**
- **Provider:** Hetzner CX41 or DigitalOcean Basic 16GB
- **Cost:** $26-96/month
- **Specs:** 4-8 vCPU, 16 GB RAM, 160-320 GB SSD
- **Suitable for:** 200-500 patients/day

### **Enterprise / Multi-Branch:**
- **Provider:** AWS EC2 or DigitalOcean 32GB
- **Cost:** $192-280/month
- **Specs:** 8-16 vCPU, 32 GB RAM, 320-640 GB SSD
- **Suitable for:** 500+ patients/day, multiple branches

---

## 📋 ADDITIONAL COSTS

### **Domain Name:**
- **.com/.in domain:** $10-15/year
- **DNS management:** Free (Cloudflare) or $5/month

### **SSL Certificate:**
- **Let's Encrypt:** Free ✅
- **Paid SSL:** $50-200/year (not needed)

### **Backup Storage:**
- **Daily backups:** 5-10 GB
- **Monthly cost:** $1-5/month (S3, Spaces, etc.)

### **Monitoring:**
- **Basic monitoring:** Free (built-in)
- **Advanced monitoring:** $10-50/month (optional)

### **Total Monthly Cost:**
- **Small Clinic:** $10-30/month
- **Medium Clinic:** $20-60/month
- **Large Clinic:** $40-120/month
- **Enterprise:** $200-350/month

---

## ✅ FINAL RECOMMENDATION

### **For Sri Lakshmi Narasimha City Diagnostic Center:**

**Recommended Setup:**
- **Provider:** Hetzner CX31 or DigitalOcean 8GB (Bangalore)
- **Specs:** 2-4 vCPU, 8 GB RAM, 80 GB SSD
- **Cost:** $13-48/month
- **Bandwidth:** 2 TB/month (more than enough)

**Why This Setup:**
1. ✅ Handles 50-200 patients/day comfortably
2. ✅ Room for growth (can upgrade easily)
3. ✅ Affordable for small business
4. ✅ Reliable and fast
5. ✅ Low latency (India data center for DigitalOcean)

**Upgrade Path:**
- Start with 8GB plan
- Monitor usage for 1-2 months
- Upgrade to 16GB if needed (takes 5 minutes)
- Scale horizontally if multi-branch

---

**Prepared By:** LMS SLNCity Development Team  
**Date:** 2025-11-08  
**Version:** 1.0

