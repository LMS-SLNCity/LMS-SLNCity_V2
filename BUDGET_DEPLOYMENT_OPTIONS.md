# 💰 BUDGET-FRIENDLY DEPLOYMENT OPTIONS
## Sri Lakshmi Narasimha City Diagnostic Center

**Date:** 2025-11-08  
**Goal:** Deploy LMS with minimal cost in first year  
**Budget:** $0-10/month

---

## 🆓 OPTION 1: COMPLETELY FREE (Recommended for Year 1)

### **Oracle Cloud Free Tier** ⭐ **BEST FREE OPTION**

**What You Get (FOREVER FREE):**
- **CPU:** 4 ARM vCPUs (Ampere A1)
- **RAM:** 24 GB
- **Storage:** 200 GB
- **Bandwidth:** 10 TB/month
- **Cost:** $0/month FOREVER

**Why This is Amazing:**
- ✅ More powerful than $50/month paid servers
- ✅ No credit card required after trial
- ✅ Never expires (not a trial)
- ✅ Can run 500+ patients/day easily

**Setup Steps:**
1. Sign up at https://www.oracle.com/cloud/free/
2. Create VM.Standard.A1.Flex instance
3. Choose: 4 OCPUs, 24 GB RAM, 200 GB storage
4. Deploy your application

**Limitations:**
- ⚠️ ARM architecture (not x86) - but Node.js works fine
- ⚠️ Account may be terminated if inactive for 90 days
- ⚠️ Limited to 1 region (choose Mumbai for India)

---

## 🆓 OPTION 2: FREE FOR 12 MONTHS

### **AWS Free Tier** (First Year Only)

**What You Get (12 months):**
- **CPU:** 2 vCPUs (t2.micro or t3.micro)
- **RAM:** 1 GB
- **Storage:** 30 GB
- **Bandwidth:** 15 GB/month outbound
- **Cost:** $0/month for 12 months, then ~$10-15/month

**Suitable For:**
- ✅ 10-30 patients/day
- ✅ Testing and pilot phase
- ✅ Learning cloud deployment

**Limitations:**
- ⚠️ Only 1 GB RAM (tight for PostgreSQL + Backend)
- ⚠️ Only 15 GB bandwidth/month (may not be enough)
- ⚠️ Costs money after 12 months

---

### **Google Cloud Free Tier** (First Year Only)

**What You Get (12 months):**
- **CPU:** 2 vCPUs (e2-micro)
- **RAM:** 1 GB
- **Storage:** 30 GB
- **Bandwidth:** 1 GB/day outbound
- **Cost:** $0/month for 12 months + $300 credit

**Suitable For:**
- ✅ 10-30 patients/day
- ✅ Testing and pilot phase
- ✅ $300 credit can last 6-12 months

**Limitations:**
- ⚠️ Only 1 GB RAM
- ⚠️ Costs money after credits expire

---

### **Azure Free Tier** (First Year Only)

**What You Get (12 months):**
- **CPU:** 2 vCPUs (B1S)
- **RAM:** 1 GB
- **Storage:** 64 GB
- **Bandwidth:** 15 GB/month outbound
- **Cost:** $0/month for 12 months + $200 credit

**Suitable For:**
- ✅ 10-30 patients/day
- ✅ Testing and pilot phase

**Limitations:**
- ⚠️ Only 1 GB RAM
- ⚠️ Costs money after 12 months

---

## 💵 OPTION 3: ULTRA-CHEAP PAID OPTIONS

### **Hetzner Cloud CX11** (Germany)

**Specs:**
- **CPU:** 1 vCPU
- **RAM:** 2 GB
- **Storage:** 20 GB SSD
- **Bandwidth:** 20 TB/month
- **Cost:** €3.79/month (~$4.20/month)

**Suitable For:**
- ✅ 20-50 patients/day
- ✅ Very affordable
- ✅ Reliable

**Limitations:**
- ⚠️ EU-based (higher latency for India)
- ⚠️ Only 2 GB RAM (tight but workable)

---

### **Contabo VPS S** (Germany/USA/Singapore)

**Specs:**
- **CPU:** 4 vCPUs
- **RAM:** 8 GB
- **Storage:** 200 GB SSD
- **Bandwidth:** 32 TB/month
- **Cost:** €4.99/month (~$5.50/month)

**Suitable For:**
- ✅ 50-200 patients/day
- ✅ Excellent value
- ✅ Singapore data center available

**Limitations:**
- ⚠️ Less popular provider
- ⚠️ Support not as good as DigitalOcean

---

### **Vultr High Frequency** (India - Mumbai)

**Specs:**
- **CPU:** 1 vCPU
- **RAM:** 2 GB
- **Storage:** 50 GB SSD
- **Bandwidth:** 2 TB/month
- **Cost:** $6/month

**Suitable For:**
- ✅ 20-50 patients/day
- ✅ India data center (low latency)
- ✅ Good performance

---

## 🏠 OPTION 4: ON-PREMISE (Your Own Hardware)

### **Use Your Existing Computer/Laptop**

**Requirements:**
- Any computer with 4 GB RAM
- Windows 10/11 or Ubuntu
- Stable internet connection
- Static IP or Dynamic DNS (free)

**Cost:**
- **Hardware:** $0 (use existing)
- **Electricity:** ~₹200-500/month (~$2.50-6/month)
- **Internet:** Already paying
- **Total:** ~$3-6/month

**Pros:**
- ✅ Cheapest option
- ✅ Full control
- ✅ No monthly cloud bills
- ✅ Data stays with you

**Cons:**
- ⚠️ Computer must run 24/7
- ⚠️ You handle backups
- ⚠️ Power outages affect service
- ⚠️ Need to configure router/firewall

**Setup:**
- Use the Windows deployment scripts we created
- Configure port forwarding on router
- Use free Dynamic DNS (No-IP, DuckDNS)
- Use free SSL (Let's Encrypt)

---

## 🏠 OPTION 5: RASPBERRY PI (Ultra Low Power)

### **Raspberry Pi 4 (8GB)**

**Hardware Cost:**
- Raspberry Pi 4 (8GB): ₹8,000 (~$100) one-time
- Power supply: ₹500 (~$6)
- MicroSD card (128GB): ₹1,000 (~$12)
- Case: ₹300 (~$4)
- **Total:** ₹9,800 (~$122) one-time

**Monthly Cost:**
- Electricity: ~₹50-100/month (~$0.60-1.20/month)
- Internet: Already paying
- **Total:** ~$1/month

**Specs:**
- **CPU:** 4 cores (ARM)
- **RAM:** 8 GB
- **Storage:** 128 GB (expandable)
- **Power:** 5W (very low)

**Suitable For:**
- ✅ 50-100 patients/day
- ✅ Very low power consumption
- ✅ Silent operation
- ✅ Compact size

**Pros:**
- ✅ One-time cost, then almost free
- ✅ Very low power consumption
- ✅ Can run 24/7 without issues
- ✅ Easy to backup and restore

**Cons:**
- ⚠️ Initial investment required
- ⚠️ ARM architecture (but works fine)
- ⚠️ Need to configure networking

---

## 📊 COST COMPARISON (First Year)

| Option | Setup Cost | Monthly Cost | Year 1 Total | Year 2+ |
|--------|------------|--------------|--------------|---------|
| **Oracle Cloud Free** | $0 | $0 | **$0** | $0 |
| **AWS Free Tier** | $0 | $0 (12mo) | **$0** | $120-180 |
| **Hetzner CX11** | $0 | $4.20 | **$50** | $50 |
| **Contabo VPS S** | $0 | $5.50 | **$66** | $66 |
| **Vultr Mumbai** | $0 | $6 | **$72** | $72 |
| **Own Computer** | $0 | $3-6 | **$36-72** | $36-72 |
| **Raspberry Pi** | $122 | $1 | **$134** | $12 |

---

## 🎯 MY RECOMMENDATION FOR YEAR 1

### **BEST OPTION: Oracle Cloud Free Tier** ⭐

**Why:**
1. ✅ **Completely FREE forever**
2. ✅ **More powerful than paid options** (4 vCPU, 24 GB RAM)
3. ✅ **Handles 500+ patients/day easily**
4. ✅ **10 TB bandwidth/month** (more than enough)
5. ✅ **200 GB storage** (10+ years of data)
6. ✅ **Mumbai data center available** (low latency)

**Setup Time:** 1-2 hours

**Steps:**
1. Sign up at https://www.oracle.com/cloud/free/
2. Verify email and phone
3. Create VM.Standard.A1.Flex instance
4. Choose Mumbai region
5. Configure: 4 OCPUs, 24 GB RAM, 200 GB storage
6. Deploy using our deployment scripts

---

### **BACKUP OPTION: Own Computer + Dynamic DNS**

**Why:**
1. ✅ **Almost free** (~$3-6/month electricity)
2. ✅ **Full control**
3. ✅ **Data stays with you**
4. ✅ **No cloud vendor lock-in**

**Requirements:**
- Computer with 4+ GB RAM
- Stable internet (any speed works)
- Router with port forwarding
- Free Dynamic DNS account

**Setup Time:** 2-3 hours

---

### **IF YOU WANT TO PAY: Consignature tabo VPS S**

**Why:**
1. ✅ **Only $5.50/month** (₹450/month)
2. ✅ **8 GB RAM, 4 vCPU** (excellent specs)
3. ✅ **200 GB storage**
4. ✅ **Singapore data center** (closer to India)
5. ✅ **32 TB bandwidth**

**Setup Time:** 1 hour

---

## 🚀 QUICK START GUIDE

### **For Oracle Cloud Free Tier:**

```bash
# 1. Create Oracle Cloud account
# 2. Create VM.Standard.A1.Flex instance (Mumbai region)
# 3. SSH into server
ssh ubuntu@<your-server-ip>

# 4. Install dependencies
sudo apt update
sudo apt install -y nodejs npm postgresql nginx

# 5. Clone repository
git clone https://github.com/LMS-SLNCity/LMS-SLNCity-V1.git
cd LMS-SLNCity-V1

# 6. Setup database
sudo -u postgres psql
CREATE DATABASE lms_slncity;
CREATE USER lms_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE lms_slncity TO lms_user;
\q

# 7. Initialize database
psql -U lms_user -d lms_slncity -f server/db/init.sql
psql -U lms_user -d lms_slncity -f server/db/seed-production.sql

# 8. Setup backend
cd server
npm install
npm run build

# 9. Setup frontend
cd ..
npm install
npm run build

# 10. Configure Nginx (see DEPLOYMENT_QUICKSTART.md)

# 11. Start application
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

### **For Own Computer (Windows):**

```bash
# 1. Install prerequisites (if not already installed)
# - Node.js 18+
# - Docker Desktop
# - Git

# 2. Clone repository
git clone https://github.com/LMS-SLNCity/LMS-SLNCity-V1.git
cd LMS-SLNCity-V1

# 3. Run deployment script
# Right-click deploy-windows.bat → Run as Administrator

# 4. Start application
start-all.bat

# 5. Configure router port forwarding
# Forward port 80 → your computer's local IP
# Forward port 443 → your computer's local IP

# 6. Setup Dynamic DNS
# Sign up at https://www.noip.com (free)
# Create hostname: yourname.ddns.net
# Install No-IP DUC client

# 7. Access from anywhere
# http://yourname.ddns.net
```

---

## 💡 TIPS TO REDUCE COSTS

### **1. Use Free SSL Certificate**
- Let's Encrypt (free, auto-renews)
- No need to pay for SSL

### **2. Use Free Domain**
- Freenom (.tk, .ml, .ga domains) - FREE
- Or use Dynamic DNS subdomain (free)

### **3. Use Free Backup Storage**
- Google Drive (15 GB free)
- Dropbox (2 GB free)
- OneDrive (5 GB free)

### **4. Use Free Monitoring**
- UptimeRobot (free, 50 monitors)
- Healthchecks.io (free, 20 checks)

### **5. Optimize Database**
- Regular VACUUM and ANALYZE
- Archive old data (>5 years)
- Compress backups

---

## ⚠️ IMPORTANT NOTES

### **Oracle Cloud Free Tier:**
- Keep account active (login once a month)
- Don't violate terms of service
- Backup data regularly (they can terminate anytime)

### **Own Computer:**
- Keep computer running 24/7
- Use UPS for power backup
- Regular backups essential
- Monitor disk space

### **Paid Options:**
- Start small, upgrade later
- Monitor usage to avoid overages
- Set up billing alerts

---

## 📞 SUPPORT

If you need help setting up any of these options, I can provide:
1. Step-by-step video guide
2. Remote setup assistance
3. Troubleshooting support

---

**Prepared By:** LMS SLNCity Development Team  
**Date:** 2025-11-08  
**Version:** 1.0

