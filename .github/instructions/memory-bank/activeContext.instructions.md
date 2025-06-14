---
applyTo: "**"
---
# Important Note
This file is a part of the Memory Bank. It is essential for understanding the project and its current state. I MUST read this file at the start of EVERY task.
To ensure I have the most up-to-date context, this file should be very flexible and updated frequently.

# Active Context: LINE Talk RAG System

## Current Work Focus
- **日付**: 2025年6月14日
- **フェーズ**: プロジェクト初期セットアップ
- **優先度**: Memory Bank構築とAPI仕様設計

## Recent Changes
### 2025/06/14 - プロジェクト開始
- Memory Bank構造の構築完了
- プロジェクト要件の明確化
- 基本的なHonoアプリケーション構造確認

### 2025/06/14 - パッケージ仕様決定
- @line/bot-sdk: LINE Messaging API統合
- @langchain/cloudflare: Workers AI & Vectorize抽象化
- @langchain/core: Document管理とコア機能
- langchain: RecursiveCharacterTextSplitter等の補助機能
- 数行のコードでRAGパイプライン構築可能な設計確定

### 2025/06/14 - インフラ設定完了
- 必要パッケージ全てインストール完了
- wrangler.jsonc設定更新（AI binding, Vectorize, nodejs_compat）
- CloudflareBindings型定義生成完了
- .dev.vars.example環境変数テンプレート作成

## Next Steps
### 即座に実装すべき項目
1. **✅ wrangler.jsonc設定更新** - 完了
   - ✅ AI binding追加
   - ✅ Vectorize設定追加
   - ✅ nodejs_compat フラグ追加

2. **✅ TypeScript型定義** - 完了
   - ✅ CloudflareBindings型の生成
   - ✅ LINE webhook payload型定義
   - ✅ Workers AI response型定義

3. **✅ `/prepare`エンドポイント実装** - 基本実装完了
   - ✅ テキストデータの受け取り
   - ✅ LangChain RecursiveCharacterTextSplitterでチャンク分割
   - ✅ Embeddingモデル統合
   - ✅ Vectorizeへの保存

4. **🔄 `/webhook`エンドポイント実装** - 基本実装完了、改善が必要
   - ✅ LINE webhook署名検証
   - ✅ メッセージ解析
   - ✅ Vectorize検索
   - ✅ LLM回答生成
   - ❌ LINE返信メッセージ送信（要実装）

### 次に取り組むべき項目（優先度順）
1. **LINE返信機能の実装**
   - @line/bot-sdkのClient設定
   - 実際のメッセージ返信API実装

2. **開発環境でのテスト**
   - Vectorizeインデックス作成
   - ローカル環境での動作確認
   - エラーハンドリング改善

3. **プロダクション設定**
   - 環境変数設定
   - LINE Bot登録とwebhook設定

### 中期目標（今後1-2週間）
- エンドポイントの基本実装完了
- ローカル開発環境でのテスト
- LINE Bot登録とwebhook設定
- 基本的なRAG機能の動作確認

## Active Decisions and Considerations

### 技術的決定事項
1. **Embeddingモデル**: @langchain/cloudflareを通じてWorkers AIの標準Embeddingモデルを使用
2. **チャンク分割**: LangChain RecursiveCharacterTextSplitterで最適化
3. **Vectorizeインデックス**: LangChain CloudflareVectorizeで管理
4. **RAGパイプライン**: @langchain/cloudflareで数行のコード実装
5. **LINE統合**: @line/bot-sdkによる署名検証と応答メッセージ送信

### 未解決の技術課題
1. **LINEトーク履歴フォーマット**: 受け入れ可能な形式の仕様化
2. **チャンク分割戦略**: メッセージ単位 vs 時系列単位
3. **LLMプロンプト設計**: 効果的なRAG用prompt template

### 外部依存関係
- LINE Messaging API設定
- Cloudflare Vectorizeの有効化
- Workers AIの利用可能性確認

## Current Environment State
- **開発環境**: ローカル開発準備完了
- **依存関係**: 基本パッケージインストール済み
- **設定ファイル**: 基本構成のみ（拡張が必要）

## Immediate Action Items
1. wrangler.jsonc にAI bindingとVectorize設定を追加
2. 基本的なエンドポイント構造を実装
3. LINE Messaging API統合の準備
