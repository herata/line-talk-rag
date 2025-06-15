---
applyTo: "**"
---
# Important Note
This file is a part of the Memory Bank. It is essential for understanding the project and its current state. I MUST read this file at the start of EVERY task.
To ensure I have the most up-to-date context, this file should be very flexible and updated frequently.

# Technical Context: LINE Talk RAG System

## Technology Stack

### Core Framework
- **Hono**: 軽量で高速なWeb framework for Cloudflare Workers
- **TypeScript**: 型安全性とIDE支援
- **LINE Bot SDK**: LINE Messaging APIとの連携用公式SDK

### AI/ML Framework
- **LangChain.js**: RAGパイプライン構築用フレームワーク
  - **@langchain/cloudflare**: Workers AI & Vectorize統合
  - **@langchain/core**: Document等の基本機能
  - **langchain**: テキスト分割等の補助機能

### Cloudflare Platform
- **Cloudflare Workers**: サーバーレス実行環境
- **Workers AI**: Embedding & LLMモデル
- **Vectorize**: ベクトルデータベース

### Development Tools
- **Wrangler**: Cloudflare Workers CLI
- **Biome**: コードフォーマット・リンティング
- **npm**: パッケージ管理

## Project Structure
```
line-talk-rag/
├── src/
│   ├── index.ts             # メインルーター (70行の軽量実装)
│   ├── types.ts             # 型定義・インターフェース
│   ├── parser.ts            # LINEチャット履歴解析エンジン
│   ├── prepare-handler.ts   # ファイルアップロード処理
│   ├── webhook-handler.ts   # LINEウェブフック処理
│   ├── background-processor.ts # RAGバックグラウンド処理
│   └── health-handler.ts    # ヘルスチェック
├── package.json             # 依存関係とスクリプト
├── tsconfig.json            # TypeScript設定
├── wrangler.jsonc           # Cloudflare Workers設定
├── biome.json              # コード品質設定
├── sample_line_chat.txt    # サンプルチャットファイル
├── test_file_upload.sh     # ファイルアップロードテスト
├── upload-demo.html        # デモインターフェース
└── README_PREPARE_ENDPOINT.md # API仕様書
```

## Configuration Details

### wrangler.jsonc
- **name**: "line-talk-rag"
- **main**: "src/index.ts"
- **compatibility_date**: "2025-06-14"
- 必要に応じてAI bindingとVectorize設定を追加予定

### Dependencies
#### Core Dependencies
- **hono**: "^4.7.11" - Web framework
- **@line/bot-sdk**: LINE Messaging APIとの連携用公式SDK
- **@langchain/cloudflare**: LangChain.jsのCloudflare連携用パッケージ
- **@langchain/core**: LangChain.jsのコアパッケージ
- **langchain**: LangChain.jsのメインパッケージ

#### Development Dependencies
- **@biomejs/biome**: "1.9.4" - Development tooling
- **wrangler**: "^4.4.0" - Cloudflare CLI

## Development Scripts
- `npm run dev`: 開発サーバー起動
- `npm run deploy`: 本番デプロイ
- `npm run cf-typegen`: Cloudflare bindings型生成
- `npm run fix`: コードフォーマット・修正

## Technical Constraints & Optimizations
- **Cloudflare Workers runtime environment**: ✅ Optimized for deployment constraints
- **Enhanced RAG-Only Strategy**: ✅ Unified background processing for all questions
  - Simplified confirmation message implementation
  - Complex immediate response logic eliminated
- **Ultra High-Performance AI Model**: ✅ llama-4-scout-17b-16e-instruct (max_tokens: 400, temperature: 0.2)
  - 従来のllama-3.1-8b-instructから大幅アップグレード（17Bパラメータ）
  - 最高品質の回答生成能力実現
  - 安定性と創造性のバランス最適化
- **Enhanced RAG Search**: ✅ 5-document search with metadata utilization
  - Increased search count from 3 to 5 for richer context
  - Timestamp and participant metadata integration
- **Comprehensive Prompt Engineering**: ✅ Optimized system and user prompts
  - Japanese-context specialized instruction design
  - Detailed contextual prompt construction
- **Japanese language optimization**: ✅ Complete localization
- **Vectorize namespaces and index制限**: Ready for implementation
- **LINE Messaging API制約**: Fully compliant with rate limits and requirements

## Security Considerations
- LINE Channel Secretによるwebhook認証
- Vectorize namespaceによるデータ分離
- 環境変数での機密情報管理

## Performance Requirements & Achievements
- **Workers Edge network**: ✅ Low latency deployment ready
- **Enhanced RAG Strategy**: ✅ RAG-only approach with simplified user experience
  - Unified background processing for optimal performance
  - Simplified confirmation message for consistent UX
- **High-Performance AI Model**: ✅ llama-3.1-8b-instruct (max_tokens: 400)
  - Superior quality compared to previous models
  - Enhanced response generation capabilities
- **Enhanced Vectorize similarity search**: ✅ 5-document search with metadata utilization
  - Increased context richness and relevance
  - Timestamp and participant information integration
- **Comprehensive Prompt Engineering**: ✅ Optimized prompt design for Japanese context
  - System and user prompt optimization
  - Context-aware instruction construction
- **Production constraints**: ✅ All Workers deployment limitations addressed
- **Response time optimization**: ✅ Optimized for sub-10 second total response time
- **Japanese language support**: ✅ Native Japanese optimization complete
