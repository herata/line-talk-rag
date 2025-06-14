import { CloudflareWorkersAIEmbeddings } from "@langchain/cloudflare";
import { CloudflareVectorizeStore } from "@langchain/cloudflare";
import { Document } from "@langchain/core/documents";
import { validateSignature } from "@line/bot-sdk";
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
		endpoints: ["/prepare", "/webhook"],
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

		// Parse webhook events
		const events = JSON.parse(body).events;

		for (const event of events) {
			if (event.type === "message" && event.message.type === "text") {
				const userMessage = event.message.text;

				// Initialize embeddings
				const embeddings = new CloudflareWorkersAIEmbeddings({
					binding: c.env.AI,
					modelName: "@cf/baai/bge-m3",
				});

				// Initialize vector store for similarity search
				const vectorStore = new CloudflareVectorizeStore(embeddings, {
					index: c.env.VECTORIZE,
				});

				// Search for relevant documents
				const results = await vectorStore.similaritySearch(userMessage, 3);

				// Prepare context for LLM
				const context = results.map((doc) => doc.pageContent).join("\n\n");

				// Generate response using Workers AI LLM
				const aiResponse = (await c.env.AI.run(
					"@cf/meta/llama-2-7b-chat-int8",
					{
						messages: [
							{
								role: "system",
								content:
									"You are a helpful assistant that answers questions based on the provided context from LINE chat history. If the context doesn't contain relevant information, say so politely.",
							},
							{
								role: "user",
								content: `Context from chat history:\n${context}\n\nQuestion: ${userMessage}`,
							},
						],
					},
				)) as { response: string };

				// Extract response text from AI response
				const responseText =
					aiResponse.response || "Sorry, I couldn't generate a response.";

				// Send reply to LINE (Note: This is a simplified example)
				// In production, you would use LINE Messaging API to send replies
				console.log("Generated response:", responseText);

				// TODO: Implement actual LINE reply using @line/bot-sdk
				// For now, we just log the response
			}
		}

		return c.json({ status: "OK" });
	} catch (error) {
		console.error("Error in /webhook:", error);
		return c.json({ error: "Internal server error" }, 500);
	}
});

export default app;
