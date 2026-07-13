# Sarvenix Live Preflight

- Run: `sarvenix-run-20260713T050154Z-1ab835d1`
- Generated: 2026-07-13T05:01:55.969Z
- Result: **PASS**

| Check | Provider | Result | Detail |
|---|---|---|---|
| env-slack_bot_token | local | PASS | Configured. |
| env-slack_signing_secret | local | PASS | Configured. |
| env-sandbox_slack_workspace_id | local | PASS | Configured. |
| env-github_app_id | local | PASS | Configured. |
| env-github_private_key | local | PASS | Configured. |
| env-github_installation_id | local | PASS | Configured. |
| env-sandbox_github_repository | local | PASS | Configured. |
| env-jira_cloud_id | local | PASS | Configured. |
| env-jira_access_token | local | PASS | Configured. |
| env-jira_site_url | local | PASS | Configured. |
| env-sandbox_jira_project_key | local | PASS | Configured. |
| env-graph_db_url | local | PASS | Configured. |
| env-graph_db_user | local | PASS | Configured. |
| env-graph_db_password | local | PASS | Configured. |
| slack-workspace | slack | PASS | Authenticated to configured sandbox workspace. |
| github-repository | github | PASS | Sandbox repository is reachable. |
| jira-project | jira | PASS | Sandbox Jira project is reachable. |
| neo4j-configuration | neo4j | PASS | Graph endpoint format and credentials are present; driver connectivity runs during seed. |
