# Sharing Guide for Stats Tracker

This guide explains how to package and share this project with others.

## What Gets Excluded

The following files/folders are automatically excluded to protect sensitive data:
- ✅ `node_modules/` - Dependencies (large, can be reinstalled)
- ✅ `server/.env` - Contains your JWT secrets and configuration
- ✅ `server/golf.db` - Your personal golf data
- ✅ `package-lock.json` - Can be regenerated
- ✅ Build outputs and logs

## What Gets Included

The recipient will receive:
- ✅ All source code (client & server)
- ✅ README.md with setup instructions
- ✅ `server/.env.example` - Template for configuration
- ✅ `package.json` files for dependency management
- ✅ All documentation files

## Method 1: Git Repository (Recommended for Developers)

This is the best option if sharing with another developer who might want to contribute or track changes.

### Initialize Git Repository
```bash
cd /home/alan/dev/stats-tracker
git init
git add .
git commit -m "Initial commit - Golf Stats Tracker"
```

### Share Options:

#### A. GitHub/GitLab (Public or Private Repository)
1. Create a new repository on GitHub/GitLab
2. Follow their instructions to push:
   ```bash
   git remote add origin <repository-url>
   git push -u origin main
   ```
3. Share the repository URL

#### B. Bundle File (No GitHub Required)
Create a single `.bundle` file that contains the entire git history:
```bash
git bundle create stats-tracker.bundle --all
```
Send `stats-tracker.bundle` to your recipient. They can clone it like:
```bash
git clone stats-tracker.bundle stats-tracker
cd stats-tracker
```

## Method 2: Compressed Archive (Simple Sharing)

This creates a clean .tar.gz or .zip file without git history.

### Create TAR.GZ (Linux/Mac)
```bash
cd /home/alan/dev
tar --exclude='node_modules' \
    --exclude='server/.env' \
    --exclude='server/golf.db' \
    --exclude='*.log' \
    --exclude='.git' \
    --exclude='dist' \
    --exclude='package-lock.json' \
    -czf stats-tracker.tar.gz stats-tracker/
```

### Create ZIP (Cross-platform)
```bash
cd /home/alan/dev/stats-tracker
zip -r ../stats-tracker.zip . \
    -x "node_modules/*" \
    -x "server/.env" \
    -x "server/golf.db" \
    -x "*.log" \
    -x ".git/*" \
    -x "dist/*" \
    -x "package-lock.json"
```

The recipient extracts and follows the README.md setup instructions.

## Method 3: Development Container (Advanced)

If the recipient has Docker, you could containerize the application. This ensures it works the same everywhere.

## What the Recipient Needs to Do

1. **Extract/Clone the project**
2. **Set up environment variables**:
   ```bash
   cd server
   cp .env.example .env
   # Edit .env and generate new secrets with: openssl rand -hex 32
   ```
3. **Install dependencies**:
   ```bash
   # Server
   cd server
   npm install
   
   # Client
   cd ../client
   npm install
   ```
4. **Run the application**:
   ```bash
   # Terminal 1 - Server
   cd server
   npm run dev
   
   # Terminal 2 - Client
   cd client
   npm run dev
   ```

## Security Note

⚠️ **IMPORTANT**: Never share:
- Your actual `.env` file (contains secrets)
- Your `golf.db` file (contains personal data)
- Any files with passwords or API keys

The `.gitignore` file is configured to protect you, but always double-check before sharing!

## Quick Commands Summary

```bash
# Quick Git Bundle (Easiest)
cd /home/alan/dev/stats-tracker
git init
git add .
git commit -m "Initial commit"
git bundle create ../stats-tracker.bundle --all

# Quick ZIP Archive
cd /home/alan/dev/stats-tracker
zip -r ../stats-tracker.zip . -x "node_modules/*" "server/.env" "server/golf.db" "*.log" "dist/*" "package-lock.json"
```

## Recommended Approach

**For a developer colleague**: Use Git Bundle (Method 1B) - they get full version control without needing GitHub.

**For a quick demo/review**: Use ZIP archive (Method 2) - simple and works everywhere.

**For collaboration**: Use GitHub/GitLab (Method 1A) - enables ongoing development and issue tracking.
