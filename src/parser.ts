import type { ChatMetadata, ParsedMessage } from "./types";

/**
 * Enhanced LINE Chat History Parser
 * Parses LINE chat export files with the format:
 * - Header: [LINE] トーク履歴
 * - Date headers: 2024/1/23(火)
 * - Messages: 時刻\tユーザー名\tメッセージ (tab-separated)
 */
export function parseLINEChatHistory(text: string): {
	messages: ParsedMessage[];
	metadata: ChatMetadata;
} {
	const lines = text.split("\n");
	const messages: ParsedMessage[] = [];
	const participants = new Set<string>();
	const messageTypes: Record<string, number> = {};
	let startDate = "";
	let endDate = "";
	let currentDate = ""; // Track current date context

	for (const line of lines) {
		let parsed = false;

		// Skip header lines and empty lines
		if (
			line.includes("[LINE]") ||
			line.includes("保存日時：") ||
			line.trim() === ""
		) {
			continue;
		}

		// Check for date headers like "2024/1/23(火)"
		const dateHeaderMatch = line.match(
			/^(\d{4}\/\d{1,2}\/\d{1,2})\([月火水木金土日]\)$/,
		);
		if (dateHeaderMatch) {
			currentDate = dateHeaderMatch[1];
			continue;
		}

		// Parse message lines with format: 時刻\tユーザー名\tメッセージ
		const tabSeparatedMatch = line.match(/^(\d{1,2}:\d{2})\t([^\t]+)\t(.+)$/);
		if (tabSeparatedMatch && currentDate) {
			const [, time, username, messageContent] = tabSeparatedMatch;
			const timestamp = `${currentDate} ${time}`;

			// Determine message type
			let messageType: ParsedMessage["messageType"] = "text";

			if (
				messageContent.includes("[スタンプ]") ||
				messageContent.includes("[Sticker]")
			) {
				messageType = "sticker";
			} else if (
				messageContent.includes("[画像]") ||
				messageContent.includes("[Image]") ||
				messageContent.includes("[Photo]")
			) {
				messageType = "image";
			} else if (
				messageContent.includes("[ファイル]") ||
				messageContent.includes("[File]")
			) {
				messageType = "file";
			} else if (
				username.includes("システム") ||
				username.includes("System") ||
				username === "LINE"
			) {
				messageType = "system";
			}

			messages.push({
				timestamp: timestamp.trim(),
				username: username.trim(),
				message: messageContent.trim(),
				messageType,
				rawLine: line,
			});

			participants.add(username.trim());
			messageTypes[messageType] = (messageTypes[messageType] || 0) + 1;

			// Track date range
			if (!startDate || timestamp < startDate) startDate = timestamp;
			if (!endDate || timestamp > endDate) endDate = timestamp;

			parsed = true;
		}

		// Handle multi-line messages (lines that don't start with time but continue previous message)
		if (!parsed && line.trim() && messages.length > 0) {
			// Check if this line could be a continuation (doesn't match time pattern)
			if (!line.match(/^\d{1,2}:\d{2}\t/)) {
				// Append to last message as continuation
				messages[messages.length - 1].message += `\n${line.trim()}`;
				messages[messages.length - 1].rawLine += `\n${line}`;
				parsed = true;
			}
		}
	}

	const metadata: ChatMetadata = {
		totalMessages: messages.length,
		participants: Array.from(participants),
		dateRange: {
			start: startDate,
			end: endDate,
		},
		messageTypes,
	};

	return { messages, metadata };
}
