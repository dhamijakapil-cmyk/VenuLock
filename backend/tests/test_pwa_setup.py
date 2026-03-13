"""
PWA Setup Tests - VenuLoQ PWA Configuration Verification
Tests manifest.json, service worker, icons, splash screens, and meta tags
"""
import pytest
import requests
import os
from bs4 import BeautifulSoup

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestManifestJson:
    """Test manifest.json PWA configuration"""
    
    def test_manifest_loads_successfully(self):
        """Manifest file should load with HTTP 200"""
        response = requests.get(f"{BASE_URL}/manifest.json", timeout=10)
        assert response.status_code == 200, f"Manifest failed to load: {response.status_code}"
        print("✓ manifest.json loads with HTTP 200")
    
    def test_manifest_name_venuloq(self):
        """Manifest name should be 'VenuLoQ'"""
        response = requests.get(f"{BASE_URL}/manifest.json", timeout=10)
        data = response.json()
        assert data.get('name') == 'VenuLoQ', f"Expected name='VenuLoQ', got '{data.get('name')}'"
        print("✓ manifest.json name='VenuLoQ'")
    
    def test_manifest_short_name_venuloq(self):
        """Manifest short_name should be 'VenuLoQ'"""
        response = requests.get(f"{BASE_URL}/manifest.json", timeout=10)
        data = response.json()
        assert data.get('short_name') == 'VenuLoQ', f"Expected short_name='VenuLoQ', got '{data.get('short_name')}'"
        print("✓ manifest.json short_name='VenuLoQ'")
    
    def test_manifest_display_standalone(self):
        """Manifest display should be 'standalone'"""
        response = requests.get(f"{BASE_URL}/manifest.json", timeout=10)
        data = response.json()
        assert data.get('display') == 'standalone', f"Expected display='standalone', got '{data.get('display')}'"
        print("✓ manifest.json display='standalone'")
    
    def test_manifest_start_url_root(self):
        """Manifest start_url should be '/'"""
        response = requests.get(f"{BASE_URL}/manifest.json", timeout=10)
        data = response.json()
        assert data.get('start_url') == '/', f"Expected start_url='/', got '{data.get('start_url')}'"
        print("✓ manifest.json start_url='/'")
    
    def test_manifest_theme_color(self):
        """Manifest theme_color should be '#0b0b0f'"""
        response = requests.get(f"{BASE_URL}/manifest.json", timeout=10)
        data = response.json()
        assert data.get('theme_color') == '#0b0b0f', f"Expected theme_color='#0b0b0f', got '{data.get('theme_color')}'"
        print("✓ manifest.json theme_color='#0b0b0f'")
    
    def test_manifest_background_color(self):
        """Manifest background_color should be '#0b0b0f'"""
        response = requests.get(f"{BASE_URL}/manifest.json", timeout=10)
        data = response.json()
        assert data.get('background_color') == '#0b0b0f', f"Expected background_color='#0b0b0f', got '{data.get('background_color')}'"
        print("✓ manifest.json background_color='#0b0b0f'")
    
    def test_manifest_has_11_icons(self):
        """Manifest should have exactly 11 icons"""
        response = requests.get(f"{BASE_URL}/manifest.json", timeout=10)
        data = response.json()
        icons = data.get('icons', [])
        assert len(icons) == 11, f"Expected 11 icons, got {len(icons)}"
        print(f"✓ manifest.json has {len(icons)} icons")
    
    def test_manifest_icon_sizes(self):
        """Manifest should include all required icon sizes"""
        response = requests.get(f"{BASE_URL}/manifest.json", timeout=10)
        data = response.json()
        icons = data.get('icons', [])
        sizes = [icon.get('sizes') for icon in icons]
        required_sizes = ['48x48', '72x72', '96x96', '128x128', '144x144', '152x152', '192x192', '192x192', '384x384', '512x512', '512x512']
        for size in required_sizes:
            assert size in sizes, f"Missing icon size: {size}"
        print("✓ manifest.json has all required icon sizes")


class TestServiceWorker:
    """Test service worker setup"""
    
    def test_service_worker_file_loads(self):
        """Service worker file should load with HTTP 200"""
        response = requests.get(f"{BASE_URL}/sw.js", timeout=10)
        assert response.status_code == 200, f"Service worker failed to load: {response.status_code}"
        print("✓ sw.js loads with HTTP 200")
    
    def test_service_worker_content(self):
        """Service worker should have caching logic"""
        response = requests.get(f"{BASE_URL}/sw.js", timeout=10)
        content = response.text
        assert 'CACHE_NAME' in content, "sw.js missing CACHE_NAME"
        assert 'install' in content, "sw.js missing install event listener"
        assert 'fetch' in content, "sw.js missing fetch event listener"
        print("✓ sw.js has proper caching logic")


class TestIconFiles:
    """Test all 11 icon files serve correctly"""
    
    @pytest.mark.parametrize("icon_file", [
        "icon-48.png",
        "icon-72.png",
        "icon-96.png",
        "icon-128.png",
        "icon-144.png",
        "icon-152.png",
        "icon-192.png",
        "icon-maskable-192.png",
        "icon-384.png",
        "icon-512.png",
        "icon-maskable-512.png",
    ])
    def test_icon_file_serves(self, icon_file):
        """Each icon file should serve with HTTP 200"""
        response = requests.get(f"{BASE_URL}/{icon_file}", timeout=10)
        assert response.status_code == 200, f"{icon_file} failed to load: {response.status_code}"
        assert 'image/png' in response.headers.get('Content-Type', ''), f"{icon_file} not serving as PNG"
        print(f"✓ {icon_file} serves correctly (HTTP 200, PNG)")
    
    def test_apple_touch_icon_serves(self):
        """apple-touch-icon.png should serve correctly"""
        response = requests.get(f"{BASE_URL}/apple-touch-icon.png", timeout=10)
        assert response.status_code == 200, f"apple-touch-icon.png failed to load: {response.status_code}"
        print("✓ apple-touch-icon.png serves correctly")


class TestSplashScreens:
    """Test all 6 Apple splash screen images"""
    
    @pytest.mark.parametrize("splash_file", [
        "splash-iphone-8.png",
        "splash-iphone-x.png",
        "splash-iphone-13.png",
        "splash-iphone-13-pro-max.png",
        "splash-iphone-14-pro.png",
        "splash-iphone-14-pro-max.png",
    ])
    def test_splash_screen_serves(self, splash_file):
        """Each splash screen should serve with HTTP 200"""
        response = requests.get(f"{BASE_URL}/{splash_file}", timeout=10)
        assert response.status_code == 200, f"{splash_file} failed to load: {response.status_code}"
        assert 'image/png' in response.headers.get('Content-Type', ''), f"{splash_file} not serving as PNG"
        print(f"✓ {splash_file} serves correctly (HTTP 200, PNG)")


class TestHtmlMetaTags:
    """Test HTML meta tags for PWA"""
    
    @pytest.fixture
    def html_content(self):
        """Fetch and parse the index HTML"""
        response = requests.get(f"{BASE_URL}/", timeout=10)
        return BeautifulSoup(response.text, 'html.parser')
    
    def test_apple_mobile_web_app_capable(self, html_content):
        """HTML should have apple-mobile-web-app-capable='yes'"""
        meta = html_content.find('meta', attrs={'name': 'apple-mobile-web-app-capable'})
        assert meta is not None, "Missing apple-mobile-web-app-capable meta tag"
        assert meta.get('content') == 'yes', f"Expected content='yes', got '{meta.get('content')}'"
        print("✓ apple-mobile-web-app-capable='yes' meta tag present")
    
    def test_apple_mobile_web_app_status_bar_style(self, html_content):
        """HTML should have apple-mobile-web-app-status-bar-style='black-translucent'"""
        meta = html_content.find('meta', attrs={'name': 'apple-mobile-web-app-status-bar-style'})
        assert meta is not None, "Missing apple-mobile-web-app-status-bar-style meta tag"
        assert meta.get('content') == 'black-translucent', f"Expected content='black-translucent', got '{meta.get('content')}'"
        print("✓ apple-mobile-web-app-status-bar-style='black-translucent' meta tag present")
    
    def test_apple_mobile_web_app_title(self, html_content):
        """HTML should have apple-mobile-web-app-title='VenuLoQ'"""
        meta = html_content.find('meta', attrs={'name': 'apple-mobile-web-app-title'})
        assert meta is not None, "Missing apple-mobile-web-app-title meta tag"
        assert meta.get('content') == 'VenuLoQ', f"Expected content='VenuLoQ', got '{meta.get('content')}'"
        print("✓ apple-mobile-web-app-title='VenuLoQ' meta tag present")
    
    def test_theme_color_meta(self, html_content):
        """HTML should have theme-color='#0b0b0f'"""
        meta = html_content.find('meta', attrs={'name': 'theme-color'})
        assert meta is not None, "Missing theme-color meta tag"
        assert meta.get('content') == '#0b0b0f', f"Expected content='#0b0b0f', got '{meta.get('content')}'"
        print("✓ theme-color='#0b0b0f' meta tag present")
    
    def test_manifest_link_present(self, html_content):
        """HTML should have link to manifest.json"""
        link = html_content.find('link', attrs={'rel': 'manifest'})
        assert link is not None, "Missing manifest link in HTML"
        assert 'manifest.json' in link.get('href', ''), f"Manifest link incorrect: {link.get('href')}"
        print("✓ manifest.json link present in HTML")
    
    def test_apple_touch_icon_link_present(self, html_content):
        """HTML should have apple-touch-icon link"""
        link = html_content.find('link', attrs={'rel': 'apple-touch-icon'})
        assert link is not None, "Missing apple-touch-icon link in HTML"
        print("✓ apple-touch-icon link present in HTML")
    
    def test_splash_screen_links_present(self, html_content):
        """HTML should have 6 apple-touch-startup-image links"""
        links = html_content.find_all('link', attrs={'rel': 'apple-touch-startup-image'})
        assert len(links) >= 6, f"Expected at least 6 splash screen links, found {len(links)}"
        print(f"✓ {len(links)} apple-touch-startup-image links present in HTML")


class TestServiceWorkerRegistration:
    """Test service worker registration script in HTML"""
    
    def test_sw_registration_script_present(self):
        """HTML should have service worker registration script"""
        response = requests.get(f"{BASE_URL}/", timeout=10)
        html = response.text
        assert "navigator.serviceWorker.register" in html, "Missing SW registration script"
        assert "sw.js" in html, "SW registration not pointing to sw.js"
        print("✓ Service worker registration script present in HTML")


class TestAppFunctionality:
    """Test app still loads and functions after PWA changes"""
    
    def test_app_loads_successfully(self):
        """App homepage should load with HTTP 200"""
        response = requests.get(f"{BASE_URL}/", timeout=10)
        assert response.status_code == 200, f"Homepage failed to load: {response.status_code}"
        print("✓ App homepage loads with HTTP 200")
    
    def test_api_health_check(self):
        """API should be accessible"""
        response = requests.get(f"{BASE_URL}/api/", timeout=10)
        # Either 200 or redirect/other valid response
        assert response.status_code < 500, f"API error: {response.status_code}"
        print(f"✓ API accessible (status: {response.status_code})")
    
    def test_login_endpoint_exists(self):
        """Login endpoint should be accessible"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "democustomer@venulock.in", "password": "password123"},
            timeout=10
        )
        # Should get 200 on successful login or 401 on invalid credentials
        assert response.status_code in [200, 201, 401, 422], f"Login endpoint error: {response.status_code}"
        print(f"✓ Login endpoint accessible (status: {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
