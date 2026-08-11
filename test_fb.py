import httpx
import time

t0 = time.time()
try:
    res = httpx.post("https://graph.facebook.com/v21.0/test/messages", timeout=5.0)
    print(f"Status: {res.status_code}, Time: {time.time()-t0:.2f}s")
    print(f"Response: {res.text[:100]}")
except Exception as e:
    print(f"Error: {e}, Time: {time.time()-t0:.2f}s")
