# yip.is

A fast, clean IP address lookup service built with Cloudflare Workers. Based on ip.now. As of Nov 2025, ip.now is no longer available. 

## Features

- **Instant IP Lookup**: See your public IP address immediately
- **Command Line Support**: Simple `curl yip.is` for quick terminal access
- **WHOIS Information**: Query any IP address or domain name
- **JSON API**: `/details` endpoint for programmatic access
- **Modern UI**: Clean interface with dark mode support
- **Device Detection**: Automatically detects browser and operating system
- **Privacy-Focused**: No tracking, no ads, no registration required

## Usage

### Browser

Simply visit [yip.is](https://yip.is) to see your IP address. Click to copy to clipboard.

### Terminal

```bash
curl yip.is
```

Get detailed information in JSON format:

```bash
curl yip.is/details
```

### WHOIS Lookup

Query information about any IP address or domain:

```bash
curl yip.is/1.1.1.1
curl yip.is/google.com
```

### Copy to Clipboard

**macOS:**
```bash
curl yip.is | pbcopy
```

**Linux:**
```bash
curl yip.is | xclip -selection clipboard
```

**Windows PowerShell:**
```powershell
curl yip.is | Set-Clipboard
```

## Development

This project is built with Cloudflare Workers and requires:

- Node.js 18+
- Cloudflare account with Workers enabled

### Setup

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Deploy to Cloudflare
npm run deploy
```

## API Endpoints

- `GET /` - Returns your IP address (plain text for curl, HTML for browsers)
- `GET /details` - Returns detailed information about your connection (JSON)
- `GET /{ip-or-domain}` - Returns WHOIS information for the specified IP or domain (JSON)
- `GET /api` - API documentation with examples
- `GET /health` - Health check endpoint for monitoring

All JSON endpoints support CORS and can be used from any domain.

## Technology Stack

- **Runtime**: Cloudflare Workers
- **Language**: TypeScript
- **Bundler**: Wrangler
- **External APIs**:
  - ip-api.com for geolocation
  - RDAP for domain registration details

## License

See LICENSE file for details.
