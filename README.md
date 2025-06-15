# LINE Talk RAG System

## 🚀 Overview

LINE Talk RAGは、LINEのトーク履歴を活用した高度なRAG（Retrieval-Augmented Generation）システムです。Cloudflare Workersプラットフォーム上で動作し、LINEチャット履歴をインテリジェントに解析・ベクトル化して、自然な対話型AIアシスタントを実現します。

### ✨ Key Features

- **🔍 高度なLINEチャット解析**: 複数のLINEエクスポート形式に対応した智的パーサー
- **📁 セキュアなファイルアップロード**: .txtファイル専用の安全なアップロード機能
- **🧠 コンテキスト保持型RAG**: 会話の文脈を維持した智的な情報検索
- **⚡ 高速レスポンス**: Cloudflare Workers最適化による低レイテンシ
- **🌍 日本語最適化**: 日本語コンテンツに最適化された処理とレスポンス
- **🔒 プロダクション対応**: エンタープライズレベルのセキュリティとパフォーマンス

## 🏗️ Architecture

### モジュラー設計（7つの専門モジュール）
```
src/
├── index.ts             # メインルーター (軽量実装)
├── types.ts             # 型定義・インターフェース
├── parser.ts            # LINEチャット履歴解析エンジン
├── prepare-handler.ts   # ファイルアップロード処理
├── webhook-handler.ts   # LINEウェブフック処理
├── background-processor.ts # RAGバックグラウンド処理
└── health-handler.ts    # ヘルスチェック
```

### テクノロジースタック
- **Framework**: Hono (高速・軽量Webフレームワーク)
- **Platform**: Cloudflare Workers (サーバーレス)
- **AI/ML**: Workers AI (Embedding: bge-m3, LLM: qwen1.5-0.5b + llama-3.2-3b)
- **Vector DB**: Cloudflare Vectorize
- **Integration**: LINE Messaging API
- **Language**: TypeScript

## 🚀 Quick Start

### 1. Installation

```bash
npm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp .dev.vars.example .dev.vars

# Edit with your LINE Bot credentials
# CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
# CHANNEL_SECRET=your_line_channel_secret
```

### 3. Development

```bash
# Start development server
npm run dev

# Generate types (optional)
npm run cf-typegen

# Code formatting
npm run fix
```

### 4. Deployment

```bash
# Deploy to Cloudflare Workers
npm run deploy
```

## 📡 API Endpoints

### `/prepare` - ファイルアップロード

LINEチャット履歴ファイル（.txt）をアップロードして、RAGシステム用に処理・ベクトル化します。

#### Request Format

```bash
# Basic file upload
curl -X POST https://your-worker.workers.dev/prepare \
  -F "file=@your_chat_history.txt"

# With custom options
curl -X POST https://your-worker.workers.dev/prepare \
  -F "file=@your_chat_history.txt" \
  -F "options={\"chunkSize\": 2000, \"chunkOverlap\": 400}"
```

#### 対応フォーマット

```
# Format 1: ブラケットタイムスタンプ
[2024/01/15 14:30] ユーザー名: メッセージ内容

# Format 2: スペース区切りタイムスタンプ  
2024/01/15 14:30 ユーザー名: メッセージ内容

# Format 3: ISO形式タイムスタンプ
2024-01-15 14:30:00 ユーザー名: メッセージ内容

# Format 4: 時刻のみ形式
14:30 ユーザー名: メッセージ内容
```

#### レスポンス例

```json
{
  "message": "LINEチャット履歴が正常に処理されました",
  "summary": {
    "originalMessages": 156,
    "conversationChunks": 8,
    "finalDocumentChunks": 12,
    "participants": ["田中", "佐藤", "山田"],
    "dateRange": {
      "start": "2024/01/15 09:00",
      "end": "2024/01/15 18:30"
    },
    "messageTypes": {
      "text": 142,
      "image": 8,
      "sticker": 6
    }
  },
  "processingInfo": {
    "chunkSize": 1500,
    "chunkOverlap": 300,
    "embeddingModel": "@cf/baai/bge-m3",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### `/webhook` - LINE Bot Integration

LINE Messaging APIからのWebhookを処理し、RAGベースの応答を生成します。

#### 機能
- **メッセージ処理**: ユーザーメッセージの受信・解析
- **RAG検索**: ベクトル化されたチャット履歴から関連情報を検索
- **AI応答生成**: Workers AIを使用した自然な日本語応答
- **フォールバック**: Echo Bot機能による確実な応答
- **セキュリティ**: LINE署名検証による安全な通信

### `/health` - ヘルスチェック

システムの稼働状況と各コンポーネントの状態を確認します。

## 🔧 Configuration Options

### Chunking Settings

| Option | Default | Description |
|--------|---------|-------------|
| `chunkSize` | 1500 | 各テキストチャンクの最大サイズ |
| `chunkOverlap` | 300 | 連続するチャンク間のオーバーラップ |

### AI Models

- **Embedding**: `@cf/baai/bge-m3` - 多言語対応、日本語最適化
- **Primary LLM**: `@cf/qwen/qwen1.5-0.5b-chat` - 高速レスポンス
- **Secondary LLM**: `@cf/meta/llama-3.2-3b-instruct` - 高品質応答

## 🎯 Advanced Features

### インテリジェントチャンク分割
- **時間ベース分割**: 30分のギャップで会話を自動分割
- **コンテキスト保持**: 参加者と時間的文脈を維持
- **メタデータエンリッチ**: 豊富なメタデータによる高精度検索

### メッセージタイプ検出
- **text**: 通常のテキストメッセージ
- **image**: `[画像]`, `[Image]`, `[Photo]`
- **sticker**: `[スタンプ]`, `[Sticker]`
- **file**: `[ファイル]`, `[File]`
- **system**: システムメッセージ
- **unknown**: 未認識フォーマット

### バックグラウンド処理
- **非同期RAG処理**: メッセージ応答後のバックグラウンドでのRAG強化
- **パフォーマンス最適化**: 8秒AIタイムアウト、3秒LINE応答制限
- **エラーハンドリング**: 堅牢なエラー処理とフォールバック機能

## 🧪 Testing

### サンプルデータ作成

```bash
# Create test file
cat > sample_line_chat.txt << 'EOF'
[2024/01/15 09:00] 田中: おはようございます！
[2024/01/15 09:01] 佐藤: おはようございます！今日の会議の件ですが
[2024/01/15 09:02] 田中: はい、10時からでしたよね
[2024/01/15 09:03] 佐藤: そうです。資料の準備はいかがですか？
[2024/01/15 09:05] 田中: ほぼ完成しています。後で共有しますね
[2024/01/15 09:06] 佐藤: ありがとうございます！[スタンプ]
EOF
```

### ファイルアップロードテスト

```bash
# Use provided test script
./test_file_upload.sh

# Or manual test
curl -X POST http://localhost:8787/prepare \
  -F "file=@sample_line_chat.txt"
```

### デモインターフェース

```bash
# Open demo interface
open upload-demo.html
```

## 🚀 Production Deployment

### Cloudflare Workers Setup

1. **Vectorize Index作成**:
```bash
wrangler vectorize create line-talk-rag --dimensions=1024 --metric=cosine
```

2. **環境変数設定**:
```bash
wrangler secret put CHANNEL_ACCESS_TOKEN
wrangler secret put CHANNEL_SECRET
```

3. **デプロイ**:
```bash
npm run deploy
```

### LINE Bot設定

1. LINE Developers Consoleでbot作成
2. Webhook URL設定: `https://your-worker.workers.dev/webhook`
3. チャンネルアクセストークンとシークレットを環境変数に設定

## 📊 Performance & Security

### パフォーマンス最適化
- **Workers最適化**: Cloudflare Workers制約に最適化されたコード
- **軽量実装**: メインルーター70行の効率的な実装
- **タイムアウト管理**: AI処理8秒、LINE応答3秒の制限
- **モデル最適化**: 高速応答のためのデュアルモデル戦略

### セキュリティ機能
- **ファイル検証**: .txtファイルのみの厳格な制限
- **署名検証**: LINE Webhook署名の検証
- **入力サニタイゼーション**: 安全なテキスト処理
- **エラーハンドリング**: セキュアなエラー応答

## 🔧 Development

### Code Quality

```bash
# Format and lint
npm run fix

# Type checking
npm run cf-typegen
```

### Project Structure

TypeScript設定でCloudflare Workers用に最適化:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```

## 📚 Documentation

- **API仕様**: このREADME.mdに統合済み - `/prepare`と`/webhook`エンドポイントの完全仕様
- **サンプル**: `sample_line_chat.txt` - テスト用チャットファイル
- **デモ**: `upload-demo.html` - インタラクティブなデモインターフェース
- **テスト**: `test_file_upload.sh` - 自動テストスクリプト

## 🤝 Contributing

このプロジェクトは、高品質なRAGシステムの構築を目指しています。コントリビューションを歓迎します。

## 📄 License

MIT License - 詳細は LICENSE ファイルを参照してください。

---

**LINE Talk RAG System** - あなたのLINEトーク履歴を活用した次世代AI対話システム
