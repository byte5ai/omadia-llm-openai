# @omadia/plugin-llm-openai

Adds **OpenAI** (the GPT-5.x family) as an admin-selectable LLM provider for [omadia](https://github.com/byte5ai/omadia). OpenAI exposes the canonical OpenAI-compatible Chat Completions API, so this is a **declarative provider plugin**: the provider, its models and its API quirks are described in `manifest.yaml` and registered by the omadia kernel at load time — there is no runtime provider code to maintain.

> Requires omadia core with the LLM-provider-plugin seam (the manifest-driven
> `LlmProviderCatalog`). Older cores ignore the `llm_provider` manifest block.

## Models

| Model | Class | Context | Max output | Vision |
|-------|-------|--------:|-----------:|:------:|
| `gpt-5.5` | frontier | 1,047,576 | 128,000 | yes |
| `gpt-5.4` | balanced | 400,000 | 128,000 | yes |
| `gpt-5.4-mini` (class default) | fast | 400,000 | 128,000 | yes |
| `gpt-5.4-nano` | fast | 400,000 | 128,000 | yes |

## Install

1. Build the plugin: `npm install && npm run build` (produces `dist/plugin.js`).
2. Package `manifest.yaml` + `dist/` and install it into omadia (admin → install plugin, or via the registry).
3. On the admin **Providers** page, set the OpenAI API key — it is stored in the vault under `provider:openai/api_key` (same mechanism as the built-in OpenAI provider).
4. Assign OpenAI (and a model) to a plugin such as the orchestrator on the Providers page.

## Configuration

| Setup field | Required | Default | Notes |
|-------------|:--------:|---------|-------|
| `openai_base_url` | no | `https://api.openai.com/v1` | Override for Azure OpenAI or any OpenAI-compatible gateway. |

The API key is **not** a per-plugin setup secret — it is set centrally on the Providers page so the orchestrator (which reads the key from its own vault scope) can see it.

## Provider quirks handled

OpenAI's GPT-5 / o-series tightened the Chat Completions schema; the plugin declares the relevant quirk so core's OpenAI-compatible adapter emits the right wire shape:

- `max_completion_tokens` instead of the deprecated `max_tokens`. Because this plugin sets an explicit `default_base_url`, the adapter would otherwise fall back to the legacy `max_tokens` field — which GPT-5 rejects. Declaring `max_tokens_field: max_completion_tokens` keeps requests valid.

The wire format is `openai-compatible`, so no other quirks are needed — this is the reference shape the adapter was built against.

## Development

```bash
npm install
npm run typecheck   # tsc --noEmit (needs the omadia core contract built)
npm test            # validates the manifest + model invariants
npm run build
```
