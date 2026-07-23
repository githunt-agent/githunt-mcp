/**
 * GitHunt MCP tool definitions + text formatters, shared verbatim by the
 * standalone stdio server (`mcp/index.js`) and the remote OAuth server
 * (`backend/src/mcp/githuntTools.js`). Deliberately dependency-free: callers
 * inject their own `zod` instance into `registerGithuntTools`.
 *
 * SYNC: this file exists as two byte-identical committed copies -
 * `mcp/tools.js` (published npm package) and `backend/src/mcp/tools.js`
 * (packaged into the Lambda; the backend deploy zips raw sources, so it
 * cannot import across the package boundary). Edit either copy, then copy it
 * over the other; `backend/test/unit/mcpTools.test.js` fails on any drift.
 */

export const SERVER_VERSION = '0.2.0';

const AVAILABLE_ROLES =
  'fullstack, frontend, backend, mobile, devops, ai-engineer, ai-orchestrator, ' +
  'ml-engineer, data-scientist, data-engineer, security, cloud, blockchain, ' +
  'embedded, gamedev, ios-developer, android-developer, sre, platform-engineer, ' +
  'qa-engineer, solutions-architect, cto, vp-engineering, head-engineering, ' +
  'engineering-manager, tech-lead, product-manager, director-engineering';

export function truncate(text, max) {
  if (!text) return '';
  const clean = String(text).replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 3)}...` : clean;
}

export function joinPresent(parts, sep = ' | ') {
  return parts
    .map((p) => (typeof p === 'string' ? p.trim() : p))
    .filter(Boolean)
    .join(sep);
}

export function relativeActive(dateString) {
  if (!dateString) return '';
  const diffDays = Math.floor((Date.now() - new Date(dateString).getTime()) / 86400000);
  if (Number.isNaN(diffDays)) return '';
  if (diffDays < 1) return 'active today';
  if (diffDays < 7) return `active ${diffDays}d ago`;
  if (diffDays < 30) return `active ${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `active ${Math.floor(diffDays / 30)}mo ago`;
  return `active ${Math.floor(diffDays / 365)}y ago`;
}

/** Escape/trim a value for a markdown table cell. */
export function mdCell(text, max = 60) {
  return truncate(text, max).replace(/\|/g, '\\|');
}

function resultLanguages(r) {
  return [...new Set([
    ...(r.top_repositories || []).map((repo) => repo.language),
    ...(r.top_oss_contributions || []).map((c) => c.language),
  ].filter(Boolean))].slice(0, 3);
}

export function formatSearchResults(data) {
  const header = `${data.matchedCount} candidate${data.matchedCount === 1 ? '' : 's'} found`;
  if (!data.results?.length) {
    if (data.locationSuggestions?.length) {
      return `${header}. That location may not be in the candidate pool. Supported locations with similar names: ${data.locationSuggestions.join('; ')}.`;
    }
    return `${header}. Try a broader location or fewer skills.`;
  }
  const offset = data.offset || 0;
  const rows = data.results.map((r, i) => {
    const name = r.name && r.name !== r.login ? `${r.login} (${r.name})` : r.login;
    const candidate = `[${mdCell(name, 40)}](${r.profile_url || `https://github.com/${r.login}`})`;
    const repos = (r.top_repositories || [])
      .map((repo) => `${repo.name}${repo.stars ? ` (${repo.stars}★)` : ''}`)
      .join(', ');
    const cells = [
      offset + i + 1,
      candidate,
      r.score,
      mdCell(r.location, 30),
      r.github_experience ? `${r.github_experience}y` : '',
      r.hireable === 'Yes' ? 'Yes' : '',
      relativeActive(r.last_active_date).replace(/^active /, ''),
      mdCell(r.matching_keywords, 60),
      mdCell(resultLanguages(r).join(', '), 40),
      mdCell(repos, 60),
      mdCell(r.email, 40),
    ];
    return `| ${cells.join(' | ')} |`;
  });
  return [
    header,
    'Present every row of this table to the user as-is. Do not drop candidates, columns, or re-rank.',
    '',
    '| # | Candidate | Score | Location | Exp | Hireable | Active | Matched skills | Languages | Top repos | Email |',
    '|---|-----------|-------|----------|-----|----------|--------|----------------|-----------|-----------|-------|',
    ...rows,
  ].join('\n');
}

/** Compact machine-readable row mirroring the table columns (empty fields omitted). */
function toStructuredResult(r, rank) {
  const languages = resultLanguages(r);
  const row = {
    rank,
    login: r.login,
    score: r.score,
    hireable: r.hireable === 'Yes',
    profileUrl: r.profile_url || `https://github.com/${r.login}`,
  };
  if (r.name && r.name !== r.login) row.name = r.name;
  if (r.location) row.location = r.location;
  if (r.github_experience) row.experienceYears = r.github_experience;
  if (r.last_active_date) row.lastActiveDate = r.last_active_date;
  if (r.matching_keywords) row.matchedSkills = r.matching_keywords;
  if (languages.length) row.languages = languages;
  if (r.top_repositories?.length) {
    row.topRepositories = r.top_repositories.map((repo) => ({
      name: repo.name,
      stars: repo.stars || 0,
      ...(repo.language ? { language: repo.language } : {}),
    }));
  }
  if (r.email) row.email = r.email;
  return row;
}

export function toStructuredSearch(data) {
  const offset = data.offset || 0;
  const structured = {
    matchedCount: data.matchedCount,
    results: (data.results || []).map((r, i) => toStructuredResult(r, offset + i + 1)),
  };
  if (data.totalCount != null) structured.totalCount = data.totalCount;
  if (offset) structured.offset = offset;
  if (data.locationSuggestions?.length) structured.locationSuggestions = data.locationSuggestions;
  return structured;
}

export function formatDeveloper(r) {
  const login = r.username || r.login;
  const repos = (r.top_repositories || [])
    .map((repo) => joinPresent([repo.name, repo.stars ? `${repo.stars}★` : '', repo.language], ' '))
    .join(', ');
  const oss = (r.top_oss_contributions || [])
    .map((c) => joinPresent([c.repository, c.tier_label ? `(${c.tier_label})` : ''], ' '))
    .join(', ');
  return [
    `${login}${r.name && r.name !== login ? ` (${r.name})` : ''} - score ${r.score}`,
    joinPresent([
      `profile ${r.profile_score} / tech ${r.tech_stack_score} / activity ${r.activity_score}`,
      r.github_experience ? `${r.github_experience}y on GitHub` : '',
      `hireable: ${r.hireable}`,
    ]),
    joinPresent([r.location, r.company, `${r.followers} followers`]),
    joinPresent([
      relativeActive(r.last_active_date),
      r.commit_frequency_label && r.commit_frequency_label !== 'Unknown'
        ? `${r.commit_frequency_label} (${r.commits_per_month || 0} commits/mo)`
        : '',
      r.commit_message_quality_label && r.commit_message_quality_label !== 'Insufficient Data'
        ? `commit quality ${r.commit_message_quality_label} (${r.semantic_commit_percentage || 0}% semantic)`
        : '',
    ]),
    joinPresent([r.email, r.blog, r.twitter_username ? `@${r.twitter_username}` : '']),
    r.matching_keywords ? `keywords: ${truncate(r.matching_keywords, 120)}` : '',
    r.bio ? `bio: ${truncate(r.bio, 160)}` : '',
    repos ? `repos: ${repos}` : '',
    oss ? `OSS: ${oss}` : '',
    r.profile_url,
  ].filter(Boolean).join('\n');
}

export function formatAnalysis(data) {
  const prof = data.proficiency || {};
  const roles = (data.roleMatch || []).slice(0, 3);
  const emails = data.emails?.emails || [];
  return [
    `Proficiency: ${prof.level || 'unknown'} (score ${prof.score ?? 'n/a'}, ~${prof.experienceYears ?? '?'}y experience)`,
    roles.length
      ? `Role fit: ${roles.map((r) => `${r.displayName || r.role} (${r.score})`).join(', ')}`
      : '',
    emails.length
      ? `Emails: ${emails.map((e) => `${e.address}${e.isPrimary ? ' (primary)' : ''}`).join(', ')}`
      : 'Emails: none found',
    data.scores?.matchingKeywords?.length
      ? `Keywords: ${truncate(data.scores.matchingKeywords.join(', '), 120)}`
      : '',
  ].filter(Boolean).join('\n');
}

export function formatSuccess(data, meta, formatter) {
  const lines = [formatter ? formatter(data) : JSON.stringify(data, null, 2)];
  if (meta?.quota) {
    const limit = meta.quota.limit === -1 ? 'unlimited' : meta.quota.limit;
    lines.push(`Quota: ${meta.quota.used}/${limit} for ${meta.quota.month}`);
  }
  return { content: [{ type: 'text', text: lines.join('\n\n') }] };
}

export function formatError(envelope) {
  const error = envelope?.error || {};
  const code = error.code || 'unknown_error';
  const message = error.message || 'Request failed.';
  let text = `${code}: ${message}`;
  if (code === 'quota_exceeded') {
    const q = envelope?.meta?.quota;
    const usage = q ? ` (used ${q.used}/${q.limit === -1 ? 'unlimited' : q.limit} for ${q.month})` : '';
    text = `Quota exceeded${usage}: ${message}`;
  }
  return { isError: true, content: [{ type: 'text', text }] };
}

/**
 * Turn a /v1 envelope into an MCP tool result, formatting with `formatter`.
 * @param {{success: boolean, data?: any, error?: any, meta?: any}} envelope
 */
export function toToolResult(envelope, formatter) {
  if (!envelope?.success) return formatError(envelope);
  return formatSuccess(envelope.data, envelope.meta, formatter);
}

function missingParam(name) {
  return {
    isError: true,
    content: [{ type: 'text', text: `Missing required parameter '${name}' (GitHub username).` }],
  };
}

function searchInputSchema(z) {
  return {
    location: z.string().describe(
      "City or country to search, freeform, e.g. 'Warsaw', 'San Francisco', 'Poland'. " +
      'Common abbreviations and native names are normalized (SF, NYC, UK, Warszawa).'
    ),
    role: z.string().optional().describe(
      `Role to rank candidates for. One of: ${AVAILABLE_ROLES}.`
    ),
    skills: z.array(z.string()).max(20).optional().describe(
      "Technologies or keywords to match, e.g. ['react', 'typescript']. Synonyms are handled (k8s -> kubernetes)."
    ),
    languages: z.array(z.string()).max(10).optional().describe(
      "Programming languages to prefer, e.g. ['Python', 'Go']."
    ),
    minExperienceYears: z.number().min(0).max(50).optional().describe(
      'Minimum years since the GitHub account was created.'
    ),
    isHireable: z.boolean().optional().describe(
      "Only candidates whose GitHub profile sets the 'hireable' flag."
    ),
    strictSkills: z.boolean().optional().describe(
      'If true, exclude candidates that match none of the given skills.'
    ),
    maxResults: z.number().min(1).max(100).default(25).optional().describe(
      'Candidates to return per call (1-100, default 25).'
    ),
    offset: z.number().int().min(0).max(200).optional().describe(
      'Top-ranked candidates to skip, for paging (0-200, default 0). Use with maxResults to fetch the next page. ' +
      'Each search scores at most ~200 candidates, so pages past that are empty.'
    ),
  };
}

function searchOutputSchema(z) {
  return {
    matchedCount: z.number().describe('Candidates returned in this page.'),
    totalCount: z.number().optional().describe('Total candidates matched before paging.'),
    offset: z.number().optional(),
    locationSuggestions: z.array(z.string()).optional()
      .describe('Similar supported locations, present when the location matched nothing.'),
    results: z.array(
      z.object({
        rank: z.number(),
        login: z.string(),
        score: z.number(),
        hireable: z.boolean(),
        profileUrl: z.string(),
        name: z.string().optional(),
        location: z.string().optional(),
        experienceYears: z.number().optional(),
        lastActiveDate: z.string().optional(),
        matchedSkills: z.string().optional(),
        languages: z.array(z.string()).optional(),
        topRepositories: z.array(
          z.object({
            name: z.string(),
            stars: z.number(),
            language: z.string().optional(),
          })
        ).optional(),
        email: z.string().optional(),
      })
    ),
  };
}

/**
 * Register the three GitHunt tools on an McpServer.
 *
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {(kind: 'search'|'getUser'|'analyze', args: object) => Promise<object>} runV1
 *        Executes the corresponding /v1 operation and resolves the parsed envelope.
 * @param {typeof import('zod').z} z - The caller's zod instance.
 */
export function registerGithuntTools(server, runV1, z) {
  server.registerTool(
    'search_developers',
    {
      title: 'Search developers',
      description:
        "Search GitHunt's pre-indexed pool of GitHub developers by location, role, and skills. " +
        'Returns candidates ranked by fit with scores, activity, and contact info. Fast (pool-served, no live crawl); page with offset.',
      annotations: { readOnlyHint: true },
      inputSchema: searchInputSchema(z),
      outputSchema: searchOutputSchema(z),
    },
    async (args) => {
      const envelope = await runV1('search', args);
      const result = toToolResult(envelope, formatSearchResults);
      if (envelope?.success && envelope.data) {
        result.structuredContent = toStructuredSearch(envelope.data);
      }
      return result;
    }
  );

  server.registerTool(
    'get_developer',
    {
      title: 'Get developer profile',
      description:
        "Get a single GitHub developer's ranked profile by username: overall/profile/tech/activity scores, " +
        'experience, commit activity, top repos, and contact info. Cache-first and fast; use analyze_profile for deep AI analysis.',
      annotations: { readOnlyHint: true },
      inputSchema: {
        login: z.string().optional().describe("GitHub username (login), e.g. 'octocat'."),
        username: z.string().optional().describe('Alias for login; provide either.'),
      },
    },
    async (args) => {
      const login = ((args.login ?? args.username) || '').trim();
      if (!login) return missingParam('login');
      return toToolResult(await runV1('getUser', { login }), formatDeveloper);
    }
  );

  server.registerTool(
    'analyze_profile',
    {
      title: 'Analyze GitHub profile',
      description:
        'Deep analysis of a GitHub profile from live GitHub data: proficiency level, best-fit roles, ' +
        'extracted emails. Slower and heavier than get_developer; use it to vet a shortlisted candidate.',
      annotations: { readOnlyHint: true },
      inputSchema: {
        username: z.string().optional().describe("GitHub username (login), e.g. 'octocat'."),
        login: z.string().optional().describe('Alias for username; provide either.'),
      },
    },
    async (args) => {
      const username = ((args.username ?? args.login) || '').trim();
      if (!username) return missingParam('username');
      return toToolResult(await runV1('analyze', { username }), formatAnalysis);
    }
  );
}
