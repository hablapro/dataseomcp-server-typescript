# Railway Deployment Guide for DataForSEO MCP Server

This guide will help you deploy the DataForSEO MCP Server to Railway.

## Prerequisites

1. A Railway account (sign up at https://railway.app)
2. Railway CLI installed (optional, for command-line deployment)
3. DataForSEO API credentials (get them at https://dataforseo.com)
4. Git installed on your local machine

## Deployment Methods

### Method 1: Deploy from GitHub (Recommended)

1. **Fork or push this repository to your GitHub account**

2. **Connect Railway to GitHub:**
   - Log in to Railway Dashboard
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Authorize Railway to access your GitHub account
   - Select your repository

3. **Configure Environment Variables:**
   In the Railway dashboard, go to your service settings and add:
   ```
   DATAFORSEO_USERNAME=your_dataforseo_username
   DATAFORSEO_PASSWORD=your_dataforseo_password
   PORT=3000
   NODE_ENV=production
   ```

   Optional variables:
   ```
   ENABLED_MODULES=serp,keywords_data,onpage,dataforseo_labs
   DATAFORSEO_FULL_RESPONSE=false
   ```

4. **Deploy:**
   Railway will automatically build and deploy your application using the Dockerfile.

### Method 2: Deploy via Railway CLI

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway:**
   ```bash
   railway login
   ```

3. **Initialize a new project:**
   ```bash
   railway init
   ```

4. **Link to existing project (if you have one):**
   ```bash
   railway link
   ```

5. **Set environment variables:**
   ```bash
   railway variables set DATAFORSEO_USERNAME=your_username
   railway variables set DATAFORSEO_PASSWORD=your_password
   railway variables set PORT=3000
   railway variables set NODE_ENV=production
   ```

6. **Deploy:**
   ```bash
   railway up
   ```

### Method 3: Deploy using Railway Button

Add this button to your README to allow one-click deployments:

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/dataforseo/mcp-server-typescript)

## Configuration

### Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `DATAFORSEO_USERNAME` | Yes | Your DataForSEO API username | - |
| `DATAFORSEO_PASSWORD` | Yes | Your DataForSEO API password | - |
| `PORT` | No | Port for the HTTP server | 3000 |
| `NODE_ENV` | No | Environment (production/development) | production |
| `ENABLED_MODULES` | No | Comma-separated list of modules to enable | all |
| `DATAFORSEO_FULL_RESPONSE` | No | Return full API responses | false |

### Available Modules

- `serp` - SERP API
- `keywords_data` - Keywords Data API
- `onpage` - OnPage API
- `dataforseo_labs` - DataForSEO Labs API
- `backlinks` - Backlinks API
- `business_data` - Business Data API
- `domain_analytics` - Domain Analytics API
- `content_analysis` - Content Analysis API

## Health Check

The server provides a health check endpoint at `/health`. Railway will use this to monitor your service.

## Accessing Your Deployed Server

Once deployed, Railway will provide you with a URL like:
```
https://your-app-name.railway.app
```

You can test your deployment by accessing:
```
https://your-app-name.railway.app/health
```

## MCP Client Configuration

To use your deployed server with an MCP client, configure it with your Railway URL:

```json
{
  "mcpServers": {
    "dataforseo": {
      "url": "https://your-app-name.railway.app",
      "transport": "http"
    }
  }
}
```

## Monitoring and Logs

### View Logs
- **Dashboard:** Navigate to your service in Railway dashboard and click on "Logs"
- **CLI:** Use `railway logs` command

### Metrics
Railway provides basic metrics including:
- Request count
- Response times
- Memory usage
- CPU usage

## Scaling

Railway automatically handles scaling based on your plan. For production use:

1. **Horizontal Scaling:** Increase the number of replicas in your service settings
2. **Vertical Scaling:** Upgrade your Railway plan for more resources

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check that all required files are committed to git
   - Verify the Dockerfile is present and correct
   - Check build logs for specific errors

2. **Service Not Starting**
   - Verify environment variables are set correctly
   - Check that DataForSEO credentials are valid
   - Review deployment logs for startup errors

3. **Connection Issues**
   - Ensure the service is running (check health endpoint)
   - Verify the correct port is exposed (3000)
   - Check Railway's network settings

### Debug Mode

To enable debug logging, set:
```bash
railway variables set DEBUG=true
```

## Cost Considerations

- Railway offers a free tier with limited resources
- Monitor your usage in the Railway dashboard
- Consider upgrading to a paid plan for production use

## Security Best Practices

1. **Never commit credentials to git**
   - Always use environment variables for sensitive data

2. **Use Railway's built-in SSL**
   - All Railway deployments include SSL certificates

3. **Rotate API credentials regularly**
   - Update environment variables in Railway when rotating credentials

4. **Monitor access logs**
   - Regularly review logs for unusual activity

## Support

- **Railway Support:** https://docs.railway.app
- **DataForSEO Support:** https://dataforseo.com/support
- **Project Issues:** https://github.com/dataforseo/mcp-server-typescript/issues

## Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [DataForSEO API Documentation](https://docs.dataforseo.com)
- [Model Context Protocol Specification](https://modelcontextprotocol.io)