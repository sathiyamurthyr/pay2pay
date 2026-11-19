import unittest
import urllib.request
import urllib.error

BASE_FRONTEND_URL = "http://localhost:3000"
BASE_BACKEND_URL = "http://127.0.0.1:8000"

class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

class TestRouteIsolation(unittest.TestCase):
    def setUp(self):
        self.opener = urllib.request.build_opener(NoRedirectHandler)

    def request_path(self, path: str, role: str):
        url = f"{BASE_FRONTEND_URL}{path}"
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0",
            "Cookie": f"p2p_access_token=dev-test-token; p2p_user_role={role}"
        })
        try:
            res = self.opener.open(req)
            return res.getcode(), res.info().get("Location")
        except urllib.error.HTTPError as e:
            return e.code, e.headers.get("Location")

    # 1. RETAILER ACCESS TESTS
    def test_retailer_access_own_dashboard(self):
        code, loc = self.request_path("/retailer/dashboard", "RETAILER")
        self.assertEqual(code, 200)

    def test_retailer_access_own_reports(self):
        code, loc = self.request_path("/retailer/reports/payout-transactions", "RETAILER")
        self.assertEqual(code, 200)

    def test_retailer_blocked_from_sd_dashboard(self):
        code, loc = self.request_path("/sd/dashboard", "RETAILER")
        self.assertEqual(code, 307)
        self.assertTrue(loc.endswith("/retailer/dashboard"))

    def test_retailer_blocked_from_dist_dashboard(self):
        code, loc = self.request_path("/dist/dashboard", "RETAILER")
        self.assertEqual(code, 307)
        self.assertTrue(loc.endswith("/retailer/dashboard"))

    def test_retailer_blocked_from_admin_dashboard(self):
        code, loc = self.request_path("/admin/dashboard", "RETAILER")
        self.assertEqual(code, 307)
        self.assertTrue(loc.endswith("/retailer/dashboard"))

    # 2. SD ACCESS TESTS
    def test_sd_access_own_dashboard(self):
        code, loc = self.request_path("/sd/dashboard", "SD")
        self.assertEqual(code, 200)

    def test_sd_blocked_from_retailer_dashboard(self):
        code, loc = self.request_path("/retailer/dashboard", "SD")
        self.assertEqual(code, 307)
        self.assertTrue(loc.endswith("/sd/dashboard"))

    def test_sd_blocked_from_dist_dashboard(self):
        code, loc = self.request_path("/dist/dashboard", "SD")
        self.assertEqual(code, 307)
        self.assertTrue(loc.endswith("/sd/dashboard"))

    # 3. DIST ACCESS TESTS
    def test_dist_access_own_dashboard(self):
        code, loc = self.request_path("/dist/dashboard", "DIST")
        self.assertEqual(code, 200)

    def test_dist_blocked_from_retailer_dashboard(self):
        code, loc = self.request_path("/retailer/dashboard", "DIST")
        self.assertEqual(code, 307)
        self.assertTrue(loc.endswith("/dist/dashboard"))

    def test_dist_blocked_from_sd_dashboard(self):
        code, loc = self.request_path("/sd/dashboard", "DIST")
        self.assertEqual(code, 307)
        self.assertTrue(loc.endswith("/dist/dashboard"))

    # 4. ADMIN ACCESS TESTS
    def test_admin_access_own_dashboard(self):
        code, loc = self.request_path("/admin/dashboard", "ADMIN")
        self.assertEqual(code, 200)

    def test_admin_blocked_from_retailer_dashboard(self):
        code, loc = self.request_path("/retailer/dashboard", "ADMIN")
        self.assertEqual(code, 307)
        self.assertTrue(loc.endswith("/admin/dashboard"))

    # 5. LEGACY ROUTE REDIRECTS
    def test_legacy_retailer_dashboard_redirect(self):
        code, loc = self.request_path("/retailer-dashboard", "RETAILER")
        self.assertEqual(code, 307)
        self.assertTrue(loc.endswith("/retailer/dashboard"))

    # 6. BACKEND API SCOPING
    def test_backend_retailer_report_scoping(self):
        req = urllib.request.Request(f"{BASE_BACKEND_URL}/api/v1/retailer/reports/payout-transactions", headers={"User-Agent": "Mozilla/5.0"})
        res = urllib.request.urlopen(req)
        self.assertEqual(res.getcode(), 200)

if __name__ == "__main__":
    unittest.main()
