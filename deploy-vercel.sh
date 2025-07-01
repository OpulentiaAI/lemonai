#!/bin/bash

# Vercel Deployment Script for Lemon AI with Cloud Services

echo "🚀 Deploying Lemon AI to Vercel with Cloud Services..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm i -g vercel
fi

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "❌ .env.production file not found!"
    echo "Please create .env.production with your API keys"
    exit 1
fi

# Build frontend
echo "📦 Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Set up Vercel environment variables
echo "⚙️ Setting up environment variables..."

# Read .env.production and set variables in Vercel
while IFS='=' read -r key value; do
    # Skip comments and empty lines
    if [[ ! "$key" =~ ^#.*$ ]] && [[ -n "$key" ]]; then
        # Remove quotes from value
        value="${value%\"}"
        value="${value#\"}"
        echo "Setting $key..."
        vercel env add "$key" production <<< "$value" 2>/dev/null || true
    fi
done < .env.production

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
vercel --prod

# Get deployment URL
DEPLOYMENT_URL=$(vercel ls --json | jq -r '.[0].url')

echo "✅ Deployment complete!"
echo "🔗 Your app is live at: https://$DEPLOYMENT_URL"
echo ""
echo "📝 Next steps:"
echo "1. Set up Supabase tables (see DEPLOY_VERCEL.md)"
echo "2. Configure custom domain in Vercel dashboard"
echo "3. Test all cloud services integration"
echo "4. Monitor usage and costs in respective dashboards"