#!/bin/bash

# Script to revert deploy-vm-dev.sh back to auto-detect IP
# Run this AFTER you've cloned to VM and deployed

set -e

echo "=========================================="
echo "Reverting deploy-vm-dev.sh to auto-detect"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "deploy-vm-dev.sh" ]; then
    echo "Error: deploy-vm-dev.sh not found!"
    echo "Please run this script from the LMS-SLNCity-V1 directory"
    exit 1
fi

# Create backup
cp deploy-vm-dev.sh deploy-vm-dev.sh.backup
echo "✓ Created backup: deploy-vm-dev.sh.backup"

# Replace the hardcoded IP with auto-detect logic
sed -i '53,55d' deploy-vm-dev.sh
sed -i '52a\
# Get VM IP address\
# Try to auto-detect the primary IP address\
VM_IP=$(hostname -I | awk '\''{print $1}'\'')\
if [ -z "$VM_IP" ]; then\
    # Fallback: try to get from ip command\
    VM_IP=$(ip route get 1 | awk '\''{print $7;exit}'\'' 2>/dev/null)\
fi\
if [ -z "$VM_IP" ]; then\
    print_error "Could not detect VM IP address"\
    read -p "Please enter your VM IP address: " VM_IP\
fi\
print_info "Detected VM IP Address: $VM_IP"\
\
# Ask user to confirm IP\
read -p "Is this IP address correct? (y/n): " confirm\
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then\
    read -p "Please enter the correct VM IP address: " VM_IP\
fi' deploy-vm-dev.sh

echo "✓ Reverted deploy-vm-dev.sh to auto-detect IP"
echo ""
echo "Now commit and push the change:"
echo "  git add deploy-vm-dev.sh"
echo "  git commit -m 'Revert: Change deploy script back to auto-detect IP'"
echo "  git push origin main"
echo ""

