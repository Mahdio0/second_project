import argparse
import sys

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
    pass


def hunt_js_obfuscation(url):
    """Hunt for obfuscated JavaScript files and attempt to decode them."""
    pass


def recursive_decode(data):
    """Recursively decode encoded strings (base64, hex, URL-encoding, etc.).

    TODO: Implement multi-layer decoding logic.
    """
    pass


def parse_jwt_cookies(url):
    """Parse cookies set by the target, decode JWT tokens if present."""
    pass


def fuzz_trope_files(url):
    """Fuzz the target for common CTF trope paths (robots.txt, .git/, etc.)."""
    pass


def snoop_headers(url):
    """Retrieve and display interesting HTTP response headers."""
    pass


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
