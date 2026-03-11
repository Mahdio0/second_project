import argparse
import base64
import re
import sys
import urllib.parse

import requests
from bs4 import BeautifulSoup, Comment
from colorama import Fore, Style, init

init(autoreset=True)

BANNER = r"""
 ______     ______     ______     __     __     __        
/\  ___\   /\  == \   /\  __ \   /\ \  _ \ \   /\ \       
\ \ \____  \ \  __<   \ \  __ \  \ \ \/ ".\ \  \ \ \____  
 \ \_____\  \ \_\ \_\  \ \_\ \_\  \ \__/".~\_\  \ \_____\ 
  \/_____/   \/_/ /_/   \/_/\/_/   \/_/   \/_/   \/_____/ 
"""

VERSION = "v1.0.0"

# Max characters to store per JS snippet; display is trimmed further below
_JS_SNIPPET_STORE = 200
_JS_SNIPPET_DISPLAY = 120


def print_banner():
    print(Fore.CYAN + BANNER)
    print(Fore.CYAN + Style.BRIGHT + f"  {VERSION}")
    print(Style.RESET_ALL)


def build_parser():
    parser = argparse.ArgumentParser(
        prog="crawl",
        description="CRAWL - CTF Recon And Web Locator\n"
                    "A fast, lightweight web scraper for the first 5 minutes of a CTF web challenge.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "-u", "--url",
        metavar="URL",
        help="Target URL (e.g. http://target.com)",
    )
    parser.add_argument(
        "--comments",
        action="store_true",
        help="Extract HTML comments from the target page",
    )
    parser.add_argument(
        "--js",
        action="store_true",
        help="Hunt for obfuscated JavaScript and decode it",
    )
    parser.add_argument(
        "--cookies",
        action="store_true",
        help="Parse and decode cookies (including JWT tokens)",
    )
    parser.add_argument(
        "--fuzz",
        action="store_true",
        help="Fuzz for common CTF trope files (robots.txt, .git, etc.)",
    )
    parser.add_argument(
        "--headers",
        action="store_true",
        help="Snoop HTTP response headers for interesting data",
    )
    return parser


# ---------------------------------------------------------------------------
# Core feature placeholders
# ---------------------------------------------------------------------------

def extract_comments(url):
    """Extract HTML comments from the target page."""
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
    except requests.RequestException as e:
        print(Fore.RED + f"[!] Request failed: {e}")
        return

    soup = BeautifulSoup(response.text, "html.parser")
    comments = soup.find_all(string=lambda text: isinstance(text, Comment))

    if not comments:
        print(Fore.YELLOW + "[~] No HTML comments found.")
        return

    print(Fore.GREEN + f"[+] Found {len(comments)} HTML comment(s):")
    for i, comment in enumerate(comments, 1):
        print(Fore.WHITE + f"  [{i}] {comment.strip()}")


def hunt_js_obfuscation(url):
    """Hunt for obfuscated JavaScript files and attempt to decode them."""
    OBFUSCATION_PATTERNS = [
        (r"eval\s*\(", "eval()"),
        (r"atob\s*\(", "atob()"),
        (r"unescape\s*\(", "unescape()"),
        (r"String\.fromCharCode\s*\(", "String.fromCharCode()"),
        (r"\\x[0-9a-fA-F]{2}", "hex escape sequences"),
        (r"\\u[0-9a-fA-F]{4}", "unicode escape sequences"),
        (r"[A-Za-z0-9+/]{40,}={0,2}", "possible base64 payload"),
    ]

    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
    except requests.RequestException as e:
        print(Fore.RED + f"[!] Request failed: {e}")
        return

    soup = BeautifulSoup(response.text, "html.parser")
    scripts = soup.find_all("script")

    # Also check linked JS files
    js_urls = []
    for tag in scripts:
        src = tag.get("src")
        if src:
            js_urls.append(src if src.startswith("http") else url.rstrip("/") + "/" + src.lstrip("/"))

    inline_scripts = [tag.string for tag in scripts if tag.string]

    findings = []

    for idx, code in enumerate(inline_scripts, 1):
        for pattern, label in OBFUSCATION_PATTERNS:
            if re.search(pattern, code):
                findings.append((f"inline script #{idx}", label, code[:_JS_SNIPPET_STORE]))
                break

    for js_url in js_urls:
        try:
            js_resp = requests.get(js_url, timeout=10)
            code = js_resp.text
            for pattern, label in OBFUSCATION_PATTERNS:
                if re.search(pattern, code):
                    findings.append((js_url, label, code[:_JS_SNIPPET_STORE]))
                    break
        except requests.RequestException:
            pass

    if not findings:
        print(Fore.YELLOW + "[~] No obfuscated JavaScript detected.")
        return

    print(Fore.GREEN + f"[+] Possible obfuscation in {len(findings)} location(s):")
    for location, label, snippet in findings:
        print(Fore.WHITE + f"  [!] {location}  —  pattern: {label}")
        print(Fore.CYAN + f"      Snippet: {snippet.strip()[:_JS_SNIPPET_DISPLAY]}")


def recursive_decode(data, depth=0, max_depth=10):
    """Recursively decode encoded strings (base64, hex, URL-encoding, etc.)."""
    if depth >= max_depth or not data:
        return data

    # URL decode
    url_decoded = urllib.parse.unquote(data)
    if url_decoded != data:
        return recursive_decode(url_decoded, depth + 1, max_depth)

    # Hex decode: 0x… or plain hex string (even length, only hex chars)
    hex_match = re.fullmatch(r"(?:0x)?([0-9a-fA-F]{2,})", data.strip())
    if hex_match and len(hex_match.group(1)) % 2 == 0:
        try:
            decoded = bytes.fromhex(hex_match.group(1)).decode("utf-8", errors="strict")
            return recursive_decode(decoded, depth + 1, max_depth)
        except (ValueError, UnicodeDecodeError):
            pass

    # Base64 decode
    try:
        padded = data + "=" * (-len(data) % 4)
        decoded = base64.b64decode(padded).decode("utf-8", errors="strict")
        if decoded != data and all(c.isprintable() or c in "\n\r\t" for c in decoded):
            return recursive_decode(decoded, depth + 1, max_depth)
    except Exception:
        pass

    return data


def parse_jwt_cookies(url):
    """Parse cookies set by the target, decode JWT tokens if present."""
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
    except requests.RequestException as e:
        print(Fore.RED + f"[!] Request failed: {e}")
        return

    cookies = response.cookies
    if not cookies:
        print(Fore.YELLOW + "[~] No cookies found.")
        return

    print(Fore.GREEN + f"[+] Found {len(cookies)} cookie(s):")
    for cookie in cookies:
        print(Fore.WHITE + f"  Name : {cookie.name}")
        print(Fore.WHITE + f"  Value: {cookie.value}")

        # Check for JWT (three base64url-encoded parts separated by '.')
        parts = cookie.value.split(".")
        if len(parts) == 3:
            print(Fore.CYAN + "  [JWT detected]")
            for idx, part in enumerate(parts[:2]):  # header + payload only
                # base64url → base64
                padded = part.replace("-", "+").replace("_", "/") + "=" * (-len(part) % 4)
                try:
                    decoded = base64.b64decode(padded).decode("utf-8", errors="replace")
                    label = ["Header", "Payload"][idx]
                    print(Fore.CYAN + f"    {label}: {decoded}")
                except Exception:
                    pass
        else:
            # Try generic recursive decode
            decoded = recursive_decode(cookie.value)
            if decoded != cookie.value:
                print(Fore.CYAN + f"  Decoded: {decoded}")
        print()


def fuzz_trope_files(url):
    """Fuzz the target for common CTF trope paths (robots.txt, .git/, etc.)."""
    TROPE_PATHS = [
        "robots.txt",
        ".git/HEAD",
        ".git/config",
        ".env",
        "sitemap.xml",
        "crossdomain.xml",
        "phpinfo.php",
        "config.php",
        "admin/",
        "admin.php",
        "login.php",
        "backup.zip",
        "backup.tar.gz",
        "flag.txt",
        "secret.txt",
        "notes.txt",
        "TODO",
        ".htaccess",
        "web.config",
        "package.json",
        "composer.json",
        "Dockerfile",
        ".DS_Store",
    ]

    base = url.rstrip("/")
    found = []

    print(Fore.CYAN + f"[*] Fuzzing {len(TROPE_PATHS)} common CTF paths...")
    for path in TROPE_PATHS:
        target = f"{base}/{path}"
        try:
            resp = requests.get(target, timeout=6, allow_redirects=False)
            if resp.status_code == 200:
                print(Fore.GREEN + f"  [200] {target}")
                found.append(target)
            elif resp.status_code in (301, 302):
                print(Fore.YELLOW + f"  [{resp.status_code}] {target}  (redirect)")
                found.append(target)
            elif resp.status_code == 403:
                print(Fore.YELLOW + f"  [403] {target}  (forbidden — exists but restricted)")
                found.append(target)
        except requests.RequestException:
            pass

    if not found:
        print(Fore.YELLOW + "[~] No interesting paths found.")


def snoop_headers(url):
    """Retrieve and display interesting HTTP response headers."""
    INTERESTING = {
        "server", "x-powered-by", "x-frame-options", "content-security-policy",
        "strict-transport-security", "x-content-type-options", "access-control-allow-origin",
        "set-cookie", "location", "x-flag", "flag", "x-secret", "x-hint",
    }

    try:
        response = requests.get(url, timeout=10)
    except requests.RequestException as e:
        print(Fore.RED + f"[!] Request failed: {e}")
        return

    headers = response.headers

    print(Fore.GREEN + f"[+] HTTP {response.status_code} — {len(headers)} header(s) received:")
    for name, value in headers.items():
        color = Fore.CYAN if name.lower() in INTERESTING else Fore.WHITE
        print(color + f"  {name}: {value}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    print_banner()

    # If no arguments are given, print help and exit
    if len(sys.argv) == 1:
        build_parser().print_help()
        sys.exit(0)

    parser = build_parser()
    args = parser.parse_args()

    if not args.url:
        parser.error("argument -u/--url is required")

    url = args.url

    if args.comments:
        extract_comments(url)

    if args.js:
        hunt_js_obfuscation(url)

    if args.cookies:
        parse_jwt_cookies(url)

    if args.fuzz:
        fuzz_trope_files(url)

    if args.headers:
        snoop_headers(url)


if __name__ == "__main__":
    main()
