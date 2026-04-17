# claude-plugins

Personal Claude Code plugin marketplace with MCP integrations for Public.com (trading, portfolio, options) and Perplexity (search, research, reasoning).

## Plugins

| Plugin | Description | Server |
|--------|-------------|--------|
| [public](plugins/public) | Portfolio management, market quotes, options data, and order workflows | `uvx publicdotcom-mcp-server` |
| [perplexity](plugins/perplexity) | Web search, ask, research, and reasoning | `npx @perplexity-ai/mcp-server` |

## Structure

```
.claude-plugin/marketplace.json   # marketplace definition
plugins/public/                   # Public.com plugin
plugins/perplexity/               # Perplexity plugin
```

## Setup

1. Set credentials in your shell profile:

```bash
# Public.com
export PUBLIC_COM_SECRET="your_api_secret_key"
export PUBLIC_COM_ACCOUNT_ID="your_account_id"

# Perplexity
export PERPLEXITY_API_KEY="your_key_here"
```

2. Install the marketplace in Claude and reload plugins.

## References

- [Public.com MCP Server](https://github.com/PublicDotCom/publicdotcom-mcp-server)
- [Perplexity MCP GitHub](https://github.com/perplexityai/modelcontextprotocol)
