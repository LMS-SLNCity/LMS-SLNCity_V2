#!/bin/bash
# Deploy performance updates to VM

echo "🚀 Deploying Performance Updates to VM"
echo "========================================"
echo ""

# Copy updated files to VM
echo "📤 Step 1: Copying updated files to VM..."
scp client/src/context/AppContext.tsx my-aws-vm:~/LMS-SLNCity-V1/client/src/context/
scp client/src/components/PhlebotomyQueue.tsx my-aws-vm:~/LMS-SLNCity-V1/client/src/components/
scp client/src/components/SampleCollectionModal.tsx my-aws-vm:~/LMS-SLNCity-V1/client/src/components/
scp client/src/components/ResultEntryForm.tsx my-aws-vm:~/LMS-SLNCity-V1/client/src/components/

if [ $? -ne 0 ]; then
    echo "❌ Failed to copy files to VM"
    exit 1
fi

echo "✅ Files copied successfully!"
echo ""

# Rebuild and restart frontend on VM
echo "🔨 Step 2: Rebuilding frontend on VM..."
ssh my-aws-vm << 'EOF'
cd ~/LMS-SLNCity-V1
echo "🛑 Stopping frontend..."
docker compose stop frontend

echo "🔨 Rebuilding frontend (this may take 2-3 minutes)..."
docker compose build --no-cache frontend

echo "🚀 Starting frontend..."
docker compose up -d frontend

echo ""
echo "✅ Frontend rebuilt and restarted!"
echo ""
echo "📊 Container status:"
docker compose ps
EOF

echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo ""
echo "🧪 Next Steps:"
echo "  1. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)"
echo "  2. Go to http://13.201.165.54:3000"
echo "  3. Login with sudo / admin123"
echo "  4. Test button actions (should complete in <2 seconds!)"
echo ""

