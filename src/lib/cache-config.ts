/**
 * キャッシュ設定の一元管理
 * 
 * サーバーサイド（Route Handler）とクライアントサイド（React Query）の
 * キャッシュ設定を統一的に管理
 */

// サーバーサイドキャッシュ（秒単位）
export const SERVER_CACHE = {
  // 変更頻度が低いデータ（10分）
  LANGUAGES_REVALIDATE: 600,
  STATS_REVALIDATE: 600,
  
  // 変更頻度が高いデータ（5分）
  COMMITS_REVALIDATE: 300,
  CONTRIBUTORS_REVALIDATE: 300,
  
  // ユーザー関連データ（1時間）- 変更頻度が低く、APIレート制限を考慮
  USER_PROFILE_REVALIDATE: 3600,
  USER_CONTRIBUTION_REVALIDATE: 3600,
  
  // ユーザー検索（1分）- 検索結果は短めにキャッシュ
  USER_SEARCH_REVALIDATE: 60,
  
  // ユーザーイベント（5分）- アクティビティデータ
  USER_EVENTS_REVALIDATE: 300,
} as const;

// stale-while-revalidate（revalidateの2倍を推奨）
export const SWR_CACHE = {
  LANGUAGES: SERVER_CACHE.LANGUAGES_REVALIDATE * 2,
  STATS: SERVER_CACHE.STATS_REVALIDATE * 2,
  COMMITS: SERVER_CACHE.COMMITS_REVALIDATE * 2,
  CONTRIBUTORS: SERVER_CACHE.CONTRIBUTORS_REVALIDATE * 2,
} as const;

// クライアントサイドキャッシュ（ミリ秒単位）
export const CLIENT_CACHE = {
  // サーバーキャッシュと同じ時間をミリ秒に変換
  LANGUAGES_STALE_TIME: SERVER_CACHE.LANGUAGES_REVALIDATE * 1000,
  STATS_STALE_TIME: SERVER_CACHE.STATS_REVALIDATE * 1000,
  COMMITS_STALE_TIME: SERVER_CACHE.COMMITS_REVALIDATE * 1000,
  CONTRIBUTORS_STALE_TIME: SERVER_CACHE.CONTRIBUTORS_REVALIDATE * 1000,
  
  // コミット履歴（10分）- 長めにキャッシュ
  COMMIT_HISTORY_STALE_TIME: 10 * 60 * 1000,
  
  // リポジトリ一覧（5分）- ダッシュボード用
  REPOSITORIES_STALE_TIME: 5 * 60 * 1000,
  
  // 検索関連（5分）- APIレート制限対策
  SEARCH_STALE_TIME: 5 * 60 * 1000,
  
  // 静的データ（1時間）- 人気リポジトリ等の変更頻度が低いデータ
  STATIC_DATA_STALE_TIME: 60 * 60 * 1000,
  
  // gcTime: 最長のstaleTime（10分）の3倍を基準に30分に統一
  // 異なるstaleTimeごとにgcTimeを分けると複雑になるため、
  // 最長に合わせることで全データを安全にキャッシュ保持
  GC_TIME: 30 * 60 * 1000,
} as const;
