# @omadia/plugin-llm-openai

Adds OpenAI's GPT models as an LLM you can assign to any agent in omadia.

omadia is a self-hostable agentic OS: you build, run, and audit multi-agent AI teams from signed plugins, and you bring your own LLM key. Main repo: [byte5ai/omadia](https://github.com/byte5ai/omadia). This plugin makes OpenAI one of the providers an operator can pick on the admin Providers page.

## Models

| Model | Class |
|-------|-------|
| GPT-5.5 | frontier |
| GPT-5.4 | balanced |
| GPT-5.4 mini | fast |
| GPT-5.4 nano | fast |

Agents request a class (`fast` / `balanced` / `frontier`). omadia resolves the class to the concrete model.

## How it works in omadia

This is a declarative provider, so it ships no runtime provider code. The `llm_provider` block in `manifest.yaml` (id, base URL, models, API quirks) is read by the omadia kernel when the plugin loads, before any agent activates, and registered into the kernel's provider catalog. OpenAI uses the canonical OpenAI Chat Completions API, so omadia's built-in OpenAI-compatible adapter drives the calls. GPT-5 tightened the schema, so the manifest declares the `max_completion_tokens` quirk to keep requests valid.

## Install

Install from the omadia hub at [hub.omadia.ai](https://hub.omadia.ai) (omadia admin, plugins, install), or upload the built ZIP directly.

After install:

1. On the admin Providers page, paste your OpenAI API key. It is stored encrypted under `provider:openai/api_key`.
2. Assign OpenAI and a model to an agent.

## Configuration

| Setup field | Required | Default | Notes |
|-------------|:--------:|---------|-------|
| `openai_base_url` | no | `https://api.openai.com/v1` | Override for Azure OpenAI or any OpenAI-compatible gateway. |

The API key is set centrally on the Providers page, not as a per-plugin secret.

## Build from source

```bash
npm install
npm run build   # tsc, emits dist/
npm test        # validates manifest.yaml against core's invariants
```

The plugin compiles against omadia workspace packages (`@omadia/plugin-api`, `@omadia/llm-provider`), declared as optional peer deps. Link them from a local omadia checkout before building. See [byte5ai/omadia](https://github.com/byte5ai/omadia).

## License

MIT, byte5 GmbH
