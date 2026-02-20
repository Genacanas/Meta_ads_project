"""
Token health check — usa el endpoint debug_token de Meta para verificar
el estado real de cada token, en paralelo.

Endpoint: GET /debug_token?input_token=TOKEN&access_token=TOKEN
(Se puede usar el mismo token como access_token para verificarse a sí mismo)
"""
import requests
import json
import concurrent.futures
from datetime import datetime, timezone
from db.postgres_client import get_conn

DEBUG_URL = "https://graph.facebook.com/debug_token"


def test_token(token: str) -> dict:
    """
    Llama a /debug_token para obtener el estado real del token.
    Usa el propio token como access_token (autoverificación).
    """
    params = {
        "input_token": token,
        "access_token": token,
    }
    try:
        resp = requests.get(DEBUG_URL, params=params, timeout=15)
        data = resp.json()

        if "error" in data:
            err = data["error"]
            return {
                "ok": False,
                "is_valid": False,
                "error_code": err.get("code"),
                "error_message": err.get("message", "")[:100],
            }

        d = data.get("data", {})
        expires_at = d.get("expires_at")
        expires_str = None
        if expires_at:
            try:
                dt = datetime.fromtimestamp(expires_at, tz=timezone.utc)
                expires_str = dt.strftime("%Y-%m-%d %H:%M UTC")
            except Exception:
                expires_str = str(expires_at)

        scopes = d.get("scopes", [])
        return {
            "ok": True,
            "is_valid": d.get("is_valid", False),
            "app_id": d.get("app_id"),
            "type": d.get("type"),
            "expires_at": expires_str,
            "expires_at_ts": expires_at,
            "scopes": scopes,
            "error_code": None,
            "error_message": d.get("error", {}).get("message") if isinstance(d.get("error"), dict) else None,
        }
    except requests.exceptions.Timeout:
        return {"ok": False, "is_valid": False, "error_code": "TIMEOUT", "error_message": "Request timed out (15s)"}
    except Exception as e:
        return {"ok": False, "is_valid": False, "error_code": "EXCEPTION", "error_message": str(e)[:100]}


def check_one(row):
    token_id, token, db_status, cooldown_until, last_used_at = row
    result = test_token(token)
    return token_id, token, db_status, cooldown_until, last_used_at, result


def main():
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, token, status, cooldown_until, last_used_at
                FROM meta_tokens
                ORDER BY id
            """)
            tokens = cur.fetchall()
    finally:
        conn.close()

    print(f"\n{'='*80}")
    print(f"TOKEN HEALTH CHECK — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*80}")
    print(f"Found {len(tokens)} token(s). Testing all in parallel (10 at a time)...\n")

    results = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(check_one, row): row[0] for row in tokens}
        for future in concurrent.futures.as_completed(futures):
            token_id, token, db_status, cooldown_until, last_used, result = future.result()
            results[token_id] = (token, db_status, cooldown_until, last_used, result)

    now = datetime.now(timezone.utc)

    valid_count = 0
    invalid_count = 0
    expired_count = 0

    print(f"{'ID':<4} {'TOKEN':<26} {'DB STATUS':<12} {'API VALID':<10} {'EXPIRES':<22} {'COOLDOWN'}")
    print("-" * 100)

    for token_id in sorted(results.keys()):
        token, db_status, cooldown_until, last_used, result = results[token_id]
        token_preview = token[:14] + "..." + token[-6:]

        # Cooldown info
        if cooldown_until:
            if cooldown_until.tzinfo is None:
                cooldown_until = cooldown_until.replace(tzinfo=timezone.utc)
            remaining = (cooldown_until - now).total_seconds()
            cooldown_str = f"{int(remaining)}s left" if remaining > 0 else "EXPIRED"
        else:
            cooldown_str = "—"

        # API result
        if not result["ok"]:
            api_str = f"❌ ERR({result['error_code']})"
            expires_str = "—"
        elif not result["is_valid"]:
            api_str = "❌ INVALID"
            expires_str = result.get("expires_at") or "—"
            invalid_count += 1
        else:
            # Check if expired
            exp_ts = result.get("expires_at_ts")
            if exp_ts and exp_ts < now.timestamp():
                api_str = "⏰ EXPIRED"
                expired_count += 1
            else:
                api_str = "✅ VALID"
                valid_count += 1
            expires_str = result.get("expires_at") or "never"

        print(f"{token_id:<4} {token_preview:<26} {db_status:<12} {api_str:<10} {expires_str:<22} {cooldown_str}")

        # Show error detail if any
        if result.get("error_message"):
            print(f"     ↳ {result['error_message']}")

    print("-" * 100)
    print(f"\nSUMMARY: ✅ {valid_count} valid  |  ❌ {invalid_count} invalid  |  ⏰ {expired_count} expired  |  total: {len(tokens)}")
    print(f"{'='*80}\n")


if __name__ == "__main__":
    main()
