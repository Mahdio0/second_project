```
   _____ ______  ___  _    _ _     
  /  __ \| ___ \/ _ \| |  | | |    
  | /  \/| |_/ / /_\ \ |  | | |    
  | |    |    /|  _  | |/\| | |    
  | \__/\| |\ \| | | \  /\  / |____
   \____/\_| \_\_| |_/\/  \/\_____/
  
   CRAWL v1.2.0 (CTF Recon)
   |   |      |      |
   | +--+ +--+ +--+ +-+
   | |A | | |A| | | |A| | | |
   | +--+ +--+ +--+ +-+
   |   |      |      |
   V   V      V      V
```

> The logo above features a stylized character 'A' with integrated insect wings and a spider body. The entire word 'CRAWL' is integrated with web strands.

# CRAWL — CTF Recon And Web Locator

**v1.2.0**

A fast, lightweight web scraper for the first 5 minutes of a CTF web challenge.

---

## Features

| Flag | Function | Description |
|------|----------|-------------|
| `--comments` | `extract_comments()` | Extract hidden HTML comments from the target page |
| `--deep-scan` | `deep_scan()` | **Deep Source Code Extraction & Auto-Decoding** — Parses the entire raw source code of the target page, including all HTML, linked JavaScript, and CSS files. Uses Regex to hunt for encoded patterns (Base64, Hex, Binary, URL Encoded, etc.) and recursively decodes them until readable text or a recognized flag pattern (like `CTF{...}`) appears. Clearly lists all decoded data and the file it was found in, highlighting potential high-value findings. Usage: `crawl -u target.com --deep-scan` |
| `--js` | `hunt_js_obfuscation()` | Detect and decode obfuscated JavaScript |
| `--cookies` | `parse_jwt_cookies()` | Parse cookies and decode JWT tokens |
| `--fuzz` | `fuzz_trope_files()` | Fuzz for common CTF trope paths (robots.txt, .git/, etc.) |
| `--headers` | `snoop_headers()` | Inspect HTTP response headers for hidden data |

---

## Installation

### Option 1 — pip (standard)

```bash
git clone https://github.com/Mahdio0/second_project.git
cd second_project
pip install .
```

### Option 2 — pipx (recommended for global install without polluting the system Python)

```bash
git clone https://github.com/Mahdio0/second_project.git
cd second_project
pipx install .
```

After installation, the `crawl` command is available globally:

```bash
crawl --help
```

---

## Usage

```
crawl -u <URL> [OPTIONS]
```

### Arguments

| Argument | Description |
|----------|-------------|
| `-u`, `--url` | **(Required)** Target URL |
| `--comments` | Extract HTML comments |
| `--deep-scan` | Deep source code extraction & auto-decoding (Base64, Hex, Binary, URL Encoded, etc.) |
| `--js` | Hunt for obfuscated JS |
| `--cookies` | Parse / decode cookies and JWTs |
| `--fuzz` | Fuzz common CTF trope files |
| `--headers` | Snoop HTTP response headers |

### Examples

```bash
# Run all recon modules at once
crawl -u http://target.com --comments --js --cookies --fuzz --headers

# Deep source code extraction and auto-decoding
crawl -u http://target.com --deep-scan

# Quick fuzz + JS check
crawl -u http://target.com --fuzz --js

# Just check headers and cookies
crawl -u http://target.com --headers --cookies

# Print the banner and help menu
crawl
```

---

## Requirements

- Python 3.7+
- `requests`
- `beautifulsoup4`
- `colorama`
- `PyExecJS`

Install dependencies manually:

```bash
pip install -r requirements.txt
```

---

## License

MIT