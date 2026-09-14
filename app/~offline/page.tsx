export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-xl font-semibold">オフラインです</h1>
      <p className="text-sm text-muted">
        新規の取得には接続が必要です。保存済みの投稿は、接続後にフィードから見られます。
      </p>
    </main>
  );
}
