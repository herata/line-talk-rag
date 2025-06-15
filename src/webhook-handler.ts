import { messagingApi, validateSignature } from "@line/bot-sdk";
import { CloudflareWorkersAIEmbeddings } from "@langchain/cloudflare";
import { CloudflareVectorizeStore } from "@langchain/cloudflare";
import type { Context } from "hono";
import { processMessageInBackground } from "./background-processor";
import type { CloudflareBindings } from "./types";

/**
 * LINE webhook endpoint handler
 * Processes incoming LINE messages with immediate response and background AI processing
 */
export async function handleWebhook(
	c: Context<{ Bindings: CloudflareBindings }>,
) {
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
				// === アクセス制御: 許可されたトークルームのみメッセージ処理 ===
				if (c.env.ALLOWED_TALK_ROOMS) {
					const allowedIds = c.env.ALLOWED_TALK_ROOMS.split(',').map(id => id.trim());
					
					// ソースタイプに応じて適切なIDを取得
					let sourceId: string | undefined;
					let sourceType: string | undefined;
					
					if (event.source?.type === "user") {
						sourceId = event.source.userId;
						sourceType = "User";
					} else if (event.source?.type === "group") {
						sourceId = event.source.groupId;
						sourceType = "Group";
					} else if (event.source?.type === "room") {
						sourceId = event.source.roomId;
						sourceType = "Room";
					}
					
					if (sourceId && !allowedIds.includes(sourceId)) {
						console.log(`Message access denied for source ID: ${sourceId}. Bot usage restricted to allowed talk rooms only.`);
						console.log(`Source details - Type: ${event.source?.type}, ID: ${sourceId}`);
						
						// アクセス制限の案内メッセージを送信
						try {
							await client.replyMessage({
								replyToken: event.replyToken,
								messages: [
									{
										type: "text",
										text: `申し訳ございません。このボットは現在、特定の許可されたトークルームでのみご利用いただけます。🚫\n\nご利用希望の場合は、管理者にお問い合わせください。\n\n📋 参考情報:\nSource Type: ${event.source?.type} (${sourceType})\nSource ID: ${sourceId}\n\n💡 ALLOWED_TALK_ROOMS設定にこのIDを追加してください。`,
									},
								],
							});
						} catch (replyError) {
							console.error("Failed to send access restriction message:", replyError);
						}
						
						continue;
					}
				}

				if (event.type === "message" && event.message.type === "text") {
					const userMessage = event.message.text;
					const replyToken = event.replyToken;
					
					// ソースタイプに応じて適切なIDを取得（ログ用）
					const logSourceId = event.source?.type === "user" ? event.source.userId
						: event.source?.type === "group" ? event.source.groupId
						: event.source?.type === "room" ? event.source.roomId
						: "unknown";
					
					// デバッグ用: 全てのメッセージでSource情報をログ出力
					console.log(`Message received - Type: ${event.source?.type}, ID: ${logSourceId}, Message: "${userMessage}"`);				// 特別コマンド: IDを確認
				if (userMessage === "/id" || userMessage === "/info" || userMessage === "id確認") {
					// 詳細なソース情報を構築
					const sourceInfo = [];
					sourceInfo.push("📋 トークルーム情報");
					sourceInfo.push(`\nSource Type: ${event.source?.type}`);
					
					if (event.source?.type === "user") {
						sourceInfo.push(`User ID: ${event.source.userId}`);
						sourceInfo.push(`\n💡 アクセス制御用ID: ${event.source.userId}`);
					} else if (event.source?.type === "group") {
						sourceInfo.push(`Group ID: ${event.source.groupId}`);
						if (event.source.userId) {
							sourceInfo.push(`Your User ID: ${event.source.userId}`);
						}
						sourceInfo.push(`\n💡 アクセス制御用ID: ${event.source.groupId}`);
					} else if (event.source?.type === "room") {
						sourceInfo.push(`Room ID: ${event.source.roomId}`);
						if (event.source.userId) {
							sourceInfo.push(`Your User ID: ${event.source.userId}`);
						}
						sourceInfo.push(`\n💡 アクセス制御用ID: ${event.source.roomId}`);
					}
					
					sourceInfo.push("\n※ この情報はアクセス制御設定で使用できます。");
					
					await client.replyMessage({
						replyToken: replyToken,
						messages: [
							{
								type: "text",
								text: sourceInfo.join(""),
							},
						],
					});
					continue;
					}

					// === Immediate Response Strategy for Cloudflare Workers ===
					// Send immediate acknowledgment and process AI in background
					console.log(`Processing message: "${userMessage}"`);

					// Strategy 1: Fast AI call with aggressive timeout and RAG support
					try {
						// Ultra-fast timeout optimized for Cloudflare Workers
						const AI_TIMEOUT = 4000; // 4 seconds max

						console.log("Sending request to AI...");
						const startTime = Date.now();

						// Try to use RAG for immediate response if available
						let contextualPrompt = userMessage;
						let ragContext = "";

						if (c.env.VECTORIZE) {
							try {
								console.log("Attempting fast RAG search...");

								// Initialize embeddings for the user query
								const embeddings = new CloudflareWorkersAIEmbeddings({
									binding: c.env.AI,
									modelName: "@cf/baai/bge-m3",
								});

								// Initialize vector store for similarity search
								const vectorStore = new CloudflareVectorizeStore(embeddings, {
									index: c.env.VECTORIZE,
								});

								// Quick search for relevant documents (reduced count for speed)
								const results = await vectorStore.similaritySearch(userMessage, 2);

								if (results.length > 0) {
									console.log(`Found ${results.length} relevant documents for fast response`);

									// Prepare context from search results (shorter for fast response)
									ragContext = results
										.map((doc, index) => {
											return `[関連情報 ${index + 1}]\n${doc.pageContent.substring(0, 200)}...`;
										})
										.join("\n\n");

									// Create enhanced prompt with context for fast response
									contextualPrompt = `過去の会話から関連情報を参考にして回答してください。

関連情報:
${ragContext}

質問: ${userMessage}

簡潔で的確な回答をお願いします。`;
								}
							} catch (ragError) {
								console.error("Fast RAG search failed:", ragError);
								// Continue with general response if RAG fails
							}
						}

						const aiPromise = c.env.AI.run("@cf/qwen/qwen1.5-0.5b-chat", {
							messages: [
								{
									role: "system",
									content: ragContext
										? "あなたは親切なAIアシスタントです。提供された関連情報を参考にして、簡潔で直接的な日本語の回答をしてください。"
										: "あなたは親切なAIアシスタントです。簡潔で直接的な日本語の回答をしてください。",
								},
								{
									role: "user",
									content: contextualPrompt,
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

						// Add RAG indicator if context was used
						const finalResponse = ragContext 
							? `📖 ${responseText}`
							: responseText;

						console.log("Sending reply to LINE...");
						await client.replyMessage({
							replyToken: replyToken,
							messages: [
								{
									type: "text",
									text: finalResponse,
								},
							],
						});
						console.log("Reply sent successfully!");

						// Always start background processing for enhanced RAG response
						// This provides a more detailed follow-up even if immediate response succeeded
						// 送信先IDを適切に決定
						const targetId = event.source?.type === "group" ? event.source.groupId
							: event.source?.type === "room" ? event.source.roomId
							: event.source?.userId;
							
						if (targetId) {
							console.log(`Starting background AI processing for enhanced response to ${event.source?.type}: ${targetId}`);
							c.executionCtx.waitUntil(
								processMessageInBackground(
									c.env.AI,
									client,
									targetId,
									userMessage,
									c.env.VECTORIZE, // Pass Vectorize index for RAG support
								),
							);
						}
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
							// 送信先IDを適切に決定
							const targetId = event.source?.type === "group" ? event.source.groupId
								: event.source?.type === "room" ? event.source.roomId
								: event.source?.userId;
								
							if (targetId) {
								console.log(`Starting background AI processing to ${event.source?.type}: ${targetId}`);
								c.executionCtx.waitUntil(
									processMessageInBackground(
										c.env.AI,
										client,
										targetId,
										userMessage,
										c.env.VECTORIZE, // Pass Vectorize index for RAG support
									),
								);
							}
						} catch (fallbackError) {
							console.error("Fallback response also failed:", fallbackError);
						}
					}
				} else if (event.type === "follow") {
					// Handle follow event (user adds bot as friend)
					// 友達追加は誰でも可能 - アクセス制御なし
					await client.replyMessage({
						replyToken: event.replyToken,
						messages: [
							{
								type: "text",
								text: c.env.ALLOWED_TALK_ROOMS 
									? "友達追加ありがとうございます！Workers AIを搭載したチャットボットです。\n\n⚠️ 現在、特定のトークルームでのみご利用いただけます。許可されたグループまたはトークルームでお話しください。🤖💬"
									: "友達追加ありがとうございます！Workers AIを搭載したチャットボットです。お気軽にお話しください！ 🤖💬",
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
}
