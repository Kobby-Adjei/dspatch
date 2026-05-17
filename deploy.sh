#!/bin/bash
# DSPatch — IBM Code Engine deployment
# Run from project root: bash deploy.sh

set -e

REGION="ca-tor"
CE_PROJECT="watsonx-Hackathon Code Engine"
API_KEY="${WATSONX_API_KEY:-$(grep WATSONX_API_KEY .env | cut -d= -f2)}"

echo "[deploy] logging in..."
ibmcloud login --apikey "$API_KEY" -r "$REGION" -g Default -q

echo "[deploy] checking plugins..."
ibmcloud plugin list | grep -q "code-engine"       || ibmcloud plugin install code-engine -f -q
ibmcloud plugin list | grep -q "container-registry" || ibmcloud plugin install container-registry -f -q

echo "[deploy] selecting/creating Code Engine project..."
ibmcloud ce project select --name "$CE_PROJECT" 2>/dev/null || \
  ibmcloud ce project create --name "$CE_PROJECT"

# ── Load env vars ─────────────────────────────────────────────────────────────
source .env

# ── Create secrets (all env vars in one shot) ─────────────────────────────────
echo "[deploy] syncing secrets..."
ibmcloud ce secret delete --name dspatch-env --ignore-not-found -f 2>/dev/null || true
ibmcloud ce secret create --name dspatch-env \
  --from-literal WATSONX_ENABLED="${WATSONX_ENABLED}" \
  --from-literal WATSONX_API_KEY="${WATSONX_API_KEY}" \
  --from-literal WATSONX_PROJECT_ID="${WATSONX_PROJECT_ID}" \
  --from-literal WATSONX_URL="${WATSONX_URL}" \
  --from-literal WATSONX_MODEL_ID="${WATSONX_MODEL_ID}" \
  --from-literal GEMINI_ENABLED="${GEMINI_ENABLED}" \
  --from-literal GEMINI_API_KEY="${GEMINI_API_KEY}" \
  --from-literal CLOUDANT_URL="${CLOUDANT_URL}" \
  --from-literal CLOUDANT_APIKEY="${CLOUDANT_APIKEY}" \
  --from-literal TWILIO_ACCOUNT_SID="${TWILIO_ACCOUNT_SID}" \
  --from-literal TWILIO_AUTH_TOKEN="${TWILIO_AUTH_TOKEN}" \
  --from-literal TWILIO_API_KEY="${TWILIO_API_KEY}" \
  --from-literal TWILIO_API_SECRET="${TWILIO_API_SECRET}" \
  --from-literal TWILIO_VALIDATE_SIGNATURES="${TWILIO_VALIDATE_SIGNATURES}" \
  --from-literal FLASK_PUBLIC_URL="${FLASK_PUBLIC_URL}" \
  --from-literal DEMO_BUSINESS_ID="${DEMO_BUSINESS_ID}" \
  --from-literal WEBSOCKET_URL="wss://dspatch-ws.29wb2lul59qv.ca-tor.codeengine.appdomain.cloud" \
  --from-literal JWT_SECRET="${JWT_SECRET}" \
  --from-literal FRONTEND_ORIGIN="${FRONTEND_ORIGIN}" \
  --from-literal HUBSPOT_CLIENT_ID="${HUBSPOT_CLIENT_ID}" \
  --from-literal HUBSPOT_CLIENT_SECRET="${HUBSPOT_CLIENT_SECRET}" \
  --from-literal SENDGRID_API_KEY="${SENDGRID_API_KEY}" \
  --from-literal NOTIFY_FROM_EMAIL="${NOTIFY_FROM_EMAIL:-alerts@dspatch.ai}"

IMAGE="docker.io/kobbyadu/dspatch:latest"

# ── Build + push Docker image ─────────────────────────────────────────────────
echo "[deploy] building Docker image..."
docker build -t "$IMAGE" .

echo "[deploy] pushing to Docker Hub..."
docker push "$IMAGE"

# ── Deploy Flask webhook server ───────────────────────────────────────────────
echo "[deploy] deploying Flask app..."
ibmcloud ce app create --name dspatch-flask \
  --image "$IMAGE" \
  --port 5000 \
  --env-from-secret dspatch-env \
  --min-scale 1 \
  --max-scale 3 \
  2>/dev/null || \
ibmcloud ce app update --name dspatch-flask \
  --image "$IMAGE" \
  --env-from-secret dspatch-env

# ── Deploy WebSocket server ───────────────────────────────────────────────────
echo "[deploy] deploying WebSocket server..."
ibmcloud ce app create --name dspatch-ws \
  --image "$IMAGE" \
  --port 8765 \
  --env-from-secret dspatch-env \
  --command python \
  --argument "agent/main.py" \
  --min-scale 1 \
  --max-scale 2 \
  2>/dev/null || \
ibmcloud ce app update --name dspatch-ws \
  --image "$IMAGE" \
  --env-from-secret dspatch-env \
  --command python \
  --argument "agent/main.py"

# ── Print URLs ────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════"
echo " DSPatch deployed on IBM Code Engine"
echo "═══════════════════════════════════════════"

FLASK_URL=$(ibmcloud ce app get --name dspatch-flask --output json 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',{}).get('url',''))" 2>/dev/null)
WS_URL=$(ibmcloud ce app get --name dspatch-ws --output json 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',{}).get('url',''))" 2>/dev/null)

echo " Flask (webhooks): $FLASK_URL"
echo " WebSocket:        ${WS_URL/https/wss}"
echo ""
echo " Twilio SMS webhook → ${FLASK_URL}/sms"
echo " Twilio Voice webhook → ${FLASK_URL}/voice"
echo " Twilio MediaStream → ${WS_URL/https/wss}"
echo "═══════════════════════════════════════════"
echo ""
echo "[deploy] paste the WebSocket URL into .env as WEBSOCKET_URL"
