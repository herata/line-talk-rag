---
applyTo: "**"
---
# Important Note
This file is a part of the Memory Bank. It is essential for understanding the project and its current state. I MUST read this file at the start of EVERY task.
To ensure I have the most up-to-date context, this file should be very flexible and updated frequently.

# Active Context: LINE Talk RAG System

## Current Work Focus
- **日付**: 2025年6月14日
- **フェーズ**: 最終実装段階 (85% Complete)
- **優先度**: LINE Client reply実装でMVP完成

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

### 2025/06/14 - コア機能実装完了
- **`/prepare`エンドポイント**: 完全実装
  - RecursiveCharacterTextSplitter (1000 chars, 200 overlap)
  - Workers AI embedding (@cf/baai/bge-m3)
  - Vectorize storage完全統合
- **`/webhook`エンドポイント**: 95%実装
  - LINE signature verification完了
  - Vector similarity search (top 3 results)完了
  - LLM response generation (@cf/meta/llama-2-7b-chat-int8)完了
  - RAG-optimized system prompt完了
  - **PENDING**: LINE Client reply実装のみ

## Next Steps
### 🚨 最優先タスク (MVP完成まで5%)
1. **LINE Client Reply実装** - 最後の5%
   - import { Client } from '@line/bot-sdk' 追加
   - Client初期化とreplyMessage実装
   - エラーハンドリング追加
   - console.logからLINE返信への置き換え

### 🔄 インフラ作業 (10%)
2. **Vectorize Index作成**
   - Cloudflareダッシュボードでindex作成
   - wrangler.jsonc設定との整合性確認
   
3. **ローカル開発環境**
   - .dev.vars設定
   - ローカルテスト実行

### 📋 展開作業 (Not Blocking MVP)
4. **LINE Bot登録**
   - LINE Developers Console設定
   - Webhook URL設定
   - Bot基本情報設定

5. **プロダクション最適化**
   - Rate limiting実装
   - Advanced error handling
   - パフォーマンス最適化

## Critical Implementation Details

### 現在の実装状況
- **Type System**: CloudflareBindings interface完全実装
- **Security**: LINE signature verification実装済み
- **RAG Pipeline**: 完全実装
  - Text chunking: RecursiveCharacterTextSplitter (1000/200)
  - Embeddings: @cf/baai/bge-m3
  - Vector search: Top 3 similarity results
  - LLM: @cf/meta/llama-2-7b-chat-int8
  - System prompt: RAG-optimized context handling

### 最後の実装項目
```typescript
// 現在のTODOコメント箇所:
// TODO: Implement actual LINE reply using @line/bot-sdk
// For now, we just log the response

// 必要な変更:
import { Client } from '@line/bot-sdk';

// webhook内でClient初期化とreply実装
const client = new Client({
  channelAccessToken: c.env.LINE_CHANNEL_ACCESS_TOKEN,
});

await client.replyMessage(event.replyToken, {
  type: 'text',
  text: responseText,
});
```

### Active Decisions and Considerations

### 技術的決定事項 ✅
1. **Embeddingモデル**: @cf/baai/bge-m3 (Workers AI)
2. **チャンク分割**: RecursiveCharacterTextSplitter (1000 chars, 200 overlap)
3. **Vector検索**: Top 3 similarity results for context
4. **LLMモデル**: @cf/meta/llama-2-7b-chat-int8
5. **RAGパイプライン**: Full implementation with context-aware system prompt
6. **LINE統合**: Signature verification + Client reply (95% complete)

### 解決済み技術課題 ✅
1. **LINEトーク履歴フォーマット**: `/prepare`でプレーンテキスト受け入れ
2. **チャンク分割戦略**: RecursiveCharacterTextSplitter最適化済み
3. **LLMプロンプト設計**: RAG-optimized system prompt実装済み

### 最終確認事項 
- **Vectorize Index**: Cloudflareダッシュボードで作成要
- **環境変数**: .dev.vars設定要  
- **LINE credentials**: Channel Secret & Access Token設定要

## Current Environment State
- **開発環境**: ローカル開発準備完了
- **依存関係**: 基本パッケージインストール済み
- **設定ファイル**: 基本構成のみ（拡張が必要）

## Immediate Action Items
1. wrangler.jsonc にAI bindingとVectorize設定を追加
2. 基本的なエンドポイント構造を実装
3. LINE Messaging API統合の準備
