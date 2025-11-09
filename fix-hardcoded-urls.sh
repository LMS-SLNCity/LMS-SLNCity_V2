#!/bin/bash

# Script to fix all hardcoded localhost:5001 URLs in components

echo "🔧 Fixing hardcoded localhost URLs in components..."

# List of files to fix
FILES=(
    "components/B2BPrintReport.tsx"
    "components/CreateVisitFormNew.tsx"
    "components/B2BClientDashboard.tsx"
    "components/CreateVisitForm.tsx"
    "components/admin/ClientLedgerModal.tsx"
    "components/admin/UserManagement.tsx"
    "components/admin/SignatureUploadModal.tsx"
    "components/admin/B2BAccountManagementModal.tsx"
    "components/admin/AuditLogViewer.tsx"
    "components/admin/WaiversManagement.tsx"
    "components/PatientSearchModal.tsx"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "Processing: $file"
        
        # Check if file already imports API_BASE_URL
        if ! grep -q "import.*API_BASE_URL.*from.*config/api" "$file"; then
            # Add import at the top (after existing imports)
            # This is a simplified approach - manual review recommended
            echo "  ⚠️  Needs manual import addition: $file"
        fi
        
        # Replace hardcoded URLs
        sed -i '' "s|'http://localhost:5001/api|\`\${API_BASE_URL}|g" "$file"
        sed -i '' 's|"http://localhost:5001/api|`${API_BASE_URL}|g' "$file"
        
        echo "  ✅ Updated: $file"
    else
        echo "  ❌ File not found: $file"
    fi
done

echo ""
echo "✅ Done! Please review the changes and add imports manually where needed."
echo ""
echo "Add this import to files that need it:"
echo "import { API_BASE_URL } from '../config/api';"
echo "or"
echo "import { API_BASE_URL } from '../../config/api';"

