# 🏥 LMS SLNCity

**Laboratory Management System for Sri Lakshmi Narasimha City Diagnostic Center**

A comprehensive, production-ready Laboratory Management System built with React, TypeScript, Node.js, Express, and PostgreSQL.

---

## 🚀 Quick Start

### **For Complete Documentation:**
📚 **[View Full Documentation](documentation/README.md)**

### **Quick Links:**
- 🚀 [Deployment Guide](documentation/deployment/DEPLOYMENT_QUICKSTART.md)
- 🧪 [Testing Deployment](documentation/deployment/TESTING_DEPLOYMENT.md)
- 🗄️ [Database Setup](documentation/database/DATABASE_RESET_GUIDE.md)
- 🏗️ [System Architecture](documentation/architecture/SYSTEM_FEATURES_DOCUMENTATION.md)
- 📖 [Quick Reference](documentation/architecture/QUICK_REFERENCE.md)

---

## 📂 Project Structure

```
LMS-SLNCity-V1/
├── components/          # React components
├── context/            # React context providers
├── server/             # Backend API (Node.js/Express)
├── documentation/      # 📚 All documentation and scripts
│   ├── deployment/     # Deployment guides
│   ├── database/       # Database documentation
│   ├── security/       # Security documentation
│   ├── architecture/   # System architecture
│   └── scripts/        # Deployment scripts
├── public/             # Static assets
└── types/              # TypeScript type definitions
```

---

## 🛠️ Technology Stack

- **Frontend:** React 19.2.0, TypeScript 5.8.2, Vite 6.2.0, Tailwind CSS
- **Backend:** Node.js 18.20.8, Express, TypeScript
- **Database:** PostgreSQL 17
- **Authentication:** JWT with bcrypt
- **Security:** Helmet, Rate Limiting, CORS

---

## 🎯 Key Features

- ✅ Patient Registration & Visit Management
- ✅ Test Template Management with Department Grouping
- ✅ Multi-page Report Generation (NABL-compliant)
- ✅ Approval Workflow with Digital Signatures
- ✅ B2B Client Portal with Financial Management
- ✅ Role-based Access Control (6 roles, 18 permissions)
- ✅ Comprehensive Audit Logging
- ✅ Partial Settlement & Waiver Tracking
- ✅ Responsive Design for All Screen Sizes

---

## 🚀 Deployment Options

### **Cloud Deployment:**
- [AWS Deployment](documentation/deployment/AWS_DEPLOYMENT_STEPS.md)
- [Budget Options](documentation/deployment/BUDGET_DEPLOYMENT_OPTIONS.md) (Free tier & low-cost)
- [Cloud Specifications](documentation/deployment/CLOUD_DEPLOYMENT_SPECS.md)

### **Local Deployment:**
- [Windows Deployment](documentation/deployment/WINDOWS-DEPLOYMENT.md)
- [Docker Setup](documentation/deployment/DOCKER_SETUP_GUIDE.md)

### **Testing Strategy:**
- [Testing Deployment Guide](documentation/deployment/TESTING_DEPLOYMENT.md) - Test on different ports first

---

## 📖 Documentation

All documentation is organized in the [`documentation/`](documentation/) folder:

### **📁 Deployment Guides** ([documentation/deployment/](documentation/deployment/))
- Complete deployment guides for AWS, Windows, Docker
- Testing strategies and troubleshooting
- Budget-friendly deployment options

### **📁 Database Documentation** ([documentation/database/](documentation/database/))
- Database schema and design
- Migration guides
- Reset and maintenance procedures

### **📁 Security Documentation** ([documentation/security/](documentation/security/))
- Security best practices
- Authentication and authorization
- Audit logging

### **📁 Architecture Documentation** ([documentation/architecture/](documentation/architecture/))
- System architecture overview
- Complete feature documentation
- API reference and quick reference guide

### **📁 Scripts** ([documentation/scripts/](documentation/scripts/))
- Deployment automation scripts
- Database initialization scripts
- Security check scripts

---

## 🔧 Development

### **Prerequisites:**
- Node.js 18.20.8 (use nvm)
- PostgreSQL 17
- npm or yarn

### **Setup:**
```bash
# Clone repository
git clone https://github.com/LMS-SLNCity/LMS-SLNCity-V1.git
cd LMS-SLNCity-V1

# Install dependencies
npm install
cd server && npm install && cd ..

# Setup database
bash documentation/scripts/init-db.sh

# Start development servers
bash documentation/scripts/start-dev.sh
```

### **Environment Variables:**
- Frontend: `.env` with `VITE_API_URL`
- Backend: `server/.env` with database credentials and JWT secret

See [Deployment Guide](documentation/deployment/DEPLOYMENT_QUICKSTART.md) for details.

---

## 👥 Default Users

| Username | Password | Role |
|----------|----------|------|
| sudo | ChangeMe@123 | Super Admin |
| admin | ChangeMe@123 | Admin |

**⚠️ Change these passwords immediately in production!**

---

## 📞 Support

For issues or questions:
1. Check the [documentation](documentation/README.md)
2. Review [troubleshooting guides](documentation/deployment/)
3. Check system logs: `pm2 logs --lines 100`

---

## 📝 License

Proprietary - Sri Lakshmi Narasimha City Diagnostic Center

---

## 🎉 Version

**Version:** 1.0.0
**Last Updated:** 2025-11-09

---

**For complete documentation, visit: [documentation/README.md](documentation/README.md)**
