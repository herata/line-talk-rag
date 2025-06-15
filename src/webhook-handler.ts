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

					// === RAG-Only Strategy: All responses processed in background ===
					console.log(`Processing message for RAG response: "${userMessage}"`);

					// Send immediate acknowledgment and process with full RAG in background
					try {
						const acknowledgmentMessages = [
							"📚 過去のチャット履歴を確認して回答します！少々お待ちください... 🔍",
							"🤖 関連情報を検索中です。詳細な回答をお送りします... ⚡",
							"💭 チャット履歴から関連情報を探して、適切な回答を作成中です... 📖",
							"🧠 過去の会話を参照して、より良い回答を準備しています... 🚀",
							"📝 履歴検索中です。RAG機能で詳細に回答します... ✨",
						];

						const randomMessage = acknowledgmentMessages[
							Math.floor(Math.random() * acknowledgmentMessages.length)
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
						console.log("RAG acknowledgment sent");

						// 送信先IDを適切に決定
						const targetId = event.source?.type === "group" ? event.source.groupId
							: event.source?.type === "room" ? event.source.roomId
							: event.source?.userId;
							
						if (targetId) {
							console.log(`Starting full RAG processing to ${event.source?.type}: ${targetId}`);
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
										text: "メッセージを受信しました。処理中です... 🤖",
									},
								],
							});
							
							// Still attempt background processing
							const targetId = event.source?.type === "group" ? event.source.groupId
								: event.source?.type === "room" ? event.source.roomId
								: event.source?.userId;
								
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
