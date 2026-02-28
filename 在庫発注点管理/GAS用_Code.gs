/**
 * 在庫発注点管理 - Webアプリ用 GAS
 *
 * 【デプロイ手順】
 * 1. スプレッドシートで「拡張機能」＞「Apps Script」を開く
 * 2. 既存のスクリプト（script_01.js の内容）に、このファイルの内容を追加する
 * 3. 「ファイル」＞「新規」＞「HTML ファイル」で「Index」など名前を付けて作成
 * 4. GAS用_WebApp.html の内容をそのHTMLファイルにすべて貼り付けて保存
 * 5. このファイルの doGet と getOrderJudgmentData がプロジェクトに含まれていることを確認
 * 6. 「デプロイ」＞「新しいデプロイ」＞「ウェブアプリ」を選択
 * 7. 説明を入力し、「次のユーザーとして実行」は「自分」、「アクセスできるユーザー」を選択して「デプロイ」
 */

/**
 * Webアプリとして開いたときに表示するHTMLを返す
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('在庫発注点管理シート')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * 「発注判断」シートのデータを取得し、Webアプリ用のJSON形式で返す
 * HTML側から google.script.run.getOrderJudgmentData() で呼ばれる
 */
function getOrderJudgmentData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('発注判断');
  if (!sheet) {
    return [];
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return [];
  }

  // 2行目以降のデータを取得（1行目はヘッダー）
  var data = sheet.getRange(2, 1, lastRow, 8).getValues();
  var result = [];

  data.forEach(function(row) {
    var supplier = row[0] ? String(row[0]).trim() : '';
    var code = row[1] ? String(row[1]).trim() : '';
    var name = row[2] ? String(row[2]).trim() : '';
    var stock = typeof row[3] === 'number' ? row[3] : (parseFloat(row[3]) || 0);
    var avgSales = row[4];
    if (avgSales === '' || avgSales === null || String(avgSales).indexOf('実績なし') !== -1) {
      avgSales = null;
    } else {
      avgSales = typeof avgSales === 'number' ? avgSales : parseFloat(avgSales);
    }
    var expiryDays = row[5];
    if (expiryDays === '' || expiryDays === null || String(expiryDays).indexOf('実績なし') !== -1) {
      expiryDays = null;
    } else {
      expiryDays = typeof expiryDays === 'number' ? expiryDays : parseFloat(expiryDays);
    }
    var reorderPoint = typeof row[6] === 'number' ? row[6] : (parseFloat(row[6]) || 0);
    var statusStr = row[7] ? String(row[7]).replace(/[🔴🟡🟢\s]/g, '').trim() : '';

    result.push({
      supplier: supplier,
      code: code,
      name: name,
      stock: stock,
      avgSales: avgSales,
      expiryDays: expiryDays,
      reorderPoint: reorderPoint,
      status: statusStr || null
    });
  });

  return result;
}
