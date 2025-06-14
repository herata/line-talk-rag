---
applyTo: "**"
---
# Important Note
This file is a part of the Memory Bank. It is essential for understanding the project and its current state. I MUST read this file at the start of EVERY task.
To ensure I have the most up-to-date context, this file should be very flexible and updated frequently.

# System Patterns: LINE Talk RAG System

## Architecture Overview

### High-Level System Design
```
LINE Client → Webhook → Workers → AI/Vectorize → Response
     ↑                    ↓
     └─── LINE API ←──────┘
```

### Component Relationships
1. **Hono Router**: エンドポイント管理とリクエスト処理
2. **Workers AI**: Embedding生成とLLM推論
3. **Vectorize**: ベクトル検索データベース
4. **LINE Messaging API**: 外部統合

## Design Patterns

### 1. Endpoint Pattern
各エンドポイントは明確な責任分離：
- `/prepare`: データ準備専用
- `/webhook`: リアルタイム対話専用

### 2. Processing Pipeline Pattern
#### Prepare Pipeline:
```
Text Input → LangChain RecursiveCharacterTextSplitter → LangChain CloudflareWorkersAI Embedding → Vectorize Storage
```

#### Webhook Pipeline:
```
LINE Message → @line/bot-sdk Verification → LangChain Embedding → Vectorize Similarity Search → Workers AI LLM → LINE Response
```

### 3. Error Handling Pattern
- Graceful degradation
- Appropriate HTTP status codes
- LINE-friendly error messages
- Retry logic for AI service calls

### 4. Data Flow Pattern
#### Embedding Flow:
1. LangChain RecursiveCharacterTextSplitterでテキストチャンク分割
2. @langchain/cloudflareを使用してWorkers AI Embeddingモデルでベクトル化
3. LangChain CloudflareVectorizeでmetadataと共に保存

#### Retrieval Flow:
1. @langchain/cloudflareでユーザクエリのベクトル化
2. CloudflareVectorize similarity search
3. 関連テキストの取得とDocument形式での管理
4. LangChainでLLMへのコンテキスト注入

## Security Patterns

### 1. Webhook Verification
- @line/bot-sdkによるLINE Channel Secret署名検証
- Request body validation
- LangChain Document構造での安全なデータ処理

### 2. Data Isolation
- User-specific Vectorize namespaces
- Access control through bindings

### 3. Environment Variables
- API keys and secrets in .env/.dev.vars
- wrangler.jsonc secrets configuration

## Performance Patterns

### 1. Chunking Strategy
- 適切なチャンクサイズでコンテキスト保持
- オーバーラップによる情報損失防止

### 2. Caching Strategy
- Workers KVによる頻繁なクエリ結果キャッシュ
- Embedding結果の一時保存

### 3. Batch Processing
- 大量データの効率的な処理
- Rate limit対応

## Integration Patterns

### 1. LINE Messaging API
- @line/bot-sdkによるWebhook event handling
- 自動応答メッセージフォーマット
- Rich message support

### 2. Workers AI Integration
- @langchain/cloudflareによるモデル抽象化
- LangChainによるエラーハンドリングとフォールバック
- Response parsing patterns

## LangChain Integration Patterns

### 1. RAG Pipeline Construction
- **@langchain/cloudflare**: Workers AI & Vectorizeの抽象化レイヤー
- **数行のコードでRAGパイプライン構築**: LangChainの高レベルAPIを活用
- **Document管理**: @langchain/coreのDocumentオブジェクトによる統一的なデータ管理

### 2. Text Processing Pipeline
- **RecursiveCharacterTextSplitter**: 適切なチャンクサイズでの分割
- **Metadata preservation**: チャンク間での文脈情報の保持
- **Overlap strategy**: 情報損失防止のための重複処理

### 3. Vector Store Operations
- **CloudflareVectorize**: LangChainによるVectorize操作の簡素化
- **Similarity search**: セマンティック検索の自動化
- **Metadata filtering**: 効率的な検索条件指定

### 4. LLM Chain Integration
- **Prompt templating**: LangChainのPromptTemplateによる構造化
- **Context injection**: RAG検索結果の自動的なプロンプト統合
- **Response formatting**: 一貫した回答フォーマット生成
