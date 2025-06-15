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

				// Search for relevant documents from stored chat history (increased count for better context)
				const results = await vectorStore.similaritySearch(userMessage, 5);

				if (results.length > 0) {
					console.log(`Found ${results.length} relevant documents`);

					// Prepare comprehensive context from search results
					ragContext = results
						.map((doc, index) => {
							// Include more metadata for better context
							const metadata = doc.metadata || {};
							const timestamp = metadata.timestamp
								? ` [${metadata.timestamp}]`
								: "";
							const participant = metadata.participant
								? ` (${metadata.participant})`
								: "";

							return `[関連情報 ${index + 1}]${timestamp}${participant}\n${doc.pageContent}`;
						})
						.join("\n\n");

					// Create detailed prompt with comprehensive context
					contextualPrompt = `あなたは過去のLINEチャット履歴を参照できるAIアシスタントです。以下の関連する過去の会話内容を詳しく分析して、現在の質問に対する最適な回答を提供してください。

【過去の関連会話】:
${ragContext}

【現在の質問】: ${userMessage}

【回答指針】:
1. 過去の会話内容から関連する情報を積極的に活用してください
2. 文脈や背景を理解して、より詳細で的確な回答を心がけてください
3. 過去の会話で言及された内容があれば、それを踏まえて回答してください
4. 関連情報がない場合は、一般的な知識で丁寧に回答してください
5. 日本語で自然で読みやすい回答を提供してください

回答をお願いします:`;
				} else {
					console.log("No relevant documents found, using general response");
					contextualPrompt = `以下の質問に対して、丁寧で詳細な日本語回答を提供してください。

質問: ${userMessage}

親切で知識豊富なAIアシスタントとして、適切で有用な回答をお願いします。`;
				}
			} catch (ragError) {
				console.error(
					"RAG processing failed, falling back to general response:",
					ragError,
				);
				// Continue with general response if RAG fails
			}
		}

		// Use enhanced LLM for background processing with optimized parameters
		console.log("Calling background AI with enhanced model...");
		const aiResponse = await AI.run("@cf/meta/llama-3.1-8b-instruct", {
			messages: [
				{
					role: "system",
					content: vectorizeIndex
						? "あなたは過去のLINEチャット履歴を参照できる親切で知識豊富なAIアシスタントです。提供された過去の会話内容を詳しく分析し、文脈を理解して、現在の質問に対する最適で詳細な日本語回答を提供してください。過去の情報がある場合は積極的に活用し、関連性を明確にして回答の質を高めてください。"
						: "あなたは親切で知識豊富なAIアシスタントです。質問者の意図を理解し、丁寧で詳細かつ有用な日本語回答を提供してください。",
				},
				{
					role: "user",
					content: contextualPrompt,
				},
			],
			max_tokens: 400, // Increased for higher quality model
			temperature: 0.2, // Balanced creativity and consistency
			stream: false,
		});

		console.log(
			"Background AI response received:",
			JSON.stringify(aiResponse, null, 2),
		);

		let responseText = "";

		try {
			if (aiResponse && typeof aiResponse === "object") {
				const response = aiResponse as Record<string, unknown>;
				console.log("Background response keys:", Object.keys(response));

				// Comprehensive response extraction
				if (response.response && typeof response.response === "string") {
					responseText = response.response.trim();
					console.log("Background: Found response in 'response' field");
				} else if (response.result && typeof response.result === "string") {
					responseText = response.result.trim();
					console.log("Background: Found response in 'result' field");
				} else if (response.answer && typeof response.answer === "string") {
					responseText = response.answer.trim();
					console.log("Background: Found response in 'answer' field");
				} else if (response.text && typeof response.text === "string") {
					responseText = response.text.trim();
					console.log("Background: Found response in 'text' field");
				} else {
					// Check nested structures
					const nestedResponse = response.result || response.response;
					if (nestedResponse && typeof nestedResponse === "object") {
						const nested = nestedResponse as Record<string, unknown>;
						console.log("Background: Nested object keys:", Object.keys(nested));

						if (nested.response && typeof nested.response === "string") {
							responseText = nested.response.trim();
							console.log(
								"Background: Found response in nested 'response' field",
							);
						} else if (nested.text && typeof nested.text === "string") {
							responseText = nested.text.trim();
							console.log("Background: Found response in nested 'text' field");
						} else if (nested.content && typeof nested.content === "string") {
							responseText = nested.content.trim();
							console.log(
								"Background: Found response in nested 'content' field",
							);
						}
					}
				}
			}
		} catch (extractError) {
			console.error(
				"Background: Error extracting response text:",
				extractError,
			);
		}

		console.log(`Background: Final extracted response text: "${responseText}"`);
		console.log(`Background: Response text length: ${responseText.length}`);

		if (responseText.trim()) {
			// Enhanced response message with RAG context indicator
			let messagePrefix = "";
			if (ragContext) {
				messagePrefix = "📚 過去のチャット履歴を参考にした詳細回答:\n\n";
			} else {
				messagePrefix = "🤖 AI回答:\n\n";
			}

			// Send detailed follow-up message using Push API
			await client.pushMessage({
				to: targetId,
				messages: [
					{
						type: "text",
						text: `${messagePrefix}${responseText}`,
					},
				],
			});
			console.log("Enhanced RAG response sent successfully");
		} else {
			console.error("Background processing produced no response text");
			// Send fallback message
			await client.pushMessage({
				to: targetId,
				messages: [
					{
						type: "text",
						text: "申し訳ございません。回答の生成に失敗しました。もう一度お試しください。🙏",
					},
				],
			});
		}
	} catch (error) {
		console.error("Background processing failed:", error);
		// Don't send error message to user - they already got a fallback response
	}
}
