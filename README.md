# LINE Talk RAG System

## 🚀 Overview

LINE Talk RAGは、LINEのトーク履歴を活用した**超高性能RAG（Retrieval-Augmented Generation）システム**です。Cloudflare Workersプラットフォーム上で動作し、17Bパラメータの最新AIモデル `llama-4-scout-17b-16e-instruct` を搭載。LINEチャット履歴をインテリジェントに解析・ベクトル化し、Enhanced RAG戦略による一貫性の高い自然な対話型AIアシスタントを実現します。

### ✨ Key Features

- **🔍 高度なLINEチャット解析**: 複数のLINEエクスポート形式に対応した智的パーサー
- **📁 セキュアなファイルアップロード**: .txtファイル専用の安全なアップロード機能
- **🧠 Ultra High-Performance RAG**: 17Bパラメータモデルによる超高性能な検索拡張生成
- **⚡ Enhanced RAG戦略**: 5文書同時検索とメタデータ活用による高精度応答
- **🌍 日本語最適化**: 日本語コンテンツに最適化された処理とレスポンス
- **🔒 プロダクション対応**: エンタープライズレベルのセキュリティとパフォーマンス

## 🎯 Ultra High-Performance RAG System

### RAG専用戦略の採用
LINE Talk RAGシステムは、**検索拡張生成（RAG）専用戦略**を採用した次世代AI対話システムです。従来の即座応答機能を廃し、全ての応答がベクトル検索による関連情報の取得と17Bパラメータの超高性能AIモデルによる生成を経て提供されます。

### Ultra High-Performance AI Engine
- **Model**: `llama-4-scout-17b-16e-instruct` (17B parameters)
- **Configuration**: 
  - `max_tokens: 400` - 適切な応答長の制御
  - `temperature: 0.2` - 一貫性と精度のバランス最適化
- **Enhanced RAG**: 5文書同時検索による豊富なコンテキスト活用
- **Metadata Integration**: 時間・参加者・会話文脈を含む高精度理解

### システム特徴
- **100%RAG応答**: 全ての回答が検索拡張生成による高品質応答
- **高精度検索**: ベクトル類似度とメタデータを組み合わせた智的検索
- **コンテキスト保持**: 長期間の会話履歴からの適切な情報抽出
- **プロダクション品質**: エンタープライズレベルの信頼性と性能

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
- **AI/ML**: Workers AI (Embedding: bge-m3, LLM: llama-4-scout-17b-16e-instruct)
- **Vector DB**: Cloudflare Vectorize
- **Integration**: LINE Messaging API
- **Language**: TypeScript

## 🚀 Quick Start

### 1. Installation

```bash
npm install
```

### 2. Environment Setup

#### LINE Bot認証情報の設定

```bash
# 環境変数テンプレートをコピー
cp .dev.vars.example .dev.vars
```

`.dev.vars`ファイルを編集してLINE Bot認証情報を設定：

```bash
# LINE Bot Configuration
LINE_CHANNEL_SECRET=your_line_channel_secret_here
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token_here

# Development Notes:
# 1. Get LINE_CHANNEL_SECRET from LINE Developers Console > Your Bot > Channel Secret
# 2. Get LINE_CHANNEL_ACCESS_TOKEN from LINE Developers Console > Your Bot > Channel Access Token
# 3. Copy this file to .dev.vars for local development
# 4. Use `wrangler secret` command to set production secrets
```

**認証情報の取得手順：**
1. [LINE Developers Console](https://developers.line.biz/console/)にアクセス
2. あなたのBotを選択 → **Channel Secret**をコピー
3. **Channel Access Token**を生成・コピー
4. `.dev.vars`ファイルに貼り付け

### 3. Access Control Configuration (Optional)

特定のトークルームでのみBotの利用を制限したい場合は、環境変数を設定します：

```bash
# .dev.vars に追加
ALLOWED_TALK_ROOMS=user_id_1,group_id_1,room_id_1

# または wrangler.jsonc の vars セクションに追加
{
  "vars": {
    "ALLOWED_TALK_ROOMS": "user_id_1,group_id_1,room_id_1"
  }
}
```

#### アクセス制御の動作
- **友達追加**: 誰でも友達追加可能
- **メッセージ利用**: `ALLOWED_TALK_ROOMS` で指定されたトークルームのみ
- **未設定時**: 全てのトークルームで利用可能

## 📋 LINE ID取得ガイド

### 取得できるID種類

| ID種類 | 説明 | 使用場面 |
|--------|------|----------|
| User ID | 1対1チャットのユーザID | 個人ユーザーのみアクセス許可 |
| Group ID | グループチャットのID | 特定グループのみアクセス許可 |
| Room ID | 複数人チャット（3-500人）のID | 特定ルームのみアクセス許可 |

### ID取得方法

#### 方法1: サーバーログ確認

**ローカル開発時**
```bash
# 開発サーバー起動
npm run dev

# LINEでメッセージ送信後、ログを確認
# 出力例: Message received - Type: group, ID: C1234567890abcdef1234567890abcdef, Message: "こんにちは"
```

**本番環境**
```bash
# リアルタイムログ確認
wrangler tail

# 特定時間のログ確認
wrangler tail --since 1h
```

#### 方法2: 制限時の案内メッセージ

アクセス制限が有効な状態で、制限されたトークルームからメッセージを送ると、IDが案内メッセージに含まれます。

**レスポンス例:**
```
😥 このボットは許可されたトークルーム、およびユーザのみ利用可能です
Source Type: group
Source ID: C1234567890abcdef1234567890abcdef
```

### ID設定方法

#### ローカル開発（.dev.vars）
```bash
ALLOWED_TALK_ROOMS=U1234567890abcdef1234567890abcdef,C1234567890abcdef1234567890abcdef
```

#### 本番環境

**方法1: wrangler.jsonc**
```json
{
  "vars": {
    "ALLOWED_TALK_ROOMS": "U1234567890abcdef1234567890abcdef,C1234567890abcdef1234567890abcdef"
  }
}
```

**方法2: wrangler secret コマンド**
```bash
wrangler secret put ALLOWED_TALK_ROOMS
# プロンプトでIDリストを入力
```

### セキュリティ注意事項

- **IDは機密情報**: ログファイルやコードに直接含めないよう注意
- **最小権限の原則**: 必要最小限のトークルームのみ許可
- **定期的な見直し**: 不要になったIDは設定から削除

### テスト方法

1. IDを設定
2. 許可されたトークルームでメッセージ送信 → 正常動作
3. 許可されていないトークルームでメッセージ送信 → 制限メッセージ表示
4. サーバーログでID確認 → 設定値と一致確認

### 4. Development

```bash
# Start development server
npm run dev

# Generate types (optional)
npm run cf-typegen

# Code formatting
npm run fix
```

### 5. Deployment

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
# LINE公式エクスポート形式（標準）
[LINE] 友達とのトーク履歴
保存日時：2024/1/15 14:30

2024/1/15(月)
09:00	ユーザー名	メッセージ内容
09:01	ユーザー名	メッセージ内容

# 注意：タブ区切り（\t）形式で、時刻・ユーザー名・メッセージの順序
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
    "aiModel": "@cf/microsoft/llama-4-scout-17b-16e-instruct",
    "ragStrategy": "enhanced-5-document-search",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### `/webhook` - LINE Bot Integration

LINE Messaging APIからのWebhookを処理し、RAGベースの応答を生成します。

#### 機能
- **メッセージ処理**: ユーザーメッセージの受信・解析
- **Enhanced RAG検索**: ベクトル化されたチャット履歴から5文書の関連情報を同時検索
- **Ultra High-Performance AI応答**: 17Bパラメータモデルによる高品質な日本語応答生成
- **RAG専用戦略**: 検索拡張生成に特化した一貫性のある応答システム
- **メタデータ活用**: 時間・参加者情報を含む高精度コンテキスト理解
- **セキュリティ**: LINE署名検証による安全な通信

### `/clear` - ベクトルデータベースクリア

ベクトルデータベース（Cloudflare Vectorize）内の全てのベクトルデータを削除します。

#### Request Format

```bash
# Clear all vectors from the database
curl -X DELETE https://your-worker.workers.dev/clear
```

#### レスポンス例

```json
{
  "message": "ベクトルデータベースが正常にクリアされました",
  "status": "SUCCESS",
  "deletedCount": 156,
  "beforeStats": {
    "vectorCount": 156
  },
  "afterStats": {
    "vectorCount": 0
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### 機能
- **完全クリア**: Vectorizeインデックス内の全ベクトルを削除
- **バッチ処理**: 大量のベクトルを効率的に処理
- **統計情報**: クリア前後のデータベース統計
- **エラーハンドリング**: 詳細なエラー情報とステータス
- **セキュリティ**: 適切な権限チェックとエラー処理

#### 注意事項
- **不可逆操作**: 削除されたデータは復元できません
- **完全削除**: 全てのチャット履歴とベクトルデータが削除されます
- **RAG機能停止**: クリア後はRAG検索が機能しません（新しいデータをアップロードするまで）

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
- **Ultra High-Performance LLM**: `@cf/microsoft/llama-4-scout-17b-16e-instruct` - 17Bパラメータの超高性能モデル
  - **Configuration**: max_tokens: 400, temperature: 0.2
  - **RAG専用戦略**: 検索拡張生成に特化した応答システム
  - **Enhanced RAG**: 5文書同時検索による高精度コンテキスト理解

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
- **RAG専用戦略**: 全ての応答が検索拡張生成による一貫性のあるシステム
- **Ultra High-Performance Processing**: 17Bパラメータモデルによる高品質応答生成
- **Enhanced RAG検索**: 5文書同時検索とメタデータ活用による高精度情報取得
- **パフォーマンス最適化**: 8秒AIタイムアウト、3秒LINE応答制限
- **堅牢なエラーハンドリング**: プロダクション対応の包括的エラー処理

## 🧪 Testing

### サンプルデータ作成

```bash
# Create test file
cat > sample_line_chat.txt << 'EOF'
[LINE] 友達とのトーク履歴
保存日時：2024/1/15 14:30

2024/1/15(月)
09:00	田中	おはようございます！
09:01	佐藤	おはようございます！今日の会議の件ですが
09:02	田中	はい、10時からでしたよね
09:03	佐藤	そうです。資料の準備はいかがですか？
09:05	田中	ほぼ完成しています。後で共有しますね
09:06	佐藤	ありがとうございます！[スタンプ]
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

### Ultra High-Performance最適化
- **17B Parameter Model**: 超高性能`llama-4-scout-17b-16e-instruct`による卓越した応答品質
- **Enhanced RAG Strategy**: 5文書同時検索による豊富なコンテキスト活用
- **Optimized Configuration**: max_tokens: 400, temperature: 0.2による精度と効率のバランス
- **Workers最適化**: Cloudflare Workers制約に最適化されたコード
- **軽量実装**: メインルーター70行の効率的な実装
- **タイムアウト管理**: AI処理8秒、LINE応答3秒の制限
- **プロダクション品質**: 100%完成度のエンタープライズレベル実装

### セキュリティ機能
- **ファイル検証**: .txtファイルのみの厳格な制限
- **署名検証**: LINE Webhook署名の検証
- **入力サニタイゼーション**: 安全なテキスト処理
- **包括的エラーハンドリング**: セキュアで堅牢なエラー応答

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

- **API仕様**: このREADME.mdに統合済み - `/prepare`、`/webhook`、`/clear`エンドポイントの完全仕様
- **サンプル**: `sample_line_chat.txt` - テスト用チャットファイル
- **デモ**: `upload-demo.html` - インタラクティブなデモインターフェース
- **テスト**: `test_file_upload.sh` - 自動テストスクリプト

## 🤝 Contributing

このプロジェクトは、高品質なRAGシステムの構築を目指しています。コントリビューションを歓迎します。

## 📄 License

MIT License - 詳細は LICENSE ファイルを参照してください。

---

**LINE Talk RAG System** - 17Bパラメータ超高性能AIを搭載した次世代RAG対話システム
