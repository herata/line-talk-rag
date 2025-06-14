// TypeScript interfaces for parsed LINE talk history data
interface LineMessage {
	date: string;
	time: string;
	sender: string;
	message: string;
	isSystemMessage: boolean;
}

interface ParsedLineTalkHistory {
	partnerName: string;
	saveDateTime: string;
	messages: LineMessage[];
}

function parseLineTalkHistory(rawText: string): ParsedLineTalkHistory {
    const lines = rawText.trim().split('\n');
    let partnerName = '';
    let saveDateTime = '';
    const messages: LineMessage[] = [];
    let currentDate = '';

    if (lines.length < 2) {
        // Not enough lines for basic info, return empty or throw error
        // For now, returning a default structure
        return { partnerName: '', saveDateTime: '', messages: [] };
    }

    const partnerNameMatch = lines[0]?.match(/^\[LINE\] (.+)とのトーク履歴$/);
    if (partnerNameMatch?.[1]) {
        partnerName = partnerNameMatch[1];
    }

    const saveDateTimeMatch = lines[1]?.match(/^保存日時：(.+)$/);
    if (saveDateTimeMatch?.[1]) {
        saveDateTime = saveDateTimeMatch[1];
    }

    // Regex for date line: e.g., "2024/1/23(火)"
    const dateLineRegex = /^(\d{4}\/\d{1,2}\/\d{1,2})\((?:月|火|水|木|金|土|日)\)$/;
    // Regex for message line: e.g., "9:20	平田 傑	おは！"
    // Allows for various characters in sender and message, including spaces and special characters.
    const messageLineRegex = /^(\d{1,2}:\d{2})\t([^\t]+)\t(.+)$/;

    for (let i = 2; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines

        const dateMatch = line.match(dateLineRegex);
        if (dateMatch?.[1]) {
            currentDate = dateMatch[1];
            messages.push({
                date: currentDate,
                time: '', // No time for a date line itself
                sender: 'System', // Indicates this is a system-generated entry for the date
                message: line, // Store the original date line as the message
                isSystemMessage: true,
            });
            continue;
        }

        const messageMatch = line.match(messageLineRegex);
        if (messageMatch?.[1] && messageMatch[2] && messageMatch[3]) {
            messages.push({
                date: currentDate, // Use the last seen date
                time: messageMatch[1],
                sender: messageMatch[2],
                message: messageMatch[3],
                isSystemMessage: false, // This is an actual user/partner message
            });
        } else {
            // Optional: Handle lines that are not date lines and not standard message lines.
            // These could be multi-line messages (if the split by '\n' was too simple),
            // or other system messages/notifications from LINE.
            // For this iteration, we'll add them as system messages if a date context exists.
            if (currentDate && line.length > 0) { // Only add if a date context exists and line is not empty
                 messages.push({
                    date: currentDate,
                    time: '',
                    sender: 'System',
                    message: line,
                    isSystemMessage: true,
                });
            }
        }
    }

    return {
        partnerName,
        saveDateTime,
        messages,
    };
}

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
		endpoints: ["/prepare", "/webhook"],
		features: {
			workersAI: "enabled (testing mode)",
			echoBot: "fallback enabled",
			ragPipeline: "available (commented out)",
		}
	});
});

// Prepare endpoint - for processing LINE chat history
app.post("/prepare", async (c) => {
	try {
		// Ensure the request body is treated as plain text
		const rawText = await c.req.text();

		if (!rawText || typeof rawText !== "string") {
			return c.json({ error: "Invalid text input" }, 400);
		}

		const parsedHistory = parseLineTalkHistory(rawText);

		// Initialize text splitter
		const splitter = new RecursiveCharacterTextSplitter({
			chunkSize: 1000,
			chunkOverlap: 200,
		});

		// Initialize embeddings with Workers AI
		const embeddings = new CloudflareWorkersAIEmbeddings({
			binding: c.env.AI,
			modelName: "@cf/baai/bge-m3",
		});

		// Initialize Vectorize store
		// Note: Ensure c.env.VECTORIZE is the correct Vectorize index binding name
		const vectorStore = new CloudflareVectorizeStore(embeddings, {
			index: c.env.VECTORIZE,
		});

		const documentsToStore: Document[] = [];

		for (const message of parsedHistory.messages) {
			if (!message.isSystemMessage) {
				const messageText = `${message.date} ${message.time} ${message.sender}: ${message.message}`;

				// Create Document objects for each message string
				const messageDocs = await splitter.createDocuments(
					[messageText], // Process one message string at a time
					[{ // Metadata for this specific message string
						partnerName: parsedHistory.partnerName,
						saveDateTime: parsedHistory.saveDateTime,
						originalDate: message.date,
						originalTime: message.time,
						originalSender: message.sender,
					}]
				);
				documentsToStore.push(...messageDocs);
			}
		}

		if (documentsToStore.length > 0) {
			await vectorStore.addDocuments(documentsToStore);
			return c.json({
				success: true,
				message: `Successfully processed and stored ${documentsToStore.length} document(s).`,
				partnerName: parsedHistory.partnerName,
				saveDateTime: parsedHistory.saveDateTime,
			});
		} else {
			return c.json({
				success: false,
				message: "No messages found to process.",
				partnerName: parsedHistory.partnerName,
				saveDateTime: parsedHistory.saveDateTime,
			});
		}
	} catch (error) {
		console.error("Error in /prepare:", error);
		// Check if error is an instance of Error to safely access message
		const errorMessage = error instanceof Error ? error.message : "Unknown error";
		return c.json({ error: "Internal server error", details: errorMessage }, 500);
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
					try {
						// Generate response using Workers AI LLM
						const aiResponse = (await c.env.AI.run(
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
						)) as { response: string };

						// Extract response text from AI response
						const responseText = aiResponse.response || "Sorry, I couldn't generate a response.";

						await client.replyMessage({
							replyToken: event.replyToken,
							messages: [
								{
									type: "text",
									text: responseText,
								}
							],
						});
						
						console.log("AI response sent successfully:", responseText);
						
					} catch (aiError) {
						console.error("AI generation failed, falling back to echo:", aiError);
						
						// Fallback to Echo Bot if AI fails
						const echoMessage = `Echo: ${userMessage}`;
						
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
