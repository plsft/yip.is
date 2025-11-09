# Deploying yip.is to Cloudflare Workers

This guide will walk you through deploying yip.is to Cloudflare Workers.

## Prerequisites

1. **Node.js 18 or higher** - [Download here](https://nodejs.org/)
2. **A Cloudflare account** - [Sign up for free](https://dash.cloudflare.com/sign-up)
3. **A domain registered with Cloudflare** (or transferred to Cloudflare DNS)
4. **Cloudflare Workers plan**:
   - Free tier: 100,000 requests/day
   - Paid plan ($5/month): 10 million requests/month + additional features

## Step 1: Install Dependencies

Navigate to the project directory:

```bash
cd ipnow
npm install
```

This will install:
- `wrangler` - Cloudflare Workers CLI tool
- `typescript` - TypeScript compiler
- Testing dependencies

## Step 2: Login to Cloudflare

Authenticate with your Cloudflare account:

```bash
npx wrangler login
```

This will:
1. Open a browser window
2. Ask you to log in to your Cloudflare account
3. Request authorization for Wrangler
4. Save your credentials locally

## Step 3: Configure Your Domain

### Option A: Use a Custom Domain (Recommended)

1. Make sure your domain (yip.is) is added to Cloudflare:
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Add your domain if not already added
   - Update your domain's nameservers to Cloudflare's nameservers

2. The `wrangler.toml` is already configured with:
   ```toml
   [env.production]
   route = "yip.is/*"
   ```

3. Before deploying, you need to add a DNS record for your domain:
   - Go to your domain in Cloudflare Dashboard
   - Navigate to DNS → Records
   - Add an A or AAAA record:
     - Type: `A`
     - Name: `@` (or your subdomain)
     - IPv4 address: `192.0.2.1` (dummy IP, will be proxied)
     - Proxy status: **Proxied** (orange cloud)

### Option B: Use workers.dev Subdomain (Quick Testing)

If you want to test first before using your custom domain:

1. Edit `wrangler.toml` and comment out the route:
   ```toml
   [env.production]
   # route = "yip.is/*"
   ```

2. Your worker will be available at: `https://yipis.<your-subdomain>.workers.dev`

## Step 4: Test Locally

Before deploying, test the worker locally:

```bash
npm run dev
```

This starts a local development server at `http://localhost:8787`

Test it:
```bash
# In another terminal
curl http://localhost:8787
curl http://localhost:8787/details
curl http://localhost:8787/1.1.1.1
```

Press `Ctrl+C` to stop the dev server.

## Step 5: Deploy to Production

Deploy your worker to Cloudflare:

```bash
npm run deploy
```

Or for production environment:

```bash
npx wrangler deploy --env production
```

You should see output like:
```
 ⛅️ wrangler 3.x.x
-------------------
Total Upload: XX.XX KiB / gzip: XX.XX KiB
Uploaded yipis (X.XX sec)
Published yipis (X.XX sec)
  https://yip.is
Current Deployment ID: xxxxx-xxxxx-xxxxx
```

## Step 6: Verify Deployment

Test your deployed worker:

```bash
curl https://yip.is
curl https://yip.is/details
curl https://yip.is/api
curl https://yip.is/health
curl https://yip.is/1.1.1.1
```

Or visit in your browser: https://yip.is

## Step 7: Configure Custom Domain (If Using workers.dev)

If you deployed to workers.dev first and want to add a custom domain:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to Workers & Pages → Overview
3. Click on your worker (`yipis`)
4. Go to **Settings** → **Triggers** → **Custom Domains**
5. Click **Add Custom Domain**
6. Enter your domain (e.g., `yip.is`)
7. Click **Add Custom Domain**

Cloudflare will automatically:
- Create the necessary DNS records
- Provision an SSL certificate
- Route traffic to your worker

## Step 8: Monitor Your Worker

### View Logs

```bash
npx wrangler tail
```

This streams real-time logs from your worker.

### Analytics

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to Workers & Pages → Overview
3. Click on your worker
4. View metrics:
   - Requests
   - Errors
   - CPU time
   - Duration

## Troubleshooting

### "Route already exists" Error

If you see this error, it means another worker is already using this route. Either:
- Remove the route from the other worker
- Use a different subdomain/path

### DNS Not Resolving

- Make sure your domain's nameservers are set to Cloudflare
- DNS propagation can take up to 24-48 hours
- Clear your DNS cache: `ipconfig /flushdns` (Windows) or `sudo dscacheutil -flushcache` (macOS)

### Worker Not Updating

- Make sure you're deploying to the correct environment
- Try: `npx wrangler deploy --env production`
- Clear Cloudflare cache in Dashboard → Caching → Configuration → Purge Everything

### SSL Certificate Issues

- Custom domains get automatic SSL certificates
- It may take a few minutes for the certificate to provision
- Make sure "Proxied" (orange cloud) is enabled in DNS settings

## Updating Your Worker

When you make changes:

1. Test locally first:
   ```bash
   npm run dev
   ```

2. Deploy the changes:
   ```bash
   npm run deploy
   ```

3. Verify the changes:
   ```bash
   curl https://yip.is/health
   ```

## Environment Variables

If you need to add secrets (API keys, etc.):

```bash
# Add a secret
npx wrangler secret put SECRET_NAME

# List secrets
npx wrangler secret list
```

Then use in your code:
```typescript
interface Env {
  SECRET_NAME: string;
  ASSETS: { fetch: ... };
}
```

## Cost Considerations

### Free Plan
- 100,000 requests/day
- More than enough for most personal projects
- No credit card required

### Paid Plan ($5/month)
- 10 million requests/month
- Included in Workers Paid plan
- Additional features: Durable Objects, longer CPU time, etc.

### Rate Limiting

Consider adding rate limiting if you expect high traffic. You can use:
- Cloudflare Rate Limiting rules (in Dashboard)
- Custom rate limiting logic in your worker
- Cloudflare's built-in DDoS protection

## Next Steps

- Set up monitoring/alerting in Cloudflare Dashboard
- Configure caching rules for better performance
- Add analytics if needed
- Set up a custom error page
- Consider adding a CDN for static assets

## Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare Workers Examples](https://developers.cloudflare.com/workers/examples/)
- [Workers Playground](https://cloudflareworkers.com/)

## Support

If you encounter issues:
- Check [Cloudflare Community](https://community.cloudflare.com/)
- Read the [Workers Documentation](https://developers.cloudflare.com/workers/)
- Check [Cloudflare Status](https://www.cloudflarestatus.com/)
