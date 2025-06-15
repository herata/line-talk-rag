import type { Context } from "hono";

/**
 * Health check endpoint
 * Returns system status and configuration information
 */
export function handleHealthCheck(c: Context) {
	return c.json({
		message: "LINE Talk RAG System",
		version: "1.0.4",
		status: "production",
		endpoints: ["/prepare", "/webhook"],
		features: {
			workersAI: "enabled (qwen1.5-0.5b fast + llama-3.2-3b balanced)",
			strategy: "immediate response with fallback",
			backgroundProcessing: "enabled with Push API",
			optimizations: "balanced speed and quality, deterministic",
			language: "Japanese optimized",
			inputMethods: {
				prepare: [
					"File upload (.txt files only)",
					"Custom options via form data"
				]
			}
		},
		usage: {
			fileUpload: "curl -X POST /prepare -F 'file=@chat.txt'",
			withOptions: "curl -X POST /prepare -F 'file=@chat.txt' -F 'options={\"chunkSize\": 2000}'"
		}
	});
}
