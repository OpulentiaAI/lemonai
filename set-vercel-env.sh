#!/bin/bash

# Script to set all environment variables in Vercel

echo "🔐 Setting environment variables in Vercel..."

# Read .env.production and set each variable
while IFS='=' read -r key value; do
    # Skip comments and empty lines
    if [[ ! "$key" =~ ^#.*$ ]] && [[ -n "$key" ]]; then
        # Remove quotes from value
        value="${value%\"}"
        value="${value#\"}"
        
        # Skip if value contains placeholder
        if [[ ! "$value" =~ \[YOUR-PASSWORD\] ]]; then
            echo "Setting $key..."
            echo "$value" | vercel env add "$key" production --yes 2>/dev/null || true
        fi
    fi
done < .env.production

echo "✅ Environment variables set!"
echo "🚀 Now deploying again..."

vercel --prod --yes