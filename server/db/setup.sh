#!/bin/bash
# Master Database Setup Script
# Choose between development or production setup

set -e

echo "=========================================="
echo "LMS Database Setup"
echo "=========================================="
echo ""
echo "Choose environment:"
echo "  1) Development (with test data)"
echo "  2) Production (clean, essential data only)"
echo ""
read -p "Enter choice (1 or 2): " choice

case $choice in
    1)
        echo ""
        echo "Setting up DEVELOPMENT environment..."
        bash "$(dirname "$0")/setup-development.sh"
        ;;
    2)
        echo ""
        echo "Setting up PRODUCTION environment..."
        bash "$(dirname "$0")/setup-production.sh"
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

