#!/bin/sh
set -e

# Default to localhost if not provided
API_URL=${VITE_BACKEND_API_URL:-http://localhost:3431/api/v1}

echo "Injecting backend URL: $API_URL"

# Replace the placeholder in all output JavaScript files
find /usr/share/nginx/html/assets -type f -name "*.js" -exec sed -i "s|__VITE_BACKEND_API_URL__|$API_URL|g" {} +

exit 0
