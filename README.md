# githunt-mcp

[![npm version](https://img.shields.io/npm/v/githunt-mcp.svg)](https://www.npmjs.com/package/githunt-mcp)
[![node](https://img.shields.io/node/v/githunt-mcp.svg)](https://www.npmjs.com/package/githunt-mcp)
[![license](https://img.shields.io/npm/l/githunt-mcp.svg)](./LICENSE)
[![MCP](https://img.shields.io/badge/MCP-server-blue.svg)](https://modelcontextprotocol.io)

An [MCP](https://modelcontextprotocol.io) server that gives your AI assistant a
recruiter's view of GitHub. It wraps [GitHunt's](https://githunt.ai) API so
Claude, Cursor, and other MCP clients can **search a pre-indexed pool of GitHub
developers, look up a ranked profile, and run deep AI analysis on a
candidate** - all from a chat prompt.

Ask *"find backend engineers in Berlin who know Go and Kubernetes"* and get back
a ranked, scored shortlist with activity signals and contact info.

> **Prefer zero setup?** GitHunt also runs a hosted MCP server at
> `https://mcp.githunt.ai/mcp`. Add it as a custom connector in Claude
> (Settings -> Connectors) or as a remote MCP server in your client and sign in
> with your GitHunt account - no API key or local process needed. This package
> is the self-hosted (stdio) alternative.

## Quickstart

1. Grab an API key from your [GitHunt account](https://githunt.ai/account).
2. Run the server:

   ```bash
   GITHUNT_API_KEY=your-key-here npx githunt-mcp
   ```

3. Wire it into your client (see below), then just ask.

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

Any MCP client that speaks stdio works the same way: run `npx githunt-mcp` with
`GITHUNT_API_KEY` in the environment.

## Try it

Once connected, prompt your assistant naturally:

- *"Find senior frontend developers in Warsaw who know React and TypeScript."*
- *"Show me hireable DevOps engineers in Poland with 5+ years on GitHub."*
- *"Give me the next 25 candidates for that search."* (paging via `offset`)
- *"Pull up octocat's GitHunt profile."*
- *"Do a deep analysis of torvalds - proficiency, best-fit roles, any public emails."*
- *"Search for ML engineers in San Francisco, then analyze your top 3."*

## Tools

| Tool | What it does | Speed |
|---|---|---|
| `search_developers` | Search GitHunt's pre-indexed pool by `location`, `role`, `skills`, `languages`, and more. Returns candidates ranked by fit with scores, activity, and contact info. Pages via `offset` (0-200). Returns a markdown table plus structured JSON. If a location matches nothing, it suggests similar supported locations instead of an empty page. | Fast (pool-served, no live crawl) |
| `get_developer` | Get one developer's ranked profile by `login`/`username`: overall, profile, tech-stack, and activity scores, experience, commit activity, top repos, and contact info. | Fast (cache-first) |
| `analyze_profile` | Deep AI analysis of a profile from live GitHub data: proficiency level, best-fit roles, and extracted emails. Use it to vet a shortlisted candidate. | Slower (live crawl) |

**Supported `role` values:** `fullstack`, `frontend`, `backend`, `mobile`,
`devops`, `ai-engineer`, `ai-orchestrator`, `ml-engineer`, `data-scientist`,
`data-engineer`, `security`, `cloud`, `blockchain`, `embedded`, `gamedev`,
`ios-developer`, `android-developer`, `sre`, `platform-engineer`,
`qa-engineer`, `solutions-architect`, `cto`, `vp-engineering`,
`head-engineering`, `engineering-manager`, `tech-lead`, `product-manager`,
`director-engineering`.

Skills are matched with synonyms (`k8s` -> `kubernetes`), and locations are
normalized (`SF`, `NYC`, `UK`, `Warszawa`).

Full API reference: <https://docs.githunt.ai>

## Scoring

Each candidate carries an **overall score** built from three dimensions, all
surfaced in `get_developer`:

- **Profile score** - bio, seniority signals, and account maturity.
- **Tech-stack score** - how well their languages and repos match the requested
  skills and role.
- **Activity score** - recency and volume of public contributions (commits,
  frequency, commit-message quality).

`search_developers` ranks the pool by fit for your query; `analyze_profile`
recomputes proficiency and role fit against fresh GitHub data.

## Quotas

Requests count against your GitHunt plan's quota. Every response includes your
current usage (`used / limit` for the month), and a `quota_exceeded` error tells
you when you've hit the cap. See [your account](https://githunt.ai/account) for
plan limits.

## Limitations & responsible use

GitHunt reads **public GitHub activity**, which is strong evidence of technical
work but far from the whole picture:

- It's blind to private-repo, internal, and enterprise contributions - many
  excellent engineers have quiet public profiles.
- The candidate pool is pre-indexed, so brand-new or rarely-active accounts may
  be missing; `analyze_profile` fetches live data for a specific person.
- Public-activity signals can skew by geography, employer, and career stage.

Use this as a **lead generator, not an automated filter**. Treat scores as a
starting point for a human conversation, not a hiring decision. GitHub is not
the whole engineer.

## Contributing

Issues and pull requests are welcome. Please open an issue describing the change
before sending a large PR. For API behavior and endpoint details, see
<https://docs.githunt.ai>.

## License

MIT - see [LICENSE](./LICENSE).
