# お問い合わせフォーム

モダンで美しいお問い合わせフォームです。

## 機能

- ✅ レスポンシブデザイン（モバイル対応）
- ✅ リアルタイムバリデーション
- ✅ エラーメッセージ表示
- ✅ 送信時のローディング表示
- ✅ 成功メッセージ表示
- ✅ アクセシビリティ対応

## 使用方法

1. `index.html` をブラウザで開く
2. フォームに必要事項を入力
3. 「送信する」ボタンをクリック

## カスタマイズ

### バックエンド連携

`script.js` の送信処理部分を編集して、実際のAPIエンドポイントに接続してください：

```javascript
const response = await fetch('/api/contact', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify(formData)
});
```

### スタイルの変更

`styles.css` を編集して、色やレイアウトをカスタマイズできます。

## ファイル構成

- `index.html` - HTML構造
- `styles.css` - スタイルシート
- `script.js` - JavaScript機能

## ブラウザ対応

- Chrome（最新版）
- Firefox（最新版）
- Safari（最新版）
- Edge（最新版）
