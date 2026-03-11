```
 ______     ______     ______     __     __     __        
/\  ___\   /\  == \   /\  __ \   /\ \  _ \ \   /\ \       
\ \ \____  \ \  __<   \ \  __ \  \ \ \/ ".\ \  \ \ \____  
 \ \_____\  \ \_\ \_\  \ \_\ \_\  \ \__/".~\_\  \ \_____\ 
  \/_____/   \/_/ /_/   \/_/\/_/   \/_/   \/_/   \/_____/ 
```

# CRAWL — CTF Recon And Web Locator

**v1.0.0**

A fast, lightweight web scraper for the first 5 minutes of a CTF web challenge.

---

## Features

| Flag | Function | Description |
|------|----------|-------------|
| `--comments` | `extract_comments()` | Extract hidden HTML comments from the target page |
| `--js` | `hunt_js_obfuscation()` | Detect and decode obfuscated JavaScript |
| `--cookies` | `parse_jwt_cookies()` | Parse cookies and decode JWT tokens |
| `--fuzz` | `fuzz_trope_files()` | Fuzz for common CTF trope paths (robots.txt, .git/, etc.) |
| `--headers` | `snoop_headers()` | Inspect HTTP response headers for hidden data |

---

## Installation

### Option 1 — pip (standard)

```bash
git clone https://github.com/Mahdio0/CRAWL.git
cd CRAWL
pip install .
```

### Option 2 — pipx (recommended for global install without polluting the system Python)

```bash
git clone https://github.com/Mahdio0/CRAWL.git
cd CRAWL
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
| `--js` | Hunt for obfuscated JS |
| `--cookies` | Parse / decode cookies and JWTs |
| `--fuzz` | Fuzz common CTF trope files |
| `--headers` | Snoop HTTP response headers |

### Examples

```bash
# Run all recon modules at once
crawl -u http://target.com --comments --js --cookies --fuzz --headers

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