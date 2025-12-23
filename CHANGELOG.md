# Changelog

本プロジェクトの主要な変更履歴。

## 2025-12-23

- feat: ユーザープロフィールページにストリーク表示を追加（#43）
  - StreakCardコンポーネント（グラデーション色、Personal Bestバッジ）
  - User APIにストリーク取得（認証済みのみ）
  - InsightScoreCardを英語UI化

## 2025-12-22

- VISION.md 作成（設計思想ドキュメント）
- ROADMAP.md 再構成

## 2025-12-19

- Phase 5 完了
  - テーマ切り替え（next-themes導入）
  - Xシェアボタン追加
  - メタデータ最適化

## 2025-12-18

- github.ts リファクタリング完了（1658行 → 8モジュール分割）
- テストカバレッジ 21.15% → 94.15% 達成（362テスト、106件追加）
- CI改善（Playwright/Cargoキャッシュ、similarity-ts導入、AUTH_SECRET追加）
- GraphQL変数名修正（$query → $searchQuery）

## 2025-12-17

- Phase 4 Insight Score 完了
  - スコア計算ロジック実装
  - UIコンポーネント実装
  - OGカード表示対応
- ユーザーページの統計カードを削除、InsightScoreCardに統合
- ロードマップ再構成（Insight Scoreを Phase 4 に優先化、Phase 7 追加）
- 差別化ポイント・収益化モデル・戦略的タイムライン追加

## 2025-12-16

- Phase 6 に Insight Score 機能を追加

## 2025-12-15

- Phase 3 完了
  - アクティビティヒートマップ実装
  - 貢献タイプ分布実装
- 統一レイアウト実装（AppHeader, DashboardLayout, StatCard, SectionCard）
- ユーザーAPIの認証バグ修正（unstable_cache削除）

## 2025-12-14

- Phase 3 ユーザー検索・プロファイル機能実装
- Phase 3 計画策定、ユーザー検索・プロファイル機能仕様書作成
- OGカード改善、バッジポップオーバー、人気リポジトリ自動更新
- Phase 2 完了、レスポンシブ対応追加
- Publicリポジトリ検索機能追加

## 2025-12-12

- ロードマップ初版作成
- Phase 1 完了、Phase 2 計画策定
