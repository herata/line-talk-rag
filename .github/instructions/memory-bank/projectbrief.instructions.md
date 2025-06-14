---
applyTo: "**"
---
# Important Note
This file is a part of the Memory Bank. It is essential for understanding the project and its current state. I MUST read this file at the start of EVERY task.
To ensure I have the most up-to-date context, this file should be very flexible and updated frequently.

# Project Brief: LINE Talk RAG System

## Project Overview
LINE Talk RAGは、LINEのトーク履歴を活用したRAG（Retrieval-Augmented Generation）システムです。Cloudflare Workersプラットフォーム上でHonoフレームワークを使用して構築されています。

## Core Requirements

### 1. 基本構成
- **プラットフォーム**: Cloudflare Workers
- **フレームワーク**: Hono
- **AI/ML**: Workers AI (Embedding & LLM)
- **ベクトルDB**: Cloudflare Vectorize
- **統合**: LINE Messaging API

### 2. 主要エンドポイント

#### `/prepare`エンドポイント
- **目的**: RAGの事前準備
- **機能**: 
  - LINEトーク履歴のテキストデータを入力として受け取り
  - Workers AIのEmbeddingモデルを使用してベクトル化
  - Cloudflare Vectorizeにベクトルデータとして保存

#### `/webhook`エンドポイント
- **目的**: LINEトークのwebhook処理
- **機能**:
  - ユーザからのメッセージを受信
  - Embeddingモデルでユーザメッセージをベクトル化
  - Vectorizeから関連するデータを検索
  - Workers AIのLLMで回答を生成
  - LINEに返信

## Project Goals
1. LINEトーク履歴を効果的に検索・活用できるRAGシステムの構築
2. リアルタイムでの自然な対話体験の提供
3. Cloudflareエコシステムを活用したスケーラブルなソリューション

## Success Criteria
- LINEトーク履歴の効率的なベクトル化と保存
- 関連性の高い情報を基にした適切な回答生成
- LINEユーザとのスムーズな対話フロー
