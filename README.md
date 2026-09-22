# AIB-C01 一問一答

AWS Certified AI Business Strategist (AIB-C01) の予想問題（全510問・6セット）を
一問一答形式で学習できる、静的な Web サイトです。ビルド不要・バックエンド不要の
素の HTML / CSS / JavaScript のみで構成されています。

## 構成

```
index.html          画面（設定 → 出題 → 結果の3画面構成）
style.css            スタイル
app.js                クイズのロジック（データ読込・出題・採点・復習）
data/questions.json   510問分の問題データ（自動生成）
```

## 主な機能

- セット（Set 1〜6 / 全セット）、ドメイン（1〜4）、出題順（シャッフル / 順番どおり）、
  問題数（10 / 20 / 50 / 85 / 全問）を指定して出題
- 単一選択・複数選択（「2つ選択せよ」形式）の両方に対応
- 回答するとその場で正誤・正答・解説を表示
- 結果画面でドメインごとの正答率を表示
- 間違えた問題はブラウザの localStorage に記録され、「前回の不正解を復習する」から
  ピンポイントで再学習可能（サーバー・アカウント不要、端末内のみで完結）

## ローカルで確認する

静的ファイルなので、任意の HTTP サーバーで配信すれば動作します。

```bash
python3 -m http.server 8000
# http://localhost:8000/ を開く
```

（`file://` で直接開くと `fetch("data/questions.json")` がブラウザのセキュリティ制限で
失敗するため、必ず簡易サーバー経由で確認してください。）

## GitHub Pages で公開する

1. このディレクトリの内容を GitHub リポジトリの `main` ブランチ直下（リポジトリのルート）に
   push する
2. GitHub のリポジトリ画面で **Settings → Pages** を開く
3. **Build and deployment** の **Source** を `Deploy from a branch` にし、
   **Branch** を `main` / `/ (root)` に設定して **Save**
4. 数十秒〜数分後、`https://<ユーザー名>.github.io/<リポジトリ名>/` で公開されます

ビルドステップは無いため、GitHub Actions の設定なしでそのまま公開できます。

## データについて

`data/questions.json` は、元となる6つの問題セット（Markdown形式）から自動的に
抽出・生成したものです。各セットの Markdown ファイルが更新された場合は、抽出スクリプトを
再実行して再生成してください。

問題内容は非公式の予想問題であり、実際の試験内容・出題範囲を保証するものではありません。
AWS および AWS Certified AI Business Strategist は Amazon Web Services, Inc. の商標です。
