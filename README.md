# githunt-mcp

MCP server that wraps [GitHunt's](https://githunt.ai) REST API, giving AI assistants access to GitHunt's GitHub developer search, profile lookup, and AI profile analysis.

> **Prefer zero setup?** GitHunt also runs a hosted MCP server at
> `https://mcp.githunt.ai/mcp` - add it as a custom connector in Claude
> (Settings → Connectors) or as a remote MCP server in your client and sign in
> with your GitHunt account. No API key or local process needed. This package
> is the self-hosted (stdio) alternative.

## Setup

Get an API key from your [GitHunt account](https://githunt.ai/account), then run:

```bash
npx githunt-mcp
```

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `GITHUNT_API_KEY` | yes | Your GitHunt API key |
| `GITHUNT_API_URL` | no | API base URL (default `https://api.githunt.ai`) |

### Claude Code

```bash
claude mcp add githunt -e GITHUNT_API_KEY=your-key-here -- npx githunt-mcp
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "githunt": {
      "command": "npx",
      "args": ["githunt-mcp"],
      "env": {
        "GITHUNT_API_KEY": "your-key-here"
      }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "githunt": {
      "command": "npx",
      "args": ["githunt-mcp"],
      "env": {
        "GITHUNT_API_KEY": "your-key-here"
      }
    }
  }
}
```

## Tools

- **search_developers** — search millions of developers available on GitHub by location, role, and skills. Supports `offset` (0-200) to page through results with `maxResults`, and returns structured content alongside the markdown table. If a location matches no known city or country, the result suggests similar supported locations instead of an empty page.
- **get_developer** — get a single GitHub developer's ranked profile by username. Accepts either `login` or `username`.
- **analyze_profile** — deep AI analysis of a GitHub profile (proficiency, role matches, extracted emails). Accepts either `login` or `username`.

Full API reference: https://docs.githunt.ai
