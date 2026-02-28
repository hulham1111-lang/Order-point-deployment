function calculateInventory() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const retentionDays = 90; 

  // 1. シートと設定値の一括取得
  const sheetNames = ["CSV取込", "履歴", "発注判断", "設定"];
  const sheets = {};
  sheetNames.forEach(name => sheets[name] = ss.getSheetByName(name));

  const settings = sheets["設定"].getRange("B1:B3").getValues();
  const [targetDays, leadTime, yellowDays] = [settings[0][0], settings[1][0], settings[2][0]];

  const importData = sheets["CSV取込"].getDataRange().getValues();
  const header = importData[0];
  const [codeIdx, nameIdx, stockIdx, supplierIdx] = [
    header.indexOf("助ネコ商品コード"), header.indexOf("商品名"), 
    header.indexOf("在庫数"), header.indexOf("仕入先")
  ];

  const getZeroDate = (d) => {
    const res = new Date(d);
    res.setHours(0, 0, 0, 0);
    return res;
  };

  const today = getZeroDate(new Date());
  const todayStr = Utilities.formatDate(today, "JST", "yyyy-MM-dd");
  const cutoffDate = new Date(today);
  cutoffDate.setDate(today.getDate() - retentionDays);

  // 2. 履歴データの読み込みと「メモリ上での整理」
  let historySheet = sheets["履歴"];
  let historyData = historySheet.getDataRange().getValues();
  if (historyData.length <= 1) historyData = [["日付", "商品コード", "在庫数", "販売数"]];
  
  const lastStockMap = {};
  const historyByProduct = {}; 
  const processedHistoryRows = []; // 最終的にシートへ戻すための配列

  // 履歴シートを1回だけスキャンして「今日以外」を整理
  historyData.forEach((row, idx) => {
    if (idx === 0) return;
    const d = getZeroDate(row[0]);
    const rowDateStr = Utilities.formatDate(d, "JST", "yyyy-MM-dd");
    const code = row[1];

    // 90日より前、または「今日」のデータは一旦除外（後で最新を入れるため）
    if (d < cutoffDate || rowDateStr === todayStr) return;

    lastStockMap[code] = row[2];
    processedHistoryRows.push(row);

    if (!historyByProduct[code]) historyByProduct[code] = [];
    historyByProduct[code].push({ date: d, stock: row[2], sales: Number(row[3] || 0) });
  });

  // 3. 今日のデータを生成（メモリ内でのみ処理）
  const currentStockMap = {};
  for (let i = 1; i < importData.length; i++) {
    const code = importData[i][codeIdx];
    const stock = Number(importData[i][stockIdx]);
    if (!code) continue;

    let sales = 0;
    if (lastStockMap[code] !== undefined) {
      const diff = lastStockMap[code] - stock;
      sales = diff > 0 ? diff : 0; 
    }
    
    const rowData = [todayStr, code, stock, sales];
    processedHistoryRows.push(rowData); // メモリ上の配列に追加
    currentStockMap[code] = { name: importData[i][nameIdx], stock: stock, supplier: importData[i][supplierIdx] };

    if (!historyByProduct[code]) historyByProduct[code] = [];
    historyByProduct[code].push({ date: today, stock: stock, sales: sales });
  }

  // 4. 【爆速の核心】シートへの書き出しを一発で行う
  historySheet.clearContents();
  const outputHistory = [["日付", "商品コード", "在庫数", "販売数"]].concat(processedHistoryRows);
  historySheet.getRange(1, 1, outputHistory.length, 4).setValues(outputHistory);

  // 5. 平均計算ロジック（計算精度は完全に維持）
  const resultRows = [];
  for (const code in currentStockMap) {
    const entries = historyByProduct[code] || [];
    if (entries.length < 2) continue;

    entries.sort((a, b) => a.date - b.date);

    let totalSales = 0;
    let replenishments = 0;
    const firstDate = entries[0].date;
    const lastDate = entries[entries.length - 1].date;
    const totalDays = Math.round((lastDate - firstDate) / (1000 * 60 * 60 * 24));

    for (let i = 0; i < entries.length; i++) {
      if (i === 0) continue;
      totalSales += entries[i].sales;
      if (entries[i].stock > entries[i-1].stock) replenishments += 1;
    }

    const effectiveDays = totalDays - replenishments;
    const avgSales = totalSales / (effectiveDays <= 0 ? 1 : effectiveDays);
    const info = currentStockMap[code];
    const daysLeft = avgSales > 0 ? info.stock / avgSales : 999;
    const orderQty = Math.max(0, Math.ceil((avgSales * targetDays) - info.stock));
    
    let status = "🟢 余裕";
    const floorDaysLeft = Math.floor(daysLeft);
    if (floorDaysLeft <= leadTime) status = "🔴 急ぎ発注";
    else if (floorDaysLeft <= yellowDays) status = "🟡 検討";

    resultRows.push([info.supplier, code, info.name, info.stock, avgSales.toFixed(2), 
                     daysLeft === 999 ? "実績なし" : floorDaysLeft, orderQty, status]);
  }

  // 6. 結果の書き出し
  const resultSheet = sheets["発注判断"];
  if (resultSheet.getLastRow() > 1) resultSheet.getRange(2, 1, resultSheet.getLastRow() - 1, 8).clearContent();
  if (resultRows.length > 0) {
    resultRows.sort((a, b) => a[0] < b[0] ? -1 : 1);
    resultSheet.getRange(2, 1, resultRows.length, 8).setValues(resultRows);
  }

  SpreadsheetApp.getUi().alert("計算完了！");
}
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('★在庫管理メニュー')
    .addItem('CSVから発注判断を更新', 'calculateInventory')
    .addToUi();
}