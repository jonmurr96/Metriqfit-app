#!/bin/bash
# MetriqFit - Supabase Cloud Migration Script
# Run this after creating your Supabase project

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   MetriqFit - Supabase Cloud Setup${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    cat > .env << 'EOF'
# Supabase Cloud Credentials
# Replace these with your actual values from Supabase dashboard

EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Server-side only
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# App environment
EXPO_PUBLIC_APP_ENV=development
EOF
    echo -e "${GREEN}✓ Created .env file${NC}"
    echo -e "${YELLOW}⚠ You need to edit .env with your Supabase credentials!${NC}"
    echo ""
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

# Instructions
echo -e "${BLUE}Next Steps:${NC}"
echo ""
echo "1. Get your Supabase credentials:"
echo "   - Go to your Supabase project dashboard"
echo "   - Settings → API"
echo "   - Copy Project URL and anon key"
echo ""
echo "2. Edit .env file:"
echo "   - Replace EXPO_PUBLIC_SUPABASE_URL"
echo "   - Replace EXPO_PUBLIC_SUPABASE_ANON_KEY"
echo ""
echo "3. Link your project:"
echo "   npx supabase link --project-ref YOUR_PROJECT_REF"
echo ""
echo "4. Push migrations:"
echo "   npx supabase db push"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
