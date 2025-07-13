#!/bin/bash

# LINE Talk RAG Clear Database Test Script
# Tests the /clear endpoint for emptying the Vectorize database

set -e

# Configuration
BASE_URL="${BASE_URL:-http://localhost:8787}"
CLEAR_ENDPOINT="$BASE_URL/clear"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== LINE Talk RAG Database Clear Test ===${NC}"
echo "Target URL: $CLEAR_ENDPOINT"
echo

# Function to print colored messages
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Test clear endpoint
print_status "Testing database clear endpoint..."

# Make the DELETE request
RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$CLEAR_ENDPOINT")

# Split response and status code
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Response:"
echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
echo

# Check response
case $HTTP_CODE in
    200)
        print_success "Database clear completed successfully!"
        
        # Try to parse JSON response
        if echo "$RESPONSE_BODY" | jq -e '.status' >/dev/null 2>&1; then
            STATUS=$(echo "$RESPONSE_BODY" | jq -r '.status')
            DELETED_COUNT=$(echo "$RESPONSE_BODY" | jq -r '.deletedCount // "unknown"')
            
            case $STATUS in
                "SUCCESS")
                    print_success "Successfully deleted $DELETED_COUNT vectors"
                    ;;
                "ALREADY_EMPTY")
                    print_warning "Database was already empty"
                    ;;
                *)
                    print_warning "Unexpected status: $STATUS"
                    ;;
            esac
        fi
        ;;
    500)
        print_error "Server error occurred"
        if echo "$RESPONSE_BODY" | jq -e '.error' >/dev/null 2>&1; then
            ERROR_MSG=$(echo "$RESPONSE_BODY" | jq -r '.error')
            print_error "Error: $ERROR_MSG"
        fi
        ;;
    404)
        print_error "Endpoint not found - make sure the server is running"
        ;;
    *)
        print_error "Unexpected response code: $HTTP_CODE"
        ;;
esac

# Test health endpoint to verify system is still working
print_status "Verifying system health after clear..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/")
HEALTH_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)

if [ "$HEALTH_CODE" = "200" ]; then
    print_success "System health check passed"
else
    print_warning "Health check returned status: $HEALTH_CODE"
fi

echo
print_status "Test completed!"

# Usage instructions
echo
echo -e "${YELLOW}=== Usage Instructions ===${NC}"
echo "1. To clear the database:"
echo "   curl -X DELETE $CLEAR_ENDPOINT"
echo
echo "2. To check database status before/after:"
echo "   curl $BASE_URL/"
echo
echo "3. To upload new data after clearing:"
echo "   curl -X POST $BASE_URL/prepare -F \"file=@your_chat_history.txt\""
echo
print_warning "Note: Clearing the database is irreversible!"
print_warning "All chat history and vector data will be permanently deleted."
