/**
 * 在庫発注点管理シート - ウェブアプリ用スクリプト
 * スプレッドシートの「発注判断」シートのデータを表示します。
 * 
 * 【データ取得方法】
 * このウェブアプリは、Googleスプレッドシートの「発注判断」シートからデータを取得します。
 * 実装方法：
 * 1. Google Apps ScriptでWeb Appとして公開し、JSON形式でデータを返す
 * 2. Google Sheets APIを使用してデータを取得
 * 3. スプレッドシートをCSVとしてエクスポートし、手動で読み込む
 * 
 * 現在はサンプルデータで動作確認できます。
 */

(function () {
    'use strict';

    // データストレージ（実際はスプレッドシートから取得）
    let items = [];

    // 設定値（実際は「設定」シートから取得）
    // これらの値はGASスクリプトで使用されています
    const SETTINGS = {
        targetDays: 30,      // 目標在庫日数（設定シート B1）
        leadTime: 3,         // リードタイム（設定シート B2）
        yellowDays: 7        // 検討開始日数（設定シート B3）
    };

    // DOM要素
    const tableBody = document.getElementById('tableBody');
    const emptyState = document.getElementById('emptyState');
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');
    const filterButtons = document.querySelectorAll('.filter-tabs button[data-filter]');
    const summaryUrgent = document.getElementById('summaryUrgent');
    const summaryReview = document.getElementById('summaryReview');
    const summaryTotal = document.getElementById('summaryTotal');
    const summaryOk = document.getElementById('summaryOk');

    let currentFilter = 'all';
    let searchQuery = '';
    let supplierSort = 'asc'; // 'asc' | 'desc'

    /**
     * GASスクリプトのロジックに基づくステータス判定
     * 在庫期限(日)に基づいて判定します
     */
    function getStatus(expiryDays) {
        if (expiryDays === null || expiryDays === undefined || expiryDays === '実績なし' || expiryDays === 999) {
            return { label: '実績なし', class: '', emoji: '' };
        }

        const floorDays = Math.floor(expiryDays);
        
        if (floorDays <= SETTINGS.leadTime) {
            return { label: '急ぎ発注', class: 'urgent', emoji: '🔴' };
        } else if (floorDays <= SETTINGS.yellowDays) {
            return { label: '検討', class: 'review', emoji: '🟡' };
        } else {
            return { label: '余裕', class: 'ok', emoji: '🟢' };
        }
    }

    /**
     * ステータスに基づいて行のクラス名を取得
     */
    function getRowClass(status) {
        if (status === '急ぎ発注') return 'status-urgent';
        if (status === '検討') return 'status-review';
        if (status === '余裕') return 'status-ok';
        return '';
    }

    /**
     * 検索にマッチするか
     */
    function matchesSearch(item) {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.trim().toLowerCase();
        return (
            (item.name && item.name.toLowerCase().includes(q)) ||
            (item.code && item.code.toLowerCase().includes(q)) ||
            (item.supplier && item.supplier.toLowerCase().includes(q))
        );
    }

    /**
     * フィルターにマッチするか
     */
    function matchesFilter(item) {
        if (currentFilter === 'all') return true;
        if (currentFilter === 'urgent') return item.status === '急ぎ発注';
        if (currentFilter === 'review') return item.status === '検討';
        if (currentFilter === 'ok') return item.status === '余裕';
        return true;
    }

    /**
     * フィルター済みアイテムを取得（仕入先でソート済み）
     */
    function getFilteredItems() {
        const filtered = items.filter(function (item) {
            return matchesSearch(item) && matchesFilter(item);
        });
        const aVal = function (item) { return (item.supplier || '').toString(); };
        return filtered.slice().sort(function (a, b) {
            const va = aVal(a);
            const vb = aVal(b);
            const cmp = va.localeCompare(vb, 'ja');
            return supplierSort === 'asc' ? cmp : -cmp;
        });
    }

    /**
     * 数値をフォーマット（null/undefined/実績なしの場合は「実績なし」）
     */
    function formatNumber(value) {
        if (value == null || value === '' || value === '実績なし' || value === 999) return '実績なし';
        if (typeof value === 'number') {
            // 在庫期限(日)は整数表示、1日平均販売数は小数点2桁
            return value % 1 === 0 ? value.toString() : value.toFixed(2);
        }
        return value;
    }

    /**
     * HTMLエスケープ
     */
    function escapeHtml(s) {
        if (s == null) return '';
        const div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }

    /**
     * テーブル行を生成
     * GASスクリプトの出力形式: [仕入先, 商品コード, 商品名, 在庫数, 1日平均販売数, 在庫期限(日), 発注目安(数), ステータス]
     */
    function renderRow(item) {
        const tr = document.createElement('tr');
        const rowClass = getRowClass(item.status);
        if (rowClass) tr.classList.add(rowClass);

        // ステータスから絵文字とクラスを取得
        const statusInfo = getStatus(item.expiryDays);
        const statusClass = statusInfo.class;
        const statusLabel = statusInfo.emoji + ' ' + statusInfo.label;

        tr.innerHTML =
            '<td>' + escapeHtml(item.supplier || '—') + '</td>' +
            '<td>' + escapeHtml(item.code || '—') + '</td>' +
            '<td>' + escapeHtml(item.name || '—') + '</td>' +
            '<td class="num">' + formatNumber(item.stock) + '</td>' +
            '<td class="num">' + formatNumber(item.avgSales) + '</td>' +
            '<td class="num">' + formatNumber(item.expiryDays) + '</td>' +
            '<td class="num">' + formatNumber(item.reorderPoint) + '</td>' +
            '<td><span class="status ' + statusClass + '">' + escapeHtml(statusLabel) + '</span></td>';

        return tr;
    }

    /**
     * テーブルを描画
     */
    function renderTable() {
        const filteredItems = getFilteredItems();

        tableBody.innerHTML = '';
        filteredItems.forEach(function (item) {
            tableBody.appendChild(renderRow(item));
        });

        emptyState.hidden = filteredItems.length > 0;
    }

    /**
     * サマリーを更新
     */
    function updateSummary() {
        const urgentCount = items.filter(function(item) { return item.status === '急ぎ発注'; }).length;
        const reviewCount = items.filter(function(item) { return item.status === '検討'; }).length;
        const okCount = items.filter(function(item) { return item.status === '余裕'; }).length;
        const total = items.length;

        summaryUrgent.textContent = urgentCount;
        summaryReview.textContent = reviewCount;
        summaryOk.textContent = okCount;
        summaryTotal.textContent = total;
    }

    /**
     * フィルターを設定
     */
    function setActiveFilter(filter) {
        currentFilter = filter;
        filterButtons.forEach(function (btn) {
            btn.classList.toggle('active', btn.getAttribute('data-filter') === filter);
        });
        renderTable();
    }

    /**
     * 仕入先の並び順を設定
     */
    function setSupplierSort(sort) {
        supplierSort = sort;
        const sortAsc = document.getElementById('sortAsc');
        const sortDesc = document.getElementById('sortDesc');
        if (sortAsc) sortAsc.setAttribute('aria-pressed', sort === 'asc' ? 'true' : 'false');
        if (sortDesc) sortDesc.setAttribute('aria-pressed', sort === 'desc' ? 'true' : 'false');
        renderTable();
    }

    /**
     * 検索処理（×ボタンは文字入力時のみ表示）
     */
    function onSearch() {
        searchQuery = searchInput.value;
        if (searchClear) {
            searchClear.hidden = searchQuery.trim() === '';
        }
        renderTable();
    }

    /**
     * 検索をクリア（文字を全部消し、×も消す）
     */
    function clearSearch() {
        searchInput.value = '';
        searchQuery = '';
        if (searchClear) {
            searchClear.hidden = true;
        }
        renderTable();
        searchInput.focus();
    }

    /**
     * スプレッドシートからデータを取得（サンプル実装）
     * 実際の実装では、Google Apps ScriptのWeb AppやGoogle Sheets APIを使用
     */
    function loadDataFromSpreadsheet() {
        // TODO: 実際のスプレッドシートからデータを取得する実装
        // 例: Google Apps ScriptのWeb Appエンドポイントを呼び出す
        // fetch('YOUR_WEB_APP_URL')
        //     .then(response => response.json())
        //     .then(data => {
        //         items = data;
        //         updateSummary();
        //         renderTable();
        //     });

        // サンプルデータ（GASスクリプトの出力形式に合わせる）
        items = [
            { supplier: 'YCC', code: '123-456', name: '【単品】商品A', stock: 5, avgSales: 2.5, expiryDays: 2, reorderPoint: 70, status: '急ぎ発注' },
            { supplier: 'YCC', code: '123-457', name: '【単品】商品B', stock: 15, avgSales: 1.8, expiryDays: 8, reorderPoint: 39, status: '検討' },
            { supplier: 'YCC', code: '123-458', name: '【単品】商品C', stock: 50, avgSales: 2.0, expiryDays: 25, reorderPoint: 10, status: '余裕' },
            { supplier: 'YCC', code: '123-459', name: '【単品】商品D', stock: 0, avgSales: null, expiryDays: null, reorderPoint: 0, status: '実績なし' },
        ];

        // ステータスを再計算（GASスクリプトのロジックに基づく）
        items.forEach(function(item) {
            const statusInfo = getStatus(item.expiryDays);
            item.status = statusInfo.label;
        });

        updateSummary();
        renderTable();
    }

    /**
     * CSVファイルを読み込み（スプレッドシートからエクスポートしたCSV用）
     * 発注判断シートをCSVとしてエクスポートした場合の読み込み
     */
    function loadCSV(file) {
        const reader = new FileReader();

        reader.onload = function(e) {
            try {
                const text = e.target.result;
                const lines = text.split(/\r?\n/).filter(function(line) {
                    return line.trim().length > 0;
                });

                if (lines.length < 2) {
                    throw new Error('CSVファイルにデータがありません');
                }

                // ヘッダー行をスキップ（1行目）
                const dataLines = lines.slice(1);
                items = [];

                dataLines.forEach(function(line) {
                    // CSVの各セルを解析
                    const cells = [];
                    let current = '';
                    let inQuotes = false;

                    for (let i = 0; i < line.length; i++) {
                        const char = line[i];
                        if (char === '"') {
                            inQuotes = !inQuotes;
                        } else if (char === ',' && !inQuotes) {
                            cells.push(current.trim());
                            current = '';
                        } else {
                            current += char;
                        }
                    }
                    cells.push(current.trim());

                    // GASスクリプトの出力形式: [仕入先, 商品コード, 商品名, 在庫数, 1日平均販売数, 在庫期限(日), 発注目安(数), ステータス]
                    if (cells.length >= 8) {
                        const expiryDays = cells[5] === '実績なし' ? null : (parseFloat(cells[5]) || null);
                        const avgSales = cells[4] === '実績なし' ? null : (parseFloat(cells[4]) || null);
                        
                        const item = {
                            supplier: cells[0] || '',
                            code: cells[1] || '',
                            name: cells[2] || '',
                            stock: parseFloat(cells[3]) || 0,
                            avgSales: avgSales,
                            expiryDays: expiryDays,
                            reorderPoint: parseFloat(cells[6]) || 0,
                            status: cells[7] ? cells[7].replace(/[🔴🟡🟢]/g, '').trim() : ''
                        };

                        // ステータスを再計算（GASスクリプトのロジックに基づく）
                        const statusInfo = getStatus(item.expiryDays);
                        item.status = statusInfo.label;

                        items.push(item);
                    }
                });

                updateSummary();
                renderTable();
            } catch (error) {
                alert('CSVファイルの読み込みに失敗しました: ' + error.message);
                console.error(error);
            }
        };

        reader.onerror = function() {
            alert('ファイルの読み込みに失敗しました');
        };

        reader.readAsText(file, 'UTF-8');
    }

    // フィルターボタンのイベント
    filterButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            setActiveFilter(btn.getAttribute('data-filter'));
        });
    });

    // 仕入先ソートボタンのイベント
    document.getElementById('sortAsc') && document.getElementById('sortAsc').addEventListener('click', function () {
        setSupplierSort('asc');
    });
    document.getElementById('sortDesc') && document.getElementById('sortDesc').addEventListener('click', function () {
        setSupplierSort('desc');
    });

    // 検索入力のイベント
    searchInput.addEventListener('input', onSearch);
    searchInput.addEventListener('search', onSearch);

    // 検索クリアボタンのイベント
    if (searchClear) {
        searchClear.addEventListener('click', clearSearch);
        searchClear.hidden = true;
    }

    // 初期表示: サンプルデータを読み込み
    loadDataFromSpreadsheet();

    // CSVファイル読み込み機能（オプション: スプレッドシートからエクスポートしたCSV用）
    // ファイル選択用のinput要素が存在する場合のみ有効化
    const csvFileInput = document.getElementById('csvFile');
    if (csvFileInput) {
        csvFileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                if (file.name.toLowerCase().endsWith('.csv')) {
                    loadCSV(file);
                } else {
                    alert('CSVファイルを選択してください');
                    csvFileInput.value = '';
                }
            }
        });
    }
})();
