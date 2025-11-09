# 📚 LMS SLNCity Documentation

Complete documentation for Sri Lakshmi Narasimha City Diagnostic Center Laboratory Management System.

---

## 📂 Documentation Structure

### **📁 deployment/**
Deployment guides for various environments:
- AWS deployment guides
- Windows deployment guides
- Docker deployment guides
- Cloud provider options
- Testing and production deployment strategies

### **📁 database/**
Database-related documentation:
- Database schema and design
- Migration guides
- Reset and maintenance guides
- PostgreSQL setup

### **📁 security/**
Security documentation:
- Security best practices
- Authentication and authorization
- Audit logging
- Security checklist

### **📁 architecture/**
System architecture and design:
- System architecture overview
- Feature documentation
- API reference
- Component design

### **📁 scripts/**
Deployment and maintenance scripts:
- Startup scripts
- Database initialization scripts
- Deployment automation scripts
- Security check scripts

---

## 🚀 Quick Start

### **For First-Time Setup:**
1. Read: `deployment/DEPLOYMENT_QUICKSTART.md`
2. Choose your deployment option:
   - **AWS**: `deployment/AWS_DEPLOYMENT_STEPS.md`
   - **Windows**: `deployment/WINDOWS-DEPLOYMENT.md`
   - **Docker**: `deployment/DOCKER_SETUP_GUIDE.md`
   - **Budget Options**: `deployment/BUDGET_DEPLOYMENT_OPTIONS.md`

### **For Testing Deployment:**
1. Read: `deployment/TESTING_DEPLOYMENT.md`
2. Follow: `deployment/DEPLOYMENT_COMPLETE.md`

### **For Database Setup:**
1. Read: `database/DATABASE_RESET_GUIDE.md`
2. Run: `scripts/init-db.sh` or `scripts/AWS_DATABASE_SETUP.sh`

### **For System Understanding:**
1. Read: `architecture/SYSTEM_FEATURES_DOCUMENTATION.md`
2. Reference: `architecture/QUICK_REFERENCE.md`

---

## 📖 Documentation Index

### **Deployment Guides**
- `deployment/DEPLOYMENT_QUICKSTART.md` - Quick start guide
- `deployment/DEPLOYMENT_COMPLETE.md` - Complete deployment guide
- `deployment/TESTING_DEPLOYMENT.md` - Testing deployment strategy
- `deployment/AWS_DEPLOYMENT_STEPS.md` - AWS deployment steps
- `deployment/AWS_URGENT_FIXES.md` - AWS troubleshooting
- `deployment/AWS_TROUBLESHOOTING.md` - AWS troubleshooting guide
- `deployment/WINDOWS-DEPLOYMENT.md` - Windows deployment guide
- `deployment/DOCKER_SETUP_GUIDE.md` - Docker setup guide
- `deployment/CLOUD_DEPLOYMENT_SPECS.md` - Cloud specifications
- `deployment/BUDGET_DEPLOYMENT_OPTIONS.md` - Budget-friendly options

### **Database Documentation**
- `database/DATABASE_RESET_GUIDE.md` - Database reset and maintenance
- `database/DATABASE_SCHEMA_REVIEW.md` - Schema design and review
- `database/POSTGRES_MIGRATION_PLAN.md` - PostgreSQL migration guide

### **Security Documentation**
- `security/SECURITY_AND_DEPLOYMENT.md` - Security best practices
- `security/SECURITY_SUMMARY.md` - Security summary

### **Architecture Documentation**
- `architecture/SYSTEM_FEATURES_DOCUMENTATION.md` - Complete feature docs
- `architecture/SYSTEM_ARCHITECTURE.md` - System architecture
- `architecture/QUICK_REFERENCE.md` - Quick reference guide

### **Scripts**
- `scripts/start-dev.sh` - Start development environment
- `scripts/start-servers.sh` - Start production servers
- `scripts/init-db.sh` - Initialize database
- `scripts/AWS_DATABASE_SETUP.sh` - AWS database setup
- `scripts/deploy.sh` - Deployment script
- `scripts/deploy-windows.bat` - Windows deployment (batch)
- `scripts/deploy-windows.ps1` - Windows deployment (PowerShell)
- `scripts/security-check.sh` - Security check script
- `scripts/fix-hardcoded-urls.sh` - Fix hardcoded URLs

---

## 🎯 Common Tasks

### **Deploy to AWS**
```bash
# 1. Read the guide
cat documentation/deployment/AWS_DEPLOYMENT_STEPS.md

# 2. Setup database
bash documentation/scripts/AWS_DATABASE_SETUP.sh

# 3. Follow deployment steps
# See: documentation/deployment/DEPLOYMENT_COMPLETE.md
```

### **Test Before Production**
```bash
# Follow testing deployment guide
cat documentation/deployment/TESTING_DEPLOYMENT.md
```

### **Reset Database**
```bash
# Read the guide
cat documentation/database/DATABASE_RESET_GUIDE.md

# Run reset script
bash documentation/scripts/init-db.sh
```

### **Check Security**
```bash
# Run security check
bash documentation/scripts/security-check.sh

# Read security guide
cat documentation/security/SECURITY_AND_DEPLOYMENT.md
```

---

## 📞 Support

For issues or questions:
1. Check the relevant documentation section
2. Review troubleshooting guides in `deployment/`
3. Check logs: `pm2 logs --lines 100`
4. Review system architecture in `architecture/`

---

## 📝 Documentation Maintenance

When adding new documentation:
- Place deployment docs in `deployment/`
- Place database docs in `database/`
- Place security docs in `security/`
- Place architecture docs in `architecture/`
- Place scripts in `scripts/`
- Update this README with links

---

**Last Updated:** 2025-11-09
**Version:** 1.0.0
