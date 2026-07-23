#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { registerGithuntTools, SERVER_VERSION } from "./tools.js";

const API_KEY = process.env.GITHUNT_API_KEY;
if (!API_KEY) {
  console.error(
    "GITHUNT_API_KEY environment variable is required. Get a key at https://githunt.ai/account."
  );
  process.exit(1);
}

const API_URL = (process.env.GITHUNT_API_URL || "https://api.githunt.ai").replace(/\/+$/, "");
const REQUEST_TIMEOUT_MS = 60000;

/**
 * Call a /v1 endpoint and always resolve a response envelope
 * ({ success, data?, error?, meta? }), synthesizing one for network failures
 * and non-JSON responses (e.g. gateway error pages) so the shared formatters
 * have a uniform input.
 */
async function callApi(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    const message =
      err.name === "TimeoutError"
        ? `Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s.`
        : err.message;
    return { success: false, error: { code: "network_error", message } };
  }
  const body = await res.json().catch(() => null);
  if (!body) {
    return {
      success: false,
      error: { code: `http_${res.status}`, message: `HTTP ${res.status} from API (non-JSON response).` },
    };
  }
  return body;
}

const runV1 = async (kind, args) => {
  if (kind === "search") {
    return callApi("/v1/search", { method: "POST", body: JSON.stringify(args) });
  }
  if (kind === "getUser") {
    return callApi(`/v1/users/${encodeURIComponent(args.login)}`);
  }
  return callApi("/v1/profile/analyze", { method: "POST", body: JSON.stringify(args) });
};

const server = new McpServer({ name: "githunt", version: SERVER_VERSION });
registerGithuntTools(server, runV1, z);

const transport = new StdioServerTransport();
await server.connect(transport);
