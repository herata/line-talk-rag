import type { Context } from "hono";
import type { CloudflareBindings } from "./types";

/**
 * Clear endpoint - for emptying the Vectorize database
 * Removes all vectors from the Cloudflare Vectorize index
 */
export async function handleClear(
	c: Context<{ Bindings: CloudflareBindings }>,
) {
	try {
		console.log("Starting Vectorize database clear operation...");

		// Check if Vectorize is available
		if (!c.env.VECTORIZE) {
			return c.json(
				{
					error: "Vectorizeデータベースが設定されていません",
					status: "NOT_CONFIGURED",
				},
				500,
			);
		}

		// Get current database stats before clearing
		let beforeStats: VectorizeIndexDetails | null = null;
		try {
			beforeStats = await c.env.VECTORIZE.describe();
			console.log("Database stats before clearing:", beforeStats);
		} catch (error) {
			console.warn("Could not get database stats:", error);
			beforeStats = null;
		}

		// Clear all vectors from the index
		// Note: Cloudflare Vectorize doesn't have a direct "clear all" method
		// We use a workaround by querying all vectors and then deleting them by IDs

		let totalDeleted = 0;
		let hasMoreVectors = true;

		while (hasMoreVectors) {
			// Query vectors to get their IDs (we use a small dummy vector for querying)
			const dummyVector = new Array(1024).fill(0.1); // Compatible with bge-m3 embeddings

			const queryResult = await c.env.VECTORIZE.query(dummyVector, {
				topK: 1000, // Process in batches of 1000
				returnMetadata: false,
				returnValues: false,
			});

			if (queryResult.matches.length === 0) {
				hasMoreVectors = false;
				break;
			}

			// Extract vector IDs
			const vectorIds = queryResult.matches.map((match) => match.id);

			// Delete this batch of vectors
			await c.env.VECTORIZE.deleteByIds(vectorIds);

			totalDeleted += vectorIds.length;
			console.log(
				`Deleted batch of ${vectorIds.length} vectors (total: ${totalDeleted})`,
			);

			// If we got fewer than the requested topK, we've reached the end
			if (queryResult.matches.length < 1000) {
				hasMoreVectors = false;
			}
		}

		console.log(`Successfully deleted ${totalDeleted} vectors from Vectorize`);

		if (totalDeleted === 0) {
			return c.json({
				message: "ベクトルデータベースは既に空です",
				status: "ALREADY_EMPTY",
				deletedCount: 0,
				timestamp: new Date().toISOString(),
			});
		}

		// Get stats after clearing (optional)
		let afterStats: VectorizeIndexDetails | null = null;
		try {
			afterStats = await c.env.VECTORIZE.describe();
			console.log("Database stats after clearing:", afterStats);
		} catch (error) {
			console.warn("Could not get database stats after clearing:", error);
			afterStats = null;
		}

		return c.json({
			message: "ベクトルデータベースが正常にクリアされました",
			status: "SUCCESS",
			deletedCount: totalDeleted,
			beforeStats: beforeStats
				? {
						vectorCount: beforeStats.vectorsCount || 0,
					}
				: null,
			afterStats: afterStats
				? {
						vectorCount: afterStats.vectorsCount || 0,
					}
				: null,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("Error in /clear:", error);

		// More detailed error handling
		let errorMessage = "ベクトルデータベースのクリア中にエラーが発生しました";
		const errorDetails = error instanceof Error ? error.message : String(error);

		// Handle specific Vectorize errors
		if (errorDetails.includes("not found") || errorDetails.includes("404")) {
			errorMessage = "Vectorizeインデックスが見つかりません";
		} else if (
			errorDetails.includes("unauthorized") ||
			errorDetails.includes("403")
		) {
			errorMessage = "Vectorizeへのアクセス権限がありません";
		} else if (
			errorDetails.includes("rate limit") ||
			errorDetails.includes("429")
		) {
			errorMessage =
				"API制限に達しました。しばらく待ってから再試行してください";
		}

		return c.json(
			{
				error: errorMessage,
				details: errorDetails,
				status: "ERROR",
				timestamp: new Date().toISOString(),
			},
			500,
		);
	}
}
