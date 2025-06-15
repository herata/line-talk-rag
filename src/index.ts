import { CloudflareWorkersAIEmbeddings } from "@langchain/cloudflare";
import { CloudflareVectorizeStore } from "@langchain/cloudflare";
import { Document } from "@langchain/core/documents";
import { messagingApi, validateSignature } from "@line/bot-sdk";
import { Hono } from "hono";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

// Type definitions
type CloudflareBindings = {
	AI: Ai;
	VECTORIZE: VectorizeIndex;
	LINE_CHANNEL_SECRET: string;
	LINE_CHANNEL_ACCESS_TOKEN: string;
};

const app = new Hono<{ Bindings: CloudflareBindings }>();

// Background processing function for better AI responses
async function processMessageInBackground(
	AI: Ai,
	client: messagingApi.MessagingApiClient,
	userId: string,
	userMessage: string,
): Promise<void> {
	try {
		console.log("Background processing started for:", userMessage);

		// Use longer timeout for background processing
		const aiResponse = await AI.run("@cf/meta/llama-3.2-3b-instruct", {
			messages: [
				{
					role: "system",
					content:
						"あなたは親切で知識豊富なAIアシスタントです。日本語で丁寧で詳細な回答を提供してください。",
				},
				{
					role: "user",
					content: userMessage,
				},
			],
			max_tokens: 150, // バランス重視でより高速に
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
			// Send follow-up message using Push API
			await client.pushMessage({
				to: userId,
				messages: [
					{
						type: "text",
						text: `💡 より詳しい回答です: ${responseText}`,
					},
				],
			});
			console.log("Background AI response sent successfully");
		}
	} catch (error) {
		console.error("Background processing failed:", error);
		// Don't send error message to user - they already got a fallback response
	}
}

// Health check endpoint
app.get("/", (c) => {
	return c.json({
		message: "LINE Talk RAG System",
		version: "1.0.3",
		status: "production",
		endpoints: ["/prepare", "/webhook"],
		features: {
			workersAI: "enabled (qwen1.5-0.5b fast + llama-3.2-3b balanced)",
			strategy: "immediate response with fallback",
			backgroundProcessing: "enabled with Push API",
			optimizations: "balanced speed and quality, deterministic",
			language: "Japanese optimized",
		},
	});
});

// Prepare endpoint - for processing LINE chat history
app.post("/prepare", async (c) => {
	try {
		const { text } = await c.req.json();

		if (!text || typeof text !== "string") {
			return c.json({ error: "Invalid text input" }, 400);
		}

		// Initialize text splitter
		const textSplitter = new RecursiveCharacterTextSplitter({
			chunkSize: 1000,
			chunkOverlap: 200,
		});

		// Split text into chunks
		const docs = await textSplitter.createDocuments([text]);

		// Initialize embeddings with Workers AI
		const embeddings = new CloudflareWorkersAIEmbeddings({
			binding: c.env.AI,
			modelName: "@cf/baai/bge-m3",
		});

		// Initialize Vectorize store
		const vectorStore = new CloudflareVectorizeStore(embeddings, {
			index: c.env.VECTORIZE,
		});

		// Add documents to vector store
		await vectorStore.addDocuments(docs);

		return c.json({
			message: "Text processed successfully",
			chunksProcessed: docs.length,
		});
	} catch (error) {
		console.error("Error in /prepare:", error);
		return c.json({ error: "Internal server error" }, 500);
	}
});

// LINE webhook endpoint
app.post("/webhook", async (c) => {
	try {
		// Get request body and headers for signature verification
		const body = await c.req.text();
		const signature = c.req.header("x-line-signature");

		if (!signature) {
			return c.json({ error: "Missing LINE signature" }, 400);
		}

		// Verify LINE webhook signature
		const isValidSignature = validateSignature(
			body,
			c.env.LINE_CHANNEL_SECRET,
			signature,
		);

		if (!isValidSignature) {
			return c.json({ error: "Invalid signature" }, 400);
		}

		const client = new messagingApi.MessagingApiClient({
			channelAccessToken: c.env.LINE_CHANNEL_ACCESS_TOKEN,
		});

		// Parse webhook events
		const events = JSON.parse(body).events;

		for (const event of events) {
			try {
				if (event.type === "message" && event.message.type === "text") {
					const userMessage = event.message.text;
					const replyToken = event.replyToken;

					// === Immediate Response Strategy for Cloudflare Workers ===
					// Send immediate acknowledgment and process AI in background

					console.log(`Processing message: "${userMessage}"`);

					// Strategy 1: Fast AI call with aggressive timeout
					try {
						// Ultra-fast timeout optimized for Cloudflare Workers
						const AI_TIMEOUT = 4000; // 4 seconds max

						console.log("Sending request to AI...");
						const startTime = Date.now();

						const aiPromise = c.env.AI.run("@cf/qwen/qwen1.5-0.5b-chat", {
							messages: [
								{
									role: "system",
									content:
										"あなたは親切なAIアシスタントです。簡潔で直接的な日本語の回答をしてください。",
								},
								{
									role: "user",
									content: userMessage,
								},
							],
							max_tokens: 50, // Reduced for speed
							temperature: 0.1, // More deterministic = faster
							stream: false,
						});

						const timeoutPromise = new Promise((_, reject) =>
							setTimeout(() => reject(new Error("AI timeout")), AI_TIMEOUT),
						);

						const aiResponse = await Promise.race([aiPromise, timeoutPromise]);
						const processingTime = Date.now() - startTime;
						console.log(`AI response received in ${processingTime}ms`);

						// Extract response text quickly
						let responseText = "";
						if (aiResponse && typeof aiResponse === "object") {
							const response = aiResponse as Record<string, unknown>;
							responseText =
								(response.response as string) ||
								(response.result as string) ||
								(response.answer as string) ||
								"";
						}

						if (!responseText.trim()) {
							responseText = "メッセージを考えています...";
						}

						console.log("Sending reply to LINE...");
						await client.replyMessage({
							replyToken: replyToken,
							messages: [
								{
									type: "text",
									text: responseText,
								},
							],
						});
						console.log("Reply sent successfully!");
					} catch (fastAiError) {
						console.error("Fast AI failed:", fastAiError);

						// Strategy 2: Immediate fallback response + background processing
						try {
							const fallbackMessages = [
								"メッセージを処理中です。少々お待ちください！ 🤔",
								"考えています...少しお時間をください！ 💭",
								"AIがメッセージを処理しています... ⚡",
								"回答を作成中です！ 🔄",
								"メッセージを受信して、考えています！ 🧠",
							];

							const randomMessage =
								fallbackMessages[
									Math.floor(Math.random() * fallbackMessages.length)
								];

							await client.replyMessage({
								replyToken: replyToken,
								messages: [
									{
										type: "text",
										text: randomMessage,
									},
								],
							});
							console.log("Fallback response sent");

							// Background processing for better AI response (no await)
							// This will run after the webhook response is sent
							if (event.source?.userId) {
								console.log("Starting background AI processing...");
								c.executionCtx.waitUntil(
									processMessageInBackground(
										c.env.AI,
										client,
										event.source.userId,
										userMessage,
									),
								);
							}
						} catch (fallbackError) {
							console.error("Fallback response also failed:", fallbackError);
						}
					}
				} else if (event.type === "follow") {
					// Handle follow event (user adds bot as friend)
					await client.replyMessage({
						replyToken: event.replyToken,
						messages: [
							{
								type: "text",
								text: "友達追加ありがとうございます！Workers AIを搭載したチャットボットです。お気軽にお話しください！ 🤖💬",
							},
						],
					});
				} else {
					// Unhandled event type - no action needed
				}
			} catch (eventError) {
				console.error("Error processing event:", eventError);
			}
		}

		return c.json({ status: "OK" });
	} catch (error) {
		console.error("Error in /webhook:", error);
		return c.json({ error: "Internal server error" }, 500);
	}
});

export default app;
