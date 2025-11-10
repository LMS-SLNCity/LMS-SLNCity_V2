# Git Commands Quick Reference

Quick reference for committing and pushing changes to GitHub.

---

## 📋 Step-by-Step Guide

### 1. Check Current Status

```bash
# See what files have changed
git status

# See detailed changes
git diff

# See changes in specific file
git diff components/TestReport.tsx
```

---

### 2. Stage Changes

```bash
# Stage all changes (recommended)
git add .

# Or stage specific files
git add server/db/init.sql
git add server/src/routes/referralDoctors.ts
git add components/TestReport.tsx
```

---

### 3. Commit Changes

```bash
git commit -m "feat: Add referral doctor designation and fix audit logs

- Add designation field to referral doctors (database, API, UI)
- Show designation in dropdowns and reports
- Fix duplicate 'Dr.' prefix in reports
- Fix audit logs API error (removed non-existent columns)
- Optimize microbiology report layout
- Add searchable dropdowns for units, doctors, and clients
- Add AWS deployment guide and comprehensive documentation
- Add local deployment script

Features:
- Referral doctors now have designation field (e.g., MD, MBBS)
- Designation shows in admin UI, dropdowns, and reports
- Searchable dropdowns for better UX
- Microbiology reports optimized for space

Bug Fixes:
- Fixed audit logs API error
- Fixed duplicate 'Dr.' prefix in reports
- Fixed units not loading in test templates

Documentation:
- Added AWS_DEPLOYMENT_GUIDE.md
- Added CHANGELOG.md
- Added DEPLOYMENT_STEPS.md
- Added RELEASE_SUMMARY.md
- Added deploy-local.sh script"
```

---

### 4. Push to GitHub

```bash
# Push to main branch
git push origin main
```

**If you get authentication error:**

```bash
# Use personal access token
# 1. Go to GitHub → Settings → Developer Settings → Personal Access Tokens
# 2. Generate new token (classic) with 'repo' permissions
# 3. Copy the token
# 4. When prompted for password, paste the token

# Or configure SSH key (one-time setup)
ssh-keygen -t ed25519 -C "ramgopalpampana10@gmail.com"
# Press Enter to accept default location
# Press Enter twice for no passphrase (or set one)

# Add SSH key to GitHub
cat ~/.ssh/id_ed25519.pub
# Copy the output
# Go to GitHub → Settings → SSH and GPG keys → New SSH key
# Paste the key and save

# Change remote to SSH
git remote set-url origin git@github.com:LMS-SLNCity/LMS-SLNCity-V1.git

# Now push
git push origin main
```

---

## 🔄 Alternative: Feature Branch Workflow

If you want to create a pull request instead of pushing directly to main:

```bash
# Create and switch to feature branch
git checkout -b feature/referral-doctor-designation

# Stage and commit (same as above)
git add .
git commit -m "feat: Add referral doctor designation and fix audit logs..."

# Push to feature branch
git push origin feature/referral-doctor-designation

# Then create Pull Request on GitHub:
# 1. Go to https://github.com/LMS-SLNCity/LMS-SLNCity-V1
# 2. Click "Pull Requests" → "New Pull Request"
# 3. Select your feature branch
# 4. Add title and description
# 5. Click "Create Pull Request"
# 6. Merge after review
```

---

## 📝 Commit Message Format

Follow conventional commits format:

```
<type>: <subject>

<body>

<footer>
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

**Example:**
```bash
git commit -m "feat: Add referral doctor designation

- Add designation field to database
- Update API endpoints
- Update UI components
- Add documentation

Closes #123"
```

---

## 🔍 Useful Git Commands

### View History
```bash
# View commit history
git log

# View compact history
git log --oneline

# View last 5 commits
git log -5

# View changes in last commit
git show
```

### Undo Changes
```bash
# Discard changes in working directory
git checkout -- <file>

# Unstage file (keep changes)
git reset HEAD <file>

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes) - DANGEROUS!
git reset --hard HEAD~1
```

### Branch Management
```bash
# List branches
git branch

# Create new branch
git branch feature-name

# Switch to branch
git checkout feature-name

# Create and switch in one command
git checkout -b feature-name

# Delete branch
git branch -d feature-name

# Delete remote branch
git push origin --delete feature-name
```

### Remote Management
```bash
# View remotes
git remote -v

# Add remote
git remote add origin https://github.com/user/repo.git

# Change remote URL
git remote set-url origin https://github.com/user/repo.git

# Fetch from remote
git fetch origin

# Pull from remote
git pull origin main
```

---

## 🚨 Common Issues and Solutions

### Issue: "Your branch is behind 'origin/main'"

```bash
# Pull latest changes
git pull origin main

# If there are conflicts, resolve them manually
# Then commit the merge
git add .
git commit -m "Merge remote changes"
git push origin main
```

### Issue: "Authentication failed"

```bash
# Use personal access token instead of password
# Or setup SSH key (see step 4 above)
```

### Issue: "Merge conflict"

```bash
# View conflicted files
git status

# Open conflicted files and resolve conflicts
# Look for markers: <<<<<<<, =======, >>>>>>>
# Edit the file to keep the correct version

# After resolving
git add <resolved-file>
git commit -m "Resolve merge conflict"
git push origin main
```

### Issue: "Accidentally committed sensitive data"

```bash
# Remove file from last commit
git rm --cached <file>
git commit --amend -m "Remove sensitive file"

# If already pushed, you need to force push (DANGEROUS!)
git push origin main --force

# Better: Use .gitignore to prevent this
echo "<file-pattern>" >> .gitignore
git add .gitignore
git commit -m "Add file to gitignore"
```

---

## 📚 Best Practices

1. **Commit Often:** Make small, focused commits
2. **Write Clear Messages:** Explain what and why, not how
3. **Pull Before Push:** Always pull latest changes before pushing
4. **Review Before Commit:** Use `git diff` to review changes
5. **Use Branches:** Create feature branches for new work
6. **Don't Commit Secrets:** Use .gitignore for sensitive files
7. **Test Before Push:** Make sure code works before pushing

---

## 🎯 Quick Commands for This Release

```bash
# 1. Check status
git status

# 2. Stage all changes
git add .

# 3. Commit with message
git commit -m "feat: Add referral doctor designation and fix audit logs

- Add designation field to referral doctors
- Show designation in dropdowns and reports
- Fix duplicate 'Dr.' prefix in reports
- Fix audit logs API error
- Optimize microbiology report layout
- Add searchable dropdowns
- Add AWS deployment guide and documentation"

# 4. Push to GitHub
git push origin main

# 5. Verify on GitHub
# Open: https://github.com/LMS-SLNCity/LMS-SLNCity-V1
```

---

## ✅ Checklist Before Pushing

- [ ] All tests pass locally
- [ ] Code is properly formatted
- [ ] No sensitive data in commits
- [ ] Commit message is clear and descriptive
- [ ] Documentation is updated
- [ ] Changes are reviewed
- [ ] Containers build and run successfully

---

**Ready to push? Run the commands above! 🚀**

