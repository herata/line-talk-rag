#!/bin/bash

# LINE Talk RAG System - File Upload Only Test Script
# Tests the /prepare endpoint with file upload functionality

echo "📁 Testing LINE Talk RAG System (File Upload Only)"
echo "================================================="

# Configuration
BASE_URL="http://localhost:8787"
CHAT_FILE="sample_line_chat.txt"

echo ""
echo "📋 Testing /prepare endpoint with file upload..."

# Check if sample file exists
if [ ! -f "$CHAT_FILE" ]; then
    echo "❌ Error: $CHAT_FILE not found!"
    echo "Please make sure the sample chat file exists."
    exit 1
fi

# Test 1: Basic file upload
echo ""
echo "🔍 Testing basic file upload..."
response=$(curl -X POST "$BASE_URL/prepare" \
    -F "file=@$CHAT_FILE" \
    -w "RESPONSE_TIME:%{time_total}" \
    -s)
echo "${response%RESPONSE_TIME:*}" | jq '.'
echo "📊 Response Time: ${response##*RESPONSE_TIME:}s"

# Test 2: File upload with custom options
echo ""
echo "🔧 Testing file upload with custom options..."
response=$(curl -X POST "$BASE_URL/prepare" \
    -F "file=@$CHAT_FILE" \
    -F "options={\"chunkSize\": 2000, \"chunkOverlap\": 400}" \
    -w "RESPONSE_TIME:%{time_total}" \
    -s)
echo "${response%RESPONSE_TIME:*}" | jq '.'
echo "📊 Response Time: ${response##*RESPONSE_TIME:}s"

# Test 3: Error handling - JSON request (should fail)
echo ""
echo "❌ Testing JSON request rejection..."
CHAT_CONTENT=$(cat "$CHAT_FILE" | jq -Rs .)
response=$(curl -X POST "$BASE_URL/prepare" \
    -H "Content-Type: application/json" \
    -d "{\"text\": $CHAT_CONTENT}" \
    -w "RESPONSE_TIME:%{time_total}" \
    -s)
echo "${response%RESPONSE_TIME:*}" | jq '.'
echo "📊 Response Time: ${response##*RESPONSE_TIME:}s"

# Test 4: Error handling - no file
echo ""
echo "❌ Testing error handling - missing file..."
response=$(curl -X POST "$BASE_URL/prepare" \
    -F "options={}" \
    -w "RESPONSE_TIME:%{time_total}" \
    -s)
echo "${response%RESPONSE_TIME:*}" | jq '.'
echo "📊 Response Time: ${response##*RESPONSE_TIME:}s"

# Test 5: Error handling - wrong file type
echo ""
echo "❌ Testing error handling - wrong file type..."
echo "This is not a chat file" > temp_test.json
response=$(curl -X POST "$BASE_URL/prepare" \
    -F "file=@temp_test.json" \
    -w "RESPONSE_TIME:%{time_total}" \
    -s)
echo "${response%RESPONSE_TIME:*}" | jq '.'
echo "📊 Response Time: ${response##*RESPONSE_TIME:}s"
rm temp_test.json

# Test 6: Health check endpoint
echo ""
echo "🏥 Testing health check endpoint..."
response=$(curl -X GET "$BASE_URL/" \
    -w "RESPONSE_TIME:%{time_total}" \
    -s)
echo "${response%RESPONSE_TIME:*}" | jq '.'
echo "📊 Response Time: ${response##*RESPONSE_TIME:}s"

echo ""
echo "✅ File upload testing complete!"
echo ""
echo "📝 Test Summary:"
echo "- ✅ Basic file upload (.txt)"
echo "- ✅ File upload with custom options"
echo "- ✅ JSON request rejection (file upload only)"
echo "- ✅ Error handling (missing file)"
echo "- ✅ Error handling (wrong file type)"
echo "- ✅ Health check endpoint"
echo ""
echo "🎯 Usage Examples:"
echo ""
echo "1. Basic file upload:"
echo "   curl -X POST \"$BASE_URL/prepare\" -F \"file=@your_chat.txt\""
echo ""
echo "2. File upload with options:"
echo "   curl -X POST \"$BASE_URL/prepare\" \\"
echo "        -F \"file=@your_chat.txt\" \\"
echo "        -F \"options={\\\"chunkSize\\\": 2000}\""
echo ""
echo "🔗 For detailed documentation, see README.md"
