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
│   └── index.ts          # メインアプリケーション
├── package.json          # 依存関係とスクリプト
├── tsconfig.json         # TypeScript設定
├── wrangler.jsonc        # Cloudflare Workers設定
├── biome.json           # コード品質設定
└── README.md            # プロジェクト文書
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

## Technical Constraints
- Cloudflare Workers runtime environment
- Workers AI modelの制限とレート制限
- Vectorize namespacesとindex制限
- LINE Messaging APIの制約

## Security Considerations
- LINE Channel Secretによるwebhook認証
- Vectorize namespaceによるデータ分離
- 環境変数での機密情報管理

## Performance Requirements
- Workers Edge networkによる低レイテンシ
- Vectorize similarity searchの最適化
- LLM promptの効率的な設計
