import { CloudflareWorkersAIEmbeddings } from "@langchain/cloudflare";
import { CloudflareVectorizeStore } from "@langchain/cloudflare";
import type { messagingApi } from "@line/bot-sdk";

/**
 * Enhanced Background processing function with RAG support
 * Processes user messages using AI with optional RAG context from chat history
 */
export async function processMessageInBackground(
	AI: Ai,
	client: messagingApi.MessagingApiClient,
	targetId: string,
	userMessage: string,
	vectorizeIndex?: VectorizeIndex,
): Promise<void> {
	try {
		console.log("Background processing started for:", userMessage);

		let contextualPrompt = userMessage;
		let ragContext = "";

		// Try to use RAG if Vectorize index is available
		if (vectorizeIndex) {
			try {
				console.log("Attempting RAG-enhanced response...");

				// Initialize embeddings for the user query
				const embeddings = new CloudflareWorkersAIEmbeddings({
					binding: AI,
					modelName: "@cf/baai/bge-m3",
				});

				// Initialize vector store for similarity search
				const vectorStore = new CloudflareVectorizeStore(embeddings, {
					index: vectorizeIndex,
				});

				// Search for relevant documents from stored chat history
				const results = await vectorStore.similaritySearch(userMessage, 3);

				if (results.length > 0) {
					console.log(`Found ${results.length} relevant documents`);

					// Prepare context from search results
					ragContext = results
						.map((doc, index) => {
							return `[関連情報 ${index + 1}]\n${doc.pageContent}`;
						})
						.join("\n\n");

					// Create enhanced prompt with context
					contextualPrompt = `LINE チャット履歴から関連する情報が見つかりました。この情報を参考にして回答してください。

関連する過去の会話:
${ragContext}

現在の質問: ${userMessage}

上記の関連情報を踏まえて、適切で詳細な回答を提供してください。関連情報がない場合は、一般的な知識で回答してください。`;
				} else {
					console.log("No relevant documents found, using general response");
				}
			} catch (ragError) {
				console.error(
					"RAG processing failed, falling back to general response:",
					ragError,
				);
				// Continue with general response if RAG fails
			}
		}

		// Use enhanced LLM for background processing
		const aiResponse = await AI.run("@cf/meta/llama-3.2-3b-instruct", {
			messages: [
				{
					role: "system",
					content: vectorizeIndex
						? "あなたは親切で知識豊富なAIアシスタントです。提供されたLINEチャット履歴の文脈を理解し、過去の会話内容を参考にしながら、日本語で丁寧で詳細な回答を提供してください。関連する過去の情報がある場合は、それを活用して回答の質を高めてください。"
						: "あなたは親切で知識豊富なAIアシスタントです。日本語で丁寧で詳細な回答を提供してください。",
				},
				{
					role: "user",
					content: contextualPrompt,
				},
			],
			max_tokens: 200, // RAGの場合はより詳細な回答を許可
			temperature: 0.3,
		});

		let responseText = "";
		if (aiResponse && typeof aiResponse === "object") {
			const response = aiResponse as Record<string, unknown>;
			responseText =
				(response.response as string) ||
				(response.result as string) ||
				(response.answer as string) ||
				"";
		}

		if (responseText.trim()) {
			// Prepare enhanced response message
			const messagePrefix = ragContext
				? "📚 過去の会話を参考にした詳細回答:"
				: "💡 より詳しい回答です:";

			// Send follow-up message using Push API
			await client.pushMessage({
				to: targetId,
				messages: [
					{
						type: "text",
						text: `${messagePrefix} ${responseText}`,
					},
				],
			});
			console.log("Enhanced AI response sent successfully");
		}
	} catch (error) {
		console.error("Background processing failed:", error);
		// Don't send error message to user - they already got a fallback response
	}
}
