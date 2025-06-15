// Type definitions for the LINE Talk RAG system

export type CloudflareBindings = {
	AI: Ai;
	VECTORIZE: VectorizeIndex;
	LINE_CHANNEL_SECRET: string;
	LINE_CHANNEL_ACCESS_TOKEN: string;
	ALLOWED_TALK_ROOMS?: string; // カンマ区切りで許可されたトークルームID (userId, groupId, roomId)
};

export interface ParsedMessage {
	timestamp: string;
	username: string;
	message: string;
	messageType: "text" | "image" | "sticker" | "file" | "system" | "unknown";
	rawLine: string;
}

export interface ChatMetadata {
	totalMessages: number;
	participants: string[];
	dateRange: {
		start: string;
		end: string;
	};
	messageTypes: Record<string, number>;
}

export interface PrepareOptions {
	chunkSize?: number;
	chunkOverlap?: number;
}

export interface ProcessedDocument {
	pageContent: string;
	metadata: {
		chunkId: number;
		chunkType: string;
		timeStart: string;
		timeEnd: string;
		participants: string[];
		messageCount: number;
		messageTypes: Record<string, number>;
		source: string;
		processed: string;
		subChunkId: number;
		totalSubChunks: number;
		originalChunkLength: number;
	};
}
