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
		// Strategy: Use describe() to check if vectors exist, then use a different approach
		
		// First check if there are any vectors to delete
		let initialStats: VectorizeIndexDetails | null = null;
		try {
			initialStats = await c.env.VECTORIZE.describe();
			console.log("Initial database stats:", initialStats);
		} catch (error) {
			console.warn("Could not get initial database stats:", error);
		}

		// If no vectors exist, return early
		if (initialStats && initialStats.vectorsCount === 0) {
			return c.json({
				message: "ベクトルデータベースは既に空です",
				status: "ALREADY_EMPTY",
				deletedCount: 0,
				timestamp: new Date().toISOString(),
			});
		}

		let totalDeleted = 0;
		let hasMoreVectors = true;
		let attempts = 0;
		const maxAttempts = 50; // Prevent infinite loops

		while (hasMoreVectors && attempts < maxAttempts) {
			attempts++;
			
			try {
				// Use a dummy vector to query existing vectors
				// Create a more realistic dummy vector for the embedding space
				const dummyVector = Array.from({ length: 1024 }, () => Math.random() * 0.1);

				const queryResult = await c.env.VECTORIZE.query(dummyVector, {
					topK: 100, // Smaller batch size for more stable processing
				});

				if (queryResult.matches.length === 0) {
					console.log("No more vectors found, clearing complete");
					hasMoreVectors = false;
					break;
				}

				// Extract vector IDs
				const vectorIds = queryResult.matches.map((match) => match.id);

				// Delete this batch of vectors
				await c.env.VECTORIZE.deleteByIds(vectorIds);

				totalDeleted += vectorIds.length;
				console.log(
					`Deleted batch of ${vectorIds.length} vectors (total: ${totalDeleted}, attempt: ${attempts})`,
				);

				// If we got fewer than the requested topK, we might be near the end
				if (queryResult.matches.length < 100) {
					// Do one more check to see if there are remaining vectors
					const checkResult = await c.env.VECTORIZE.query(dummyVector, {
						topK: 1,
					});
					if (checkResult.matches.length === 0) {
						hasMoreVectors = false;
					}
				}

				// Small delay to avoid overwhelming the API
				await new Promise(resolve => setTimeout(resolve, 100));

			} catch (queryError) {
				console.warn(`Query attempt ${attempts} failed:`, queryError);
				
				// If the error suggests no vectors exist, we're done
				const errorMsg = queryError instanceof Error ? queryError.message : String(queryError);
				if (errorMsg.includes("no vectors") || errorMsg.includes("empty")) {
					hasMoreVectors = false;
					break;
				}
				
				// For other errors, try a few more times
				if (attempts >= 3) {
					throw queryError; // Re-throw after a few attempts
				}
				
				// Wait a bit before retrying
				await new Promise(resolve => setTimeout(resolve, 1000));
			}
		}

		if (attempts >= maxAttempts) {
			console.warn(`Reached maximum attempts (${maxAttempts}), stopping clear operation`);
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
