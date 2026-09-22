import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import sqlite3
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token

client = TestClient(app)

# 1. Test Admin Access
conn = sqlite3.connect("backend/aptitude.db")
cur = conn.cursor()
cur.execute("SELECT id, email, role FROM users WHERE role = 'ADMIN' LIMIT 1")
admin = cur.fetchone()
print(f"[*] Testing with Admin: {admin[1]} (role: {admin[2]})")

admin_token = create_access_token(admin[0])

# Get a paid test ID
cur.execute("SELECT id, name, price_inr, is_free FROM tests WHERE is_free = 0 LIMIT 1")
paid_test = cur.fetchone()
print(f"[*] Selected Paid Test: {paid_test[1]} (price: Rs.{paid_test[2]}, is_free: {paid_test[3]})")

import uuid
test_uuid = str(uuid.UUID(paid_test[0]))

# Call start test with Admin token
res = client.post(
    f"/api/v1/tests/{test_uuid}/start",
    headers={"Authorization": f"Bearer {admin_token}"}
)
print("[*] Admin start paid test HTTP status:", res.status_code)
assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
data = res.json()
print(f"[+] SUCCESS! Admin started attempt: {data.get('attempt_id')} with {len(data.get('questions', []))} questions.")

# Check membership status for Admin
res_mem = client.get(
    "/api/v1/users/me/membership",
    headers={"Authorization": f"Bearer {admin_token}"}
)
print("[*] Admin membership status HTTP code:", res_mem.status_code)
assert res_mem.status_code == 200, f"Expected 200, got {res_mem.status_code}: {res_mem.text}"
mem = res_mem.json()
print(f"[+] Admin membership response -> is_subscribed: {mem.get('is_subscribed')}, plan: {mem.get('subscription_plan')}, credits: {mem.get('available_test_credits')}")

# 2. Test Non-Admin Access on Paid Test
import uuid
unpaid_user_id = uuid.uuid4().hex
unpaid_email = f"test_unpaid_{uuid.uuid4().hex[:6]}@example.com"
cur.execute(
    "INSERT INTO users (id, email, role, is_active, free_test_consumed, created_at, updated_at) VALUES (?, ?, 'USER', 1, 0, datetime('now'), datetime('now'))",
    (unpaid_user_id, unpaid_email)
)
conn.commit()
print(f"\n[*] Testing with Unpaid New User: {unpaid_email} (role: USER, credits: 0)")
unpaid_token = create_access_token(unpaid_user_id)

res_user = client.post(
    f"/api/v1/tests/{test_uuid}/start",
    headers={"Authorization": f"Bearer {unpaid_token}"}
)
print("[*] Unpaid user start paid test HTTP status:", res_user.status_code)
assert res_user.status_code == 402, f"Expected 402, got {res_user.status_code}: {res_user.text}"
print("[+] SUCCESS! Unpaid user correctly receives HTTP 402 Payment Required.")

# Cleanup temporary test user
cur.execute("DELETE FROM users WHERE id = ?", (unpaid_user_id,))
conn.commit()

print("\n=======================================================")
print("  ALL ADMIN FREE ACCESS VERIFICATION CHECKS PASSED!    ")
print("=======================================================")
conn.close()
