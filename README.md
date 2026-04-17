<h1 align="center">Shubh Thorat · Claude Plugins</h1>

<p align="center">
  <strong>Personal Claude Code plugins and MCP integrations.</strong>
</p>

<p align="center">
  <a href="https://github.com/shubhthorat/claude-plugins"><img src="https://img.shields.io/badge/claude--code-plugin--marketplace-blue" alt="Claude Code Plugin Marketplace" /></a>
</p>

---

## Install

In Claude Code:

```
/plugin marketplace add shubhthorat/claude-plugins
```

Then install individual plugins:

```
/plugin install public@shubhthorat
/plugin install perplexity@shubhthorat
```

```
/reload-plugins
```

---

## Plugins

### [Public](./plugins/public)

Connect Claude to Public.com for portfolio, quotes, options data, and trading workflows using the official Public MCP server.

**Server:** `uvx publicdotcom-mcp-server`

### [Perplexity](./plugins/perplexity)

Connect Claude to Perplexity for real-time web search, conversational ask, deep research, and reasoning workflows.

**Server:** `npx -y @perplexity-ai/mcp-server`

---

## For Developers

This repo is the plugin marketplace definition. It contains plugin metadata and MCP configuration for each integration.

| Plugin | Source |
|--------|--------|
| public | [Public.com MCP Server](https://github.com/PublicDotCom/publicdotcom-mcp-server) |
| perplexity | [Perplexity MCP](https://github.com/perplexityai/modelcontextprotocol) |
