from db.postgres_client import get_conn

def reset_tokens():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("UPDATE meta_tokens SET status='ACTIVE', cooldown_until=NULL, heartbeat_at=NULL WHERE status != 'INVALID'")
    conn.commit()
    print("✅ All tokens reset to ACTIVE")
    conn.close()

if __name__ == "__main__":
    reset_tokens()
