#!/usr/bin/env bash
# Smoke-tests the Cortex API end to end.
# Usage:  bash scripts/smoke-test.sh  [API_BASE]
# Requires the server to be running (npm --prefix server run dev).

set -u
API="${1:-http://localhost:5001}"
JAR="$(mktemp)"
EMAIL="smoke+$(date +%s)@example.com"
PASS="supersecret123"

pass() { printf '  \033[32mPASS\033[0m %s\n' "$1"; }
fail() { printf '  \033[31mFAIL\033[0m %s\n     response: %s\n' "$1" "$2"; FAILED=1; }
FAILED=0

# call METHOD PATH [JSON_BODY] -> body in $BODY, status in $CODE
call() {
  local method="$1" path="$2" body="${3:-}"
  local out
  if [ -n "$body" ]; then
    out=$(curl -sS -w '\n%{http_code}' -X "$method" "$API$path" \
      -H 'Content-Type: application/json' -c "$JAR" -b "$JAR" -d "$body")
  else
    out=$(curl -sS -w '\n%{http_code}' -X "$method" "$API$path" -c "$JAR" -b "$JAR")
  fi
  CODE="${out##*$'\n'}"
  BODY="${out%$'\n'*}"
}

# Pulls a top-level string field out of a JSON object without needing jq.
json_field() {
  printf '%s' "$1" | node -e "
    let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{
      try{const o=JSON.parse(s);process.stdout.write(String(o['$2']??''))}catch{process.stdout.write('')}
    })"
}

echo "Testing $API"
echo

echo "health"
call GET /api/health
[ "$CODE" = "200" ] && pass "GET /api/health" || fail "GET /api/health ($CODE)" "$BODY"

echo "auth"
call POST /api/auth/register "{\"name\":\"Smoke Test\",\"email\":\"$EMAIL\",\"password\":\"$PASS\"}"
[ "$CODE" = "201" ] && pass "register" || fail "register ($CODE)" "$BODY"

call GET /api/auth/me
[ "$CODE" = "200" ] && pass "me (cookie session works)" || fail "me ($CODE)" "$BODY"

call POST /api/auth/login "{\"email\":\"$EMAIL\",\"password\":\"wrongpassword\"}"
[ "$CODE" = "401" ] && pass "login rejects a bad password" || fail "bad password should 401 (got $CODE)" "$BODY"

call POST /api/auth/login "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}"
[ "$CODE" = "200" ] && pass "login" || fail "login ($CODE)" "$BODY"

echo "workspaces"
call GET /api/workspaces
[ "$CODE" = "200" ] && pass "list workspaces (default one created at register)" || fail "list workspaces ($CODE)" "$BODY"

call POST /api/workspaces '{"name":"Smoke workspace"}'
WS_ID=$(json_field "$BODY" _id)
[ "$CODE" = "201" ] && [ -n "$WS_ID" ] && pass "create workspace" || fail "create workspace ($CODE)" "$BODY"

echo "canvases"
call POST /api/canvases "{\"name\":\"Smoke canvas\",\"workspace\":\"$WS_ID\"}"
CV_ID=$(json_field "$BODY" _id)
[ "$CODE" = "201" ] && [ -n "$CV_ID" ] && pass "create canvas" || fail "create canvas ($CODE)" "$BODY"

call GET "/api/canvases?workspace=$WS_ID"
[ "$CODE" = "200" ] && pass "list canvases in workspace" || fail "list canvases ($CODE)" "$BODY"

call PUT "/api/canvases/$CV_ID" '{"name":"Renamed canvas","viewport":{"x":120,"y":-40,"zoom":1.5}}'
[ "$CODE" = "200" ] && pass "update canvas name + viewport" || fail "update canvas ($CODE)" "$BODY"

call GET "/api/canvases/$CV_ID"
[ "$CODE" = "200" ] && pass "fetch canvas" || fail "fetch canvas ($CODE)" "$BODY"

echo "authorization"
OTHER="$(mktemp)"
curl -sS -X POST "$API/api/auth/register" -H 'Content-Type: application/json' \
  -c "$OTHER" -d "{\"name\":\"Intruder\",\"email\":\"intruder+$(date +%s)@example.com\",\"password\":\"$PASS\"}" >/dev/null
CODE=$(curl -sS -o /dev/null -w '%{http_code}' -b "$OTHER" "$API/api/canvases/$CV_ID")
[ "$CODE" = "404" ] && pass "another user cannot read this canvas" || fail "cross-user read should 404 (got $CODE)" ""
CODE=$(curl -sS -o /dev/null -w '%{http_code}' "$API/api/canvases")
[ "$CODE" = "401" ] && pass "unauthenticated request is rejected" || fail "no-cookie request should 401 (got $CODE)" ""
rm -f "$OTHER"

echo "cleanup"
call DELETE "/api/canvases/$CV_ID"
[ "$CODE" = "200" ] && pass "delete canvas" || fail "delete canvas ($CODE)" "$BODY"

call DELETE "/api/workspaces/$WS_ID"
[ "$CODE" = "200" ] && pass "delete workspace" || fail "delete workspace ($CODE)" "$BODY"

call POST /api/auth/logout
[ "$CODE" = "200" ] && pass "logout" || fail "logout ($CODE)" "$BODY"

call GET /api/auth/me
[ "$CODE" = "401" ] && pass "session is gone after logout" || fail "me should 401 after logout (got $CODE)" "$BODY"

rm -f "$JAR"
echo
if [ "$FAILED" = "0" ]; then
  printf '\033[32mAll checks passed.\033[0m Test user was %s\n' "$EMAIL"
else
  printf '\033[31mSome checks failed.\033[0m See output above.\n'; exit 1
fi
