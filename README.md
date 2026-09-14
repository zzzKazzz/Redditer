# Redditer

Reddit の人気投稿を集め、興味の評価を端末内に残し、その履歴でフィードの並び順を変えるスマホ向け PWA です。ログイン・独自 DB・AI は使いません。

## 起動方法

```bash
npm install
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

本番相当の確認:

```bash
npm run build
npm start
```

PWA（Service Worker）は production ビルド時に有効です。`npm run dev` では無効です。

スマホへ入れる場合は HTTPS（または localhost）で開き、共有メニューから「ホーム画面に追加」します。

## 構成

```
app/                  画面と Reddit プロキシ
  api/reddit/         CORS 回避用の薄い Route Handler
  saved/              保存した投稿
  interests/          好みの可視化
components/           フィード UI
lib/
  subreddits.ts       購読の初期値・名前検証・localStorage
  reddit.ts           正規化とクライアント取得
  feed.ts             Hot / Top と期間
  db.ts               IndexedDB（Dexie）
  tokenize.ts         タイトルの単語分割
  recommend.ts        ルールベースの並び替え
```

ホスティングは `next start` または Vercel など Node が動く環境が必要です。GitHub Pages のような静的ホスティングだけではプロキシが動きません。

## IndexedDB に保存しているもの

DB 名: `redditer`

Dexie のオブジェクトストア名は `posts` と `userActions` です。

### posts

Reddit から取得した表示用データ。主キーは投稿 `id`。再取得時は上書きします。行動履歴は消しません。

- id, title, subreddit, score, comments, createdAt
- permalink, url, imageUrl, selftext（最大 500 文字）, fetchedAt

### user_actions

主キーは `[postId, action]`。

- `like` / `dislike` … 排他。同じボタンをもう一度押すと解除
- `save` … トグル
- `view` … カードが画面内に入った初回のみ。Feed では取得開始時点の既読を外す（スクロール中は消さない）

推薦に使うのは `like` と `dislike` だけです。`save` は保存タブ用です。

## 推薦スコアの仕組み

好みデータ（like / dislike）が 1 件も無いときは、Reddit の `score` が高い順です。

ある場合:

```
rankScore = (post.score / 1000)
          + その subreddit の重み
          + タイトル内単語の重みの合計
```

- like した投稿の subreddit とタイトル単語は +1
- dislike は -1
- 単語は小文字化、英数字以外で分割、3 文字未満と英語ストップワードは除外

重みテーブルは保存しません。表示のたびに `user_actions` から計算します。Interests 画面も同じ計算です。

## Reddit API の利用

ブラウザから `reddit.com` へ直接 `fetch` すると CORS で失敗します。非認証 JSON は User-Agent も必要なため、Next.js の Route Handler が薄いプロキシになります。

- クライアント: `GET /api/reddit?subreddit=technology&sort=hot` または `sort=top&t=week`
- サーバは `https://www.reddit.com/r/{sub}/hot.rss` または `top.rss?t=...`（Atom）を取得する
- 本来は `.json` を使いたいが、Cloudflare が 403 HTML を返すため RSS を MVP の代替にする。JSON が通ればそちらを使う
- RSS には upvote / コメント数が含まれない。取得順を保つため相対スコアだけ入れ、コメント数は 0 にする
- Feed では Hot と Top を切り替えられる。Top は 1時間 / 24時間 / 1週間 / 1ヶ月 / 1年 / すべて
- 認証・DB・業務ロジックは持たない
- subreddit 名は形式だけ検証する（2–21 文字、英数字と `_`）
- 取得は 1 本ずつ＋短い間隔で、Reddit の 429 を避ける

購読対象は興味タブで増減します。端末の `localStorage`（`redditer.subreddits`）に保存し、1–10 件です。未設定時の初期値（`lib/subreddits.ts`）:

- r/all, r/AskReddit, r/technology, r/todayilearned, r/funny, r/worldnews

各 subreddit は 1 本ずつ、1 件あたり 25 投稿です。失敗した subreddit があっても、取れた投稿は表示します。
