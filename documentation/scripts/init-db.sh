#!/bin/bash
set -e

echo "Initializing database schema..."

# Copy init.sql to container
docker cp /Users/ramgopal/LMS-SLNCity-V1/server/db/init.sql lis_postgres:/tmp/init.sql

# Run the init script
docker exec lis_postgres psql -U lms_user -d lms_slncity -f /tmp/init.sql

echo "✅ Database schema initialized"

