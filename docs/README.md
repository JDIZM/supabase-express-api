# Docs

Some of these describe what the API does; others are design proposals
written up-front and only partly built. **The table says which is which** —
and the two that are not straight descriptions repeat it in a status block
at the top of the file, because that is where someone arriving from a
search result will be.

Mixing the two without saying which is which is how documentation starts
lying.

| Document | What it is |
| --- | --- |
| [FEATURES.md](FEATURES.md) | What the API actually does today |
| [OPENAPI_ANALYSIS.md](OPENAPI_ANALYSIS.md) | Why the OpenAPI document is generated from Zod rather than hand-written `$ref`s |
| [OPENAPI_BEST_PRACTICES.md](OPENAPI_BEST_PRACTICES.md) | Conventions the generated document follows |
| [ADMIN_IMPLEMENTATION.md](ADMIN_IMPLEMENTATION.md) | The admin/super-admin surface and how it is authorized |
| [SERVER_AUTH_ENDPOINTS.md](SERVER_AUTH_ENDPOINTS.md) | Auth endpoints, and why auth stays server-side rather than leaking the provider to clients |
| [GITHUB_ACTIONS_MIGRATIONS.md](GITHUB_ACTIONS_MIGRATIONS.md) | **Partly implemented.** `verify-migrations` runs; applying migrations to a real database does not |
| [API_ENHANCEMENT_IMPLEMENTATION.md](API_ENHANCEMENT_IMPLEMENTATION.md) | **Proposal.** A design written up-front, largely unbuilt |

The API's own reference is the generated OpenAPI document, served at
`/api-docs` in non-production environments.
