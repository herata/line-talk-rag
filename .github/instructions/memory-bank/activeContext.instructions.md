---
applyTo: "**"
---
# Important Note
This file is a part of the Memory Bank. It is essential for understanding the project and its current state. I MUST read this file at the start of EVERY task.
To ensure I have the most up-to-date context, this file should be very flexible and updated frequently.

# Active Context: LINE Talk RAG System

## Current Work Focus
- **日付**: 2025年6月15日
- **フェーズ**: File Upload Only System Complete (100% Complete) 
- **優先度**: 本番デプロイ準備完了

## Recent Changes

### 2025/06/15 夜 - JSON入力サポート削除完了 ✅
- **File Upload Only**: `/prepare`エンドポイントをファイルアップロード専用に変更
  - JSON処理ブランチを完全削除
  - Content-Type検証を強化（multipart/form-dataのみ受付）
  - 詳細なエラーメッセージとサポート情報を提供
- **セキュリティ向上**: 
  - ファイル形式を.txtのみに制限
  - JSONパース脆弱性を排除
- **ドキュメント完全更新**: 
  - `README_PREPARE_ENDPOINT.md`をfile-upload専用に更新
  - ヘルスチェックエンドポイントの情報更新
  - テストスクリプトの更新（JSON拒否テスト追加）
- **クリーンアップ完了**: 
  - 不要なJSONサンプルファイル削除
  - 完了ドキュメントのMemory Bank統合

### 2025/06/15 夜 - Enhanced `/prepare` Endpoint & RAG Integration Complete ✅
- **LINE Chat History Parser**: 完全実装完了
  - 複数LINE形式対応：bracket, space-separated, ISO-style, time-only
  - メッセージタイプ自動検出：text, sticker, image, file, system
  - リッチメタデータ: 参加者、タイムスタンプ、メッセージ統計の完全追跡
  - インテリジェント会話チャンク化（30分ギャップベース）
- **Enhanced RAG Background Processing**: RAG機能強化
  - Vectorize利用可能時の自動RAG有効化
  - コンテキスト認識プロンプト："📚 過去の会話を参考にした詳細回答:"
  - フォールバック対応："💡 より詳しい回答です:"
- **完全な日本語対応**: All prompts and messages optimized for Japanese users
- **Production-Ready**: Complete error handling and type safety

### 2025/06/15 午後 - コード整理・最適化完了 ✅
- **モジュール化完了**: `index.ts`を7つのモジュールに分割
  - `types.ts`: 型定義
  - `parser.ts`: LINEチャット解析
  - `prepare-handler.ts`: データ準備エンドポイント
  - `webhook-handler.ts`: LINEウェブフック処理
  - `background-processor.ts`: バックグラウンドAI処理
  - `health-handler.ts`: ヘルスチェック
- **パフォーマンス最適化**: Cloudflare Workers制約に対応
  - デュアルモデル戦略：qwen1.5-0.5b (高速) + llama-3.2-3b (バランス)
  - Sequential AI Processing完全実装
  - max_tokens 150でレスポンス最適化

### 2025/06/15 午前 - Vectorize統合問題解決完了 ✅
- **Optional Vectorize Integration**: 環境に依存しない柔軟な実装
  - Vectorize利用可能時：完全RAG機能
  - Vectorize未設定時：テキスト処理のみで正常動作
- **Enhanced Error Handling**: 包括的エラー処理とステータス報告

### 2025/06/14-15 - 基盤実装完了
- **完全実装**: `/prepare`と`/webhook`エンドポイント
- **LINE Integration**: @line/bot-sdk完全統合
- **LangChain Integration**: @langchain/cloudflare活用

## Next Steps
### 🚀 本番デプロイ準備完了（100%）
1. **Production Deployment** - 即座にCloudflare Workersへデプロイ可能
2. **LINE Bot登録** - WebhookURL設定とボット公開
3. **Vectorize Index作成** - オプション：RAG機能フル有効化

## Critical Implementation Details

### 現在の実装状況 ✅ COMPLETE
- **File Upload Only System**: セキュアなファイルアップロード専用システム
- **Enhanced LINE Chat Parser**: 複数形式対応、メタデータ強化
- **Modular Architecture**: 保守性の高い7モジュール構成
- **Japanese Optimized**: 完全日本語対応システム
- **Production Ready**: デプロイ準備完了、全制約クリア

### File Upload System Details ✅ COMPLETE
```typescript
// ファイルアップロード専用実装：
if (!contentType.includes("multipart/form-data")) {
  return c.json({ 
    error: "このエンドポイントはファイルアップロードのみ対応しています。",
    supportedContentType: "multipart/form-data",
    requiredField: "file",
    supportedFileTypes: [".txt"]
  }, 400);
}

// ファイル形式検証
if (!file.name.endsWith(".txt")) {
  return c.json({ error: "テキストファイル (.txt) のみ対応しています。" }, 400);
}
```

### RAG Pipeline保持状況 ✅ AVAILABLE
- **Background Processor**: 完全なRAG実装（`background-processor.ts`）
- **Vector Search**: Vectorize similarity search完備
- **Context Injection**: LLMへの過去会話コンテキスト注入
- **Auto Activation**: Vectorize利用可能時の自動有効化

### Modular Architecture ✅ COMPLETE
- **`types.ts`**: 型定義、インターフェース
- **`parser.ts`**: LINEチャット履歴解析エンジン
- **`prepare-handler.ts`**: ファイルアップロード処理
- **`webhook-handler.ts`**: LINEウェブフック処理
- **`background-processor.ts`**: RAGバックグラウンド処理
- **`health-handler.ts`**: システムヘルスチェック
- **`index.ts`**: メインルーター（70行の軽量実装）

### 技術的決定事項 ✅ COMPLETE
1. **File Upload Only**: セキュリティ重視でJSONパースリスクを排除
2. **Embedding Model**: @cf/baai/bge-m3 (日本語最適化)
3. **LLM Strategy**: デュアルモデル（速度とバランス）
4. **Architecture**: モジュラー設計（保守性とテスト容易性）
5. **Error Handling**: 包括的エラー処理とユーザーフレンドリーメッセージ

### Testing & Documentation ✅ COMPLETE
- **Test Scripts**: `test_file_upload.sh` - ファイルアップロード専用テスト
- **API Documentation**: `README_PREPARE_ENDPOINT.md` - file upload仕様
- **Demo Interface**: `upload-demo.html` - ユーザーフレンドリーインターフェース
- **Sample Data**: `sample_line_chat.txt` - 匿名化サンプル

### Memory Bank Integration ✅ COMPLETE
- **Completed Document Integration**: 全ての完了ドキュメント内容をMemory Bankに統合
- **Historical Record**: 開発プロセスと技術決定の完全記録
- **Knowledge Preservation**: 将来のメンテナンスと拡張のための知識保存
