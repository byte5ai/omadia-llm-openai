/**
 * @omadia/plugin-llm-openai — entry point.
 *
 * OpenAI is an OpenAI-compatible provider, so it needs NO runtime provider
 * code: the kernel reads the `llm_provider` block from this plugin's
 * `manifest.yaml` at manifest-load time and registers OpenAI (id, baseURL,
 * models, quirks) into the kernel-owned `LlmProviderCatalog` BEFORE any plugin
 * activates. That ordering is what lets the orchestrator resolve an OpenAI
 * provider at its own activation regardless of plugin load order.
 *
 * `activate()` therefore only performs an optional sanity log — the provider is
 * already live by the time we get here. The operator supplies the API key via
 * the admin Providers page (vault key `provider:openai/api_key`).
 */
import type { PluginContext } from '@omadia/plugin-api';

export interface OpenAIPluginHandle {
  close(): Promise<void>;
}

export async function activate(
  ctx: PluginContext,
): Promise<OpenAIPluginHandle> {
  ctx.log(
    '[plugin-llm-openai] active — OpenAI provider declared in manifest; ' +
      'set the API key on the admin Providers page (provider:openai/api_key).',
  );
  return {
    async close(): Promise<void> {
      ctx.log('[plugin-llm-openai] deactivating');
    },
  };
}
