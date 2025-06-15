---
applyTo: "**"
---
# Important Note
This file is a part of the Memory Bank. It is essential for understanding the project and its current state. I MUST read this file at the start of EVERY task.
To ensure I have the most up-to-date context, this file should be very flexible and updated frequently.

# Product Context: LINE Talk RAG System

## Why This Project Exists

### Problem Statement
LINEのトーク履歴には貴重な情報が蓄積されているが、過去の会話内容を効率的に検索・参照することは困難です。特に：
- 大量のメッセージから特定の情報を見つけるのに時間がかかる
- 過去の重要な会話や決定事項を忘れがちになる
- 関連する情報を横断的に検索することができない

### Solution Approach
RAG（Retrieval-Augmented Generation）技術を活用し、LINEトーク履歴をベクトル化して保存し、ユーザの質問に対して関連する過去の会話内容を基にした適切な回答を生成します。

## How It Should Work

### User Experience Flow
1. **準備フェーズ**: 
   - ユーザがLINEトーク履歴をテキスト形式でエクスポート
   - `/prepare`エンドポイントに.txtファイルをアップロード
   - システムがファイル形式を検証し、データを解析
   - LINEチャット履歴の自動解析と会話チャンク化
   - Workers AIでベクトル化してVectorizeに保存

2. **対話フェーズ**:
   - ユーザがLINEボットに質問を送信
   - システムが過去の履歴から関連情報を検索
   - AIが検索結果を基に自然な回答を生成
   - LINEを通じてユーザに回答を返信

### Key User Benefits
- **効率的な情報検索**: 自然言語で過去の会話内容を検索可能
- **文脈を理解した回答**: 単純なキーワード検索ではなく、意味的に関連する情報を提供
- **シームレスな体験**: LINE内で完結する直感的なインターフェース
- **プライバシー保護**: データはユーザ専用のベクトル空間に安全に保存
- **セキュアなファイル処理**: .txtファイルのみの制限でセキュリティ向上

## Target Use Cases
1. **個人の記録管理**: 重要な決定や約束事の確認
2. **学習・研究支援**: 過去の議論や学習内容の復習
3. **チーム情報共有**: グループチャットでの情報検索・参照
4. **顧客サポート**: 過去のやり取りを基にした個別対応
