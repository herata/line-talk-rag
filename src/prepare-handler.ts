import { CloudflareWorkersAIEmbeddings } from "@langchain/cloudflare";
import { CloudflareVectorizeStore } from "@langchain/cloudflare";
import type { Context } from "hono";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { parseLINEChatHistory } from "./parser";
import type {
	CloudflareBindings,
	ParsedMessage,
	PrepareOptions,
	ProcessedDocument,
} from "./types.js";

/**
 * Prepare endpoint - for processing LINE chat history file uploads
 * Processes LINE chat exports (.txt files) and optionally stores them in Vectorize for RAG
 * Accepts only file uploads via multipart/form-data
 */
export async function handlePrepare(
	c: Context<{ Bindings: CloudflareBindings }>,
) {
	try {
		// Check Content-Type to ensure multipart/form-data
		const contentType = c.req.header("content-type") || "";

		if (!contentType.includes("multipart/form-data")) {
			return c.json(
				{
					error:
						"このエンドポイントはファイルアップロードのみ対応しています。Content-Type: multipart/form-data を使用してください。",
					supportedContentType: "multipart/form-data",
					requiredField: "file",
					supportedFileTypes: [".txt"],
				},
				400,
			);
		}

		// Handle file upload
		console.log("Processing file upload...");
		const formData = await c.req.formData();
		const file = formData.get("file") as File;
		const optionsStr = formData.get("options") as string;

		if (!file) {
			return c.json(
				{
					error:
						"ファイルが見つかりません。'file'フィールドでファイルをアップロードしてください。",
				},
				400,
			);
		}

		// Check file type
		if (!file.name.endsWith(".txt")) {
			return c.json(
				{ error: "テキストファイル (.txt) のみ対応しています。" },
				400,
			);
		}

		// Read file content
		const text = await file.text();

		// Parse options if provided
		let options: PrepareOptions = {};
		if (optionsStr) {
			try {
				options = JSON.parse(optionsStr);
			} catch (e) {
				console.warn("Invalid options JSON, using defaults:", e);
			}
		}

		console.log(`File uploaded: ${file.name} (${file.size} bytes)`);

		if (!text || typeof text !== "string") {
			return c.json({ error: "テキスト入力が無効です" }, 400);
		}

		console.log("Processing LINE chat history data...");

		// Parse LINE chat history with structured parsing
		const { messages, metadata } = parseLINEChatHistory(text);

		if (messages.length === 0) {
			return c.json(
				{
					error:
						"LINEチャット履歴を解析できませんでした。正しいフォーマットか確認してください。",
					supportedFormats: [
						"時刻\\tユーザー名\\tメッセージ内容 (例: 9:20\\ttユーザーA\tおは！)",
						"日付ヘッダー: 2024/1/23(火)",
						"ヘッダー行: [LINE] ○○とのトーク履歴, 保存日時：...",
					],
					example:
						"2024/1/23(火)\\n9:20\\tユーザーA\\tおは！\\n9:21\\tユーザーB\\tおはよう！",
				},
				400,
			);
		}

		console.log(
			`Parsed ${messages.length} messages from ${metadata.participants.length} participants`,
		);

		// Create enriched documents with metadata
		const documents: string[] = [];
		const documentsMetadata: Array<{
			chunkId: number;
			chunkType: string;
			timeStart: string;
			timeEnd: string;
			participants: string[];
			messageCount: number;
			messageTypes: Record<string, number>;
			source: string;
			processed: string;
		}> = [];

		// Group messages by conversation context (time-based chunks)
		const conversationChunks = [];
		let currentChunk: ParsedMessage[] = [];
		let lastTimestamp = "";

		for (const message of messages) {
			// Start new chunk if gap > 30 minutes or chunk gets too large
			const shouldStartNewChunk =
				currentChunk.length === 0 ||
				currentChunk.length >= 20 ||
				(lastTimestamp &&
					message.timestamp &&
					new Date(message.timestamp).getTime() -
						new Date(lastTimestamp).getTime() >
						30 * 60 * 1000);

			if (shouldStartNewChunk && currentChunk.length > 0) {
				conversationChunks.push([...currentChunk]);
				currentChunk = [];
			}

			currentChunk.push(message);
			lastTimestamp = message.timestamp;
		}

		if (currentChunk.length > 0) {
			conversationChunks.push(currentChunk);
		}

		// Create documents from conversation chunks
		for (let i = 0; i < conversationChunks.length; i++) {
			const chunk = conversationChunks[i];

			// Format chunk as conversation
			const conversationText = chunk
				.map((msg) => {
					if (msg.messageType === "system") {
						return `[システム] ${msg.message}`;
					}
					if (msg.messageType === "text") {
						return `${msg.username}: ${msg.message}`;
					}
					return `${msg.username}: [${msg.messageType}] ${msg.message}`;
				})
				.join("\n");

			// Add context information
			const contextInfo = [
				`=== 会話セグメント ${i + 1}/${conversationChunks.length} ===`,
				`時間範囲: ${chunk[0].timestamp} 〜 ${chunk[chunk.length - 1].timestamp}`,
				`参加者: ${Array.from(new Set(chunk.map((m) => m.username))).join(", ")}`,
				`メッセージ数: ${chunk.length}`,
				"",
				conversationText,
			].join("\n");

			documents.push(contextInfo);

			// Rich metadata for each chunk
			documentsMetadata.push({
				chunkId: i,
				chunkType: "conversation",
				timeStart: chunk[0].timestamp,
				timeEnd: chunk[chunk.length - 1].timestamp,
				participants: Array.from(new Set(chunk.map((m) => m.username))),
				messageCount: chunk.length,
				messageTypes: chunk.reduce(
					(acc, msg) => {
						acc[msg.messageType] = (acc[msg.messageType] || 0) + 1;
						return acc;
					},
					{} as Record<string, number>,
				),
				source: "line_chat_export",
				processed: new Date().toISOString(),
			});
		}

		// Initialize text splitter for final processing
		const textSplitter = new RecursiveCharacterTextSplitter({
			chunkSize: options.chunkSize || 1500, // Larger chunks for conversation context
			chunkOverlap: options.chunkOverlap || 300, // More overlap for conversation continuity
			separators: ["\n\n", "\n", " ", ""], // Prioritize natural breaks
		});

		// Split enriched documents while preserving metadata
		const finalDocs: ProcessedDocument[] = [];

		for (let i = 0; i < documents.length; i++) {
			const chunks = await textSplitter.createDocuments([documents[i]]);

			for (let j = 0; j < chunks.length; j++) {
				finalDocs.push({
					pageContent: chunks[j].pageContent,
					metadata: {
						...documentsMetadata[i],
						subChunkId: j,
						totalSubChunks: chunks.length,
						originalChunkLength: documents[i].length,
					},
				});
			}
		}

		// Optional Vectorize integration - graceful fallback if not available
		let vectorStoreResult = null;
		if (c.env.VECTORIZE && c.env.AI) {
			try {
				console.log("Initializing Vectorize store...");

				// Initialize embeddings with Workers AI
				const embeddings = new CloudflareWorkersAIEmbeddings({
					binding: c.env.AI,
					modelName: "@cf/baai/bge-m3", // Multilingual embeddings for Japanese support
				});

				// Initialize Vectorize store
				const vectorStore = new CloudflareVectorizeStore(embeddings, {
					index: c.env.VECTORIZE,
				});

				// Add documents with metadata to vector store
				await vectorStore.addDocuments(finalDocs);
				vectorStoreResult = "SUCCESS";
				console.log(
					`Successfully processed and stored ${finalDocs.length} document chunks in Vectorize`,
				);
			} catch (vectorError) {
				console.warn(
					"Vectorize not available, continuing with text processing only:",
					vectorError,
				);
				vectorStoreResult = "UNAVAILABLE";
			}
		} else {
			console.log("Vectorize environment not configured, processing text only");
			vectorStoreResult = "NOT_CONFIGURED";
		}

		console.log(
			`Successfully processed ${finalDocs.length} document chunks (Vectorize: ${vectorStoreResult})`,
		);

		return c.json({
			message: "LINEチャット履歴が正常に処理されました",
			summary: {
				originalMessages: messages.length,
				conversationChunks: conversationChunks.length,
				finalDocumentChunks: finalDocs.length,
				participants: metadata.participants,
				dateRange: metadata.dateRange,
				messageTypes: metadata.messageTypes,
			},
			processingInfo: {
				chunkSize: options.chunkSize || 1500,
				chunkOverlap: options.chunkOverlap || 300,
				embeddingModel: "@cf/baai/bge-m3",
				vectorizeStatus: vectorStoreResult,
				timestamp: new Date().toISOString(),
			},
		});
	} catch (error) {
		console.error("Error in /prepare:", error);
		return c.json(
			{
				error: "チャット履歴の処理中にエラーが発生しました",
				details: error instanceof Error ? error.message : String(error),
			},
			500,
		);
	}
}
