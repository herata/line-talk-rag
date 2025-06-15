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
		version: "1.0.0",
		mode: "debugging",
		endpoints: ["/prepare", "/webhook", "/test-ai", "/test-webhook"],
		features: {
			workersAI: "enabled (debugging mode)",
			echoBot: "fallback enabled",
			ragPipeline: "available (commented out)",
			logging: "enhanced for debugging",
			testWebhook: "signature verification disabled"
		},
		debug: {
			timestamp: new Date().toISOString(),
			environment: "development"
		}
	});
});

// Test endpoint for AI functionality
app.post("/test-ai", async (c) => {
	try {
		const { message } = await c.req.json();
		
		if (!message || typeof message !== "string") {
			return c.json({ error: "Invalid message input" }, 400);
		}

		console.log("Testing AI with message:", message);
		
		const aiResponse = await c.env.AI.run(
			"@cf/meta/llama-2-7b-chat-int8",
			{
				messages: [
					{
						role: "system",
						content: "You are a helpful and friendly AI assistant. Respond to the user's message in a natural, conversational way. Keep your responses concise and engaging."
					},
					{
						role: "user",
						content: message
					}
				]
			}
		);

		console.log("AI test response:", JSON.stringify(aiResponse, null, 2));

		return c.json({
			input: message,
			aiResponse: aiResponse,
			timestamp: new Date().toISOString()
		});
		
	} catch (error) {
		console.error("Error in /test-ai:", error);
		return c.json({ 
			error: "AI test failed", 
			details: error instanceof Error ? error.message : String(error) 
		}, 500);
	}
});

// Test endpoint for webhook processing (without signature verification)
app.post("/test-webhook", async (c) => {
	try {
		// Get request body without signature verification for testing
		const body = await c.req.text();
		console.log("Test webhook received body:", body);

		const client = new messagingApi.MessagingApiClient({
			channelAccessToken: c.env.LINE_CHANNEL_ACCESS_TOKEN,
		});

		// Parse webhook events
		const events = JSON.parse(body).events;
		console.log("Test webhook parsed events:", JSON.stringify(events, null, 2));

		for (const event of events) {
			try {
				console.log("Processing test event:", JSON.stringify(event, null, 2));
				
				if (event.type === "message" && event.message.type === "text") {
					const userMessage = event.message.text;

					console.log("Processing test message:", userMessage);
					console.log("Test event replyToken:", event.replyToken);
					
					try {
						console.log("Attempting AI generation for test...");
						
						// Generate response using Workers AI LLM
						const aiResponse = await c.env.AI.run(
							"@cf/meta/llama-2-7b-chat-int8",
							{
								messages: [
									{
										role: "system",
										content: "You are a helpful and friendly AI assistant. Respond to the user's message in a natural, conversational way. Keep your responses concise and engaging."
									},
									{
										role: "user",
										content: userMessage
									}
								]
							}
						);

						console.log("Test AI response received:", JSON.stringify(aiResponse, null, 2));

						// Extract response text from AI response - with better validation
						let responseText = "";
						if (aiResponse && typeof aiResponse === 'object') {
							const response = aiResponse as Record<string, unknown>;
							if (response.response && typeof response.response === 'string') {
								responseText = response.response;
							} else if (response.result && typeof response.result === 'string') {
								responseText = response.result;
							} else {
								console.log("Unexpected AI response structure in test:", aiResponse);
								responseText = "Test: I received your message but couldn't process it properly.";
							}
						} else {
							console.log("Invalid AI response format in test:", typeof aiResponse);
							responseText = "Test: Sorry, I'm having trouble processing your request.";
						}

						// Validate response text
						if (!responseText || responseText.trim().length === 0) {
							console.log("Empty response from AI in test, using fallback");
							responseText = "Test: I'm processing your message but couldn't generate a proper response.";
						}

						console.log("Test final response text:", responseText);

						// For testing, we'll just return the response instead of calling LINE API
						return c.json({
							status: "success",
							originalMessage: userMessage,
							aiResponse: responseText,
							replyToken: event.replyToken,
							timestamp: new Date().toISOString()
						});
						
					} catch (aiError) {
						console.error("AI generation failed in test, falling back to echo:", aiError);
						console.error("Test error details:", JSON.stringify(aiError, null, 2));
						
						// Fallback to Echo Bot if AI fails
						const echoMessage = `Test Echo: ${userMessage}`;
						
						return c.json({
							status: "fallback",
							originalMessage: userMessage,
							echoResponse: echoMessage,
							replyToken: event.replyToken,
							error: aiError instanceof Error ? aiError.message : String(aiError),
							timestamp: new Date().toISOString()
						});
					}

				} else {
					console.log("Test: Unhandled event type:", event.type);
					return c.json({
						status: "unhandled",
						eventType: event.type,
						timestamp: new Date().toISOString()
					});
				}
			} catch (eventError) {
				console.error("Error processing test event:", eventError);
				return c.json({
					status: "event_error",
					error: eventError instanceof Error ? eventError.message : String(eventError),
					timestamp: new Date().toISOString()
				}, 500);
			}
		}

		return c.json({ status: "OK", timestamp: new Date().toISOString() });
	} catch (error) {
		console.error("Error in /test-webhook:", error);
		return c.json({ 
			error: "Test webhook failed", 
			details: error instanceof Error ? error.message : String(error) 
		}, 500);
	}
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

					// === RAG Implementation (Commented for Echo Bot Testing) ===
					// // Initialize embeddings
					// const embeddings = new CloudflareWorkersAIEmbeddings({
					// 	binding: c.env.AI,
					// 	modelName: "@cf/baai/bge-m3",
					// });

					// // Initialize vector store for similarity search
					// const vectorStore = new CloudflareVectorizeStore(embeddings, {
					// 	index: c.env.VECTORIZE,
					// });

					// // Search for relevant documents
					// const results = await vectorStore.similaritySearch(userMessage, 3);

					// // Prepare context for LLM
					// const context = results.map((doc) => doc.pageContent).join("\n\n");

					// // Generate response using Workers AI LLM
					// const aiResponse = (await c.env.AI.run(
					// 	"@cf/meta/llama-2-7b-chat-int8",
					// 	{
					// 		messages: [
					// 			{
					// 				role: "system",
					// 				content:
					// 					"You are a helpful assistant that answers questions based on the provided context from LINE chat history. If the context doesn't contain relevant information, say so politely.",
					// 			},
					// 			{
					// 				role: "user",
					// 				content: `Context from chat history:\n${context}\n\nQuestion: ${userMessage}`,
					// 			},
					// 		],
					// 	},
					// )) as { response: string };

					// // Extract response text from AI response
					// const responseText =
					// 	aiResponse.response || "Sorry, I couldn't generate a response.";

					// // Send reply to LINE (Note: This is a simplified example)
					// // In production, you would use LINE Messaging API to send replies
					// console.log("Generated response:", responseText);
					// === End of RAG Implementation ===

					// === Workers AI LLM Test Implementation ===
					console.log("Processing message:", userMessage);
					console.log("Event replyToken:", event.replyToken);
					
					try {
						console.log("Attempting AI generation...");
						
						// Generate response using Workers AI LLM
						const aiResponse = await c.env.AI.run(
							"@cf/meta/llama-2-7b-chat-int8",
							{
								messages: [
									{
										role: "system",
										content: "You are a helpful and friendly AI assistant. Respond to the user's message in a natural, conversational way. Keep your responses concise and engaging."
									},
									{
										role: "user",
										content: userMessage
									}
								]
							}
						);

						console.log("AI response received:", JSON.stringify(aiResponse, null, 2));

						// Extract response text from AI response - with better validation
						let responseText = "";
						if (aiResponse && typeof aiResponse === 'object') {
							const response = aiResponse as Record<string, unknown>;
							if (response.response && typeof response.response === 'string') {
								responseText = response.response;
							} else if (response.result && typeof response.result === 'string') {
								// Some models might use 'result' instead of 'response'
								responseText = response.result;
							} else {
								console.log("Unexpected AI response structure:", aiResponse);
								responseText = "I received your message but couldn't process it properly.";
							}
						} else {
							console.log("Invalid AI response format:", typeof aiResponse);
							responseText = "Sorry, I'm having trouble processing your request.";
						}

						// Validate response text
						if (!responseText || responseText.trim().length === 0) {
							console.log("Empty response from AI, using fallback");
							responseText = "I'm processing your message but couldn't generate a proper response.";
						}

						console.log("Final response text:", responseText);

						// Send reply to LINE
						const replyResult = await client.replyMessage({
							replyToken: event.replyToken,
							messages: [
								{
									type: "text",
									text: responseText,
								}
							],
						});
						
						console.log("LINE reply result:", replyResult);
						console.log("AI response sent successfully for message:", userMessage);
						
					} catch (aiError) {
						console.error("AI generation failed, falling back to echo:", aiError);
						console.error("Error details:", JSON.stringify(aiError, null, 2));
						
						// Fallback to Echo Bot if AI fails
						const echoMessage = `Echo: ${userMessage}`;
						
						try {
							await client.replyMessage({
								replyToken: event.replyToken,
								messages: [
									{
										type: "text",
										text: echoMessage,
									}
								],
							});
							
							console.log("Echo fallback reply sent:", echoMessage);
						} catch (echoError) {
							console.error("Echo fallback also failed:", echoError);
						}
					}
					// === End of Workers AI LLM Test Implementation ===

				} else if (event.type === "follow") {
					// Handle follow event (user adds bot as friend)
					await client.replyMessage({
						replyToken: event.replyToken,
						messages: [
							{
								type: "text",
								text: "Thanks for adding me! I'm now powered by Workers AI and can have conversations with you. 🤖✨\n\n(Currently in AI testing mode with Echo Bot fallback. RAG functionality is available but commented out.)",
							}
						],
					});
					
					console.log("Welcome message sent for follow event");
				
				} else {
					console.log("Unhandled event type:", event.type);
				}
			} catch (eventError) {
				console.error("Error processing event:", eventError);
				// Continue processing other events even if one fails
			}
		}

		return c.json({ status: "OK" });
	} catch (error) {
		console.error("Error in /webhook:", error);
		return c.json({ error: "Internal server error" }, 500);
	}
});

export default app;
