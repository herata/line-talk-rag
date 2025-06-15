import { CloudflareWorkersAIEmbeddings } from "@langchain/cloudflare";
import { CloudflareVectorizeStore } from "@langchain/cloudflare";
import { messagingApi, validateSignature } from "@line/bot-sdk";
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
				// === 統一SourceID取得関数 ===
				const getSourceInfo = () => {
					if (event.source?.type === "user") {
						return {
							id: event.source.userId,
							type: "User",
							sourceType: event.source.type,
						};
					}
					if (event.source?.type === "group") {
						return {
							id: event.source.groupId,
							type: "Group", 
							sourceType: event.source.type,
						};
					}
					if (event.source?.type === "room") {
						return {
							id: event.source.roomId,
							type: "Room",
							sourceType: event.source.type,
						};
					}
					return {
						id: undefined,
						type: "Unknown",
						sourceType: event.source?.type || "unknown",
					};
				};

				const sourceInfo = getSourceInfo();

				// === アクセス制御: 許可されたトークルームのみメッセージ処理 ===
				if (c.env.ALLOWED_TALK_ROOMS) {
					const allowedIds = c.env.ALLOWED_TALK_ROOMS.split(",").map((id) =>
						id.trim(),
					);

					if (sourceInfo.id && !allowedIds.includes(sourceInfo.id)) {
						console.log(
							`Message access denied for source ID: ${sourceInfo.id}. Bot usage restricted to allowed talk rooms only.`,
						);
						console.log(
							`Source details - Type: ${sourceInfo.sourceType}, ID: ${sourceInfo.id}`,
						);

						// アクセス制限の案内メッセージを送信
						try {
							await client.replyMessage({
								replyToken: event.replyToken,
								messages: [
									{
										type: "text",
										text: "🚫🚫 このボットは現在、特定の許可されたトークルーム、ユーザのみ利用可能です 🚫🚫"
									},
								],
							});
						} catch (replyError) {
							console.error(
								"Failed to send access restriction message:",
								replyError,
							);
						}

						continue;
					}
				}

				if (event.type === "message" && event.message.type === "text") {
					const userMessage = event.message.text;
					const replyToken = event.replyToken;

					// === RAG-Only Strategy: All responses processed in background ===
					console.log(`Processing message for RAG response: "${userMessage}"`);

					// Send immediate acknowledgment and process with full RAG in background
					try {
						await client.replyMessage({
							replyToken: replyToken,
							messages: [
								{
									type: "text",
									text: "🧠 チャット履歴確認中...",
								},
							],
						});
						console.log("RAG acknowledgment sent");

						// 統一されたsourceInfoからtargetIdを取得
						const targetId = sourceInfo.id;

						if (targetId) {
							console.log(
								`Starting full RAG processing to ${sourceInfo.sourceType}: ${targetId}`,
							);
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
					} catch (error) {
						console.error("RAG acknowledgment failed:", error);

						// Last resort fallback
						try {
							await client.replyMessage({
								replyToken: replyToken,
								messages: [
									{
										type: "text",
										text: "メッセージを受信しました。処理中です...",
									},
								],
							});

							// Still attempt background processing - 統一されたsourceInfoを使用
							const targetId = sourceInfo.id;

							if (targetId) {
								c.executionCtx.waitUntil(
									processMessageInBackground(
										c.env.AI,
										client,
										targetId,
										userMessage,
										c.env.VECTORIZE,
									),
								);
							}
						} catch (fallbackError) {
							console.error("Final fallback also failed:", fallbackError);
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
									? "🚫🚫 このボットは現在、特定の許可されたトークルーム、ユーザのみ利用可能です 🚫🚫"
									: "✨✨ あらかじめアップロードしたLineのトーク履歴を参照して回答するボットです ✨✨",
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
