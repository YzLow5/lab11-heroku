#!/bin/bash
# test-heroku.sh  (Git Bash / Linux / macOS, cần cài jq)
# Cách chạy:  ./test-heroku.sh https://<ten-app>-xxxx.herokuapp.com

GATEWAY_URL="${1:-https://your-username-api-gateway.herokuapp.com}"
GATEWAY_URL="${GATEWAY_URL%/}"
EMAIL="test$RANDOM@heroku.com"

echo "Testing API Gateway..."
curl -s "$GATEWAY_URL/" | jq .

echo -e "\n\nTesting health checks..."
curl -s "$GATEWAY_URL/health" | jq .

echo -e "\n\nTesting Users service..."
curl -s "$GATEWAY_URL/users" | jq .

echo -e "\n\nCreating new user..."
curl -s -X POST "$GATEWAY_URL/users" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Test User\", \"email\": \"$EMAIL\"}" | jq .

echo -e "\n\nTesting Products service..."
curl -s "$GATEWAY_URL/products" | jq .

echo -e "\n\nCreating new product..."
curl -s -X POST "$GATEWAY_URL/products" \
  -H "Content-Type: application/json" \
  -d '{"name": "Heroku Product", "price": 50, "stock": 100}' | jq .

echo -e "\n\nCreating order..."
curl -s -X POST "$GATEWAY_URL/orders" \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "productId": 1, "quantity": 2}' | jq .

echo -e "\n\nGetting all orders..."
curl -s "$GATEWAY_URL/orders" | jq .
