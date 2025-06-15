import { CloudflareWorkersAIEmbeddings } from "@langchain/cloudflare";
import { CloudflareVectorizeStore } from "@langchain/cloudflare";
import { Document } from "@langchain/core/documents";
import { validateSignature, messagingApi } from "@line/bot-sdk";
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

// Health check endpoint
app.get("/", (c) => {
	return c.json({
		message: "LINE Talk RAG System",
		version: "1.0.1",
		status: "production",
		endpoints: ["/prepare", "/webhook"],
		features: {
			workersAI: "enabled (mistral-7b)",
			ragPipeline: "available",
			echoBot: "fallback"
		}
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

					// === RAG Implementation (Commented for testing) ===
					// const embeddings = new CloudflareWorkersAIEmbeddings({
					// binding: c.env.AI,
					// modelName: "@cf/baai/bge-m3",
					// });
					// const vectorStore = new CloudflareVectorizeStore(embeddings, {
					// index: c.env.VECTORIZE,
					// });
					// const results = await vectorStore.similaritySearch(userMessage, 3);
					// const context = results.map((doc) => doc.pageContent).join("\n\n");
					// === End of RAG Implementation ===

					// === Workers AI LLM Implementation (Production Optimized) ===
					try {
						// Set timeout for AI generation (8 seconds for Workers limit)
						const AI_TIMEOUT = 8000;
						
						const aiPromise = c.env.AI.run(
							"@cf/mistral/mistral-7b-instruct-v0.1",
							{
								messages: [
									{
										role: "system",
										content: "You are a helpful AI assistant. Keep responses brief and engaging (under 100 words)."
									},
									{
										role: "user",
										content: userMessage
									}
								],
								max_tokens: 150
							}
						);

						const timeoutPromise = new Promise((_, reject) => 
							setTimeout(() => reject(new Error('AI generation timeout')), AI_TIMEOUT)
						);

						const aiResponse = await Promise.race([aiPromise, timeoutPromise]);

						// Extract response text from AI response
						let responseText = "";
						if (aiResponse && typeof aiResponse === 'object') {
							const response = aiResponse as Record<string, unknown>;
							if (response.response && typeof response.response === 'string') {
								responseText = response.response;
							} else if (response.result && typeof response.result === 'string') {
								responseText = response.result;
							} else {
								responseText = "I received your message but couldn't process it properly.";
							}
						} else {
							responseText = "Sorry, I'm having trouble processing your request.";
						}

						// Validate response text
						if (!responseText || responseText.trim().length === 0) {
							responseText = "I'm processing your message but couldn't generate a proper response.";
						}

						// Send reply to LINE with timeout
						const replyPromise = client.replyMessage({
							replyToken: event.replyToken,
							messages: [{
								type: "text",
								text: responseText,
							}],
						});

						const replyTimeoutPromise = new Promise((_, reject) => 
							setTimeout(() => reject(new Error('LINE reply timeout')), 3000)
						);

						await Promise.race([replyPromise, replyTimeoutPromise]);
						
					} catch (aiError) {
						console.error("AI generation failed, falling back to echo:", aiError);
						
						// Fallback to Echo Bot if AI fails
						const echoMessage = `Echo: ${userMessage}`;
						
						try {
							await client.replyMessage({
								replyToken: event.replyToken,
								messages: [{
									type: "text",
									text: echoMessage,
								}],
							});
						} catch (echoError) {
							console.error("Echo fallback also failed:", echoError);
						}
					}
					// === End of Workers AI LLM Implementation ===

				} else if (event.type === "follow") {
					// Handle follow event (user adds bot as friend)
					await client.replyMessage({
						replyToken: event.replyToken,
						messages: [{
							type: "text",
							text: "Thanks for adding me! I'm powered by Workers AI. 🤖",
						}],
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
