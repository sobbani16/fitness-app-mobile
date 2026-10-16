# Confluence MCP setup

The `confluence` entry in `/Users/sobbani/.codex/config.toml` uses the official Atlassian Cloud MCP endpoint, `https://mcp.atlassian.com/v2/mcp`. It is disabled until you add credentials. This assumes Confluence Cloud; it is not a Confluence Data Center configuration.

## Finish setup

1. Create a personal Atlassian API token with the Confluence scopes you need. Your organization must permit MCP API-token authentication.
2. Base64-encode `your-atlassian-email:your-api-token`. Do not paste the raw personal token directly after `Basic`.
3. In the `[mcp_servers.confluence]` section of the user config, replace `REPLACE_WITH_BASE64_EMAIL_AND_API_TOKEN` with that encoded value. Keep the `Basic ` prefix.
4. Change `enabled = false` to `enabled = true` and restart Codex/the IDE extension.
5. Check `/mcp` in Codex CLI or the MCP settings in the extension. Test a Confluence read/search before attempting to publish the handoff document.

You can generate the header locally without placing the token in shell history:

```sh
python3 -c 'import base64,getpass; email=input("Atlassian email: ").strip(); token=getpass.getpass("API token: "); print("Basic " + base64.b64encode((email+":"+token).encode()).decode())'
```

The command prints a credential-bearing header in your terminal; paste it only into your local user config. Base64 is encoding, not encryption. No secret belongs in this repository or its mobile `.env`.

If you have a **service-account API key**, use `Authorization = "Bearer YOUR_API_KEY"` instead. Personal API tokens and service-account API keys use different authentication schemes.

Only configuration was prepared. Authentication/connectivity cannot be verified until credentials are added; no Confluence pages have been created or modified. The official Atlassian server can expose other Atlassian tools according to your account permissions/scopes; the local name `confluence` does not itself restrict access to Confluence.

Sources: [Codex MCP configuration](https://developers.openai.com/codex/mcp), [Atlassian API-token authentication](https://support.atlassian.com/atlassian-ai-gateway/docs/configure-authentication-via-api-token/).
