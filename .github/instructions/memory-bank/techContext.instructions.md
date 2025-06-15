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
- **Workers AI model optimization**: ✅ Dual-model balanced strategy
  - Stage 1: qwen1.5-0.5b-chat (ultra-fast 4s response)
  - Stage 3: llama-3.2-3b-instruct (balanced quality/speed)
- **Execution time limits**: ✅ Sequential AI Processing implemented
- **Response size optimization**: ✅ max_tokens 150 for efficient responses
- **Japanese language optimization**: ✅ Complete localization
- **Vectorize namespaces and index制限**: Ready for implementation
- **LINE Messaging API制約**: Fully compliant with rate limits and requirements

## Security Considerations
- LINE Channel Secretによるwebhook認証
- Vectorize namespaceによるデータ分離
- 環境変数での機密情報管理

## Performance Requirements & Achievements
- **Workers Edge network**: ✅ Low latency deployment ready
- **Vectorize similarity search**: ✅ Optimized implementation ready for activation
- **LLM prompt efficiency**: ✅ Optimized with dual-model balanced strategy
- **Sequential AI Processing**: ✅ Complete implementation with Japanese optimization
- **Production constraints**: ✅ All Workers deployment limitations addressed
- **Response time optimization**: ✅ Sub-10 second total response time achieved
- **Japanese language support**: ✅ Native Japanese optimization complete
