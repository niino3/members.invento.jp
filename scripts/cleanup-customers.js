const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// ひらがなをカタカナに変換
function hiraganaToKatakana(str) {
  return str.replace(/[\u3041-\u3096]/g, (match) => {
    const chr = match.charCodeAt(0) + 0x60;
    return String.fromCharCode(chr);
  });
}

// 濁音・半濁音を清音に変換
function removeDakuten(str) {
  const dakutenMap = {
    'ガ': 'カ', 'ギ': 'キ', 'グ': 'ク', 'ゲ': 'ケ', 'ゴ': 'コ',
    'ザ': 'サ', 'ジ': 'シ', 'ズ': 'ス', 'ゼ': 'セ', 'ゾ': 'ソ',
    'ダ': 'タ', 'ヂ': 'チ', 'ヅ': 'ツ', 'デ': 'テ', 'ド': 'ト',
    'バ': 'ハ', 'ビ': 'ヒ', 'ブ': 'フ', 'ベ': 'ヘ', 'ボ': 'ホ',
    'パ': 'ハ', 'ピ': 'ヒ', 'プ': 'フ', 'ペ': 'ヘ', 'ポ': 'ホ',
    'ヴ': 'ウ',
  };

  return str.split('').map(char => dakutenMap[char] || char).join('');
}

// カタカナの最初の文字から行を判定
function getKanaGroup(kana) {
  if (!kana || kana.length === 0) return 'その他';

  // カタカナに変換
  const katakana = hiraganaToKatakana(kana);
  const firstChar = katakana.charAt(0);

  // カナ行の判定
  if (firstChar >= 'ア' && firstChar <= 'オ') return 'ア';
  if (firstChar >= 'カ' && firstChar <= 'コ') return 'カ';
  if (firstChar >= 'サ' && firstChar <= 'ソ') return 'サ';
  if (firstChar >= 'タ' && firstChar <= 'ト') return 'タ';
  if (firstChar >= 'ナ' && firstChar <= 'ノ') return 'ナ';
  if (firstChar >= 'ハ' && firstChar <= 'ホ') return 'ハ';
  if (firstChar >= 'マ' && firstChar <= 'モ') return 'マ';
  if (firstChar >= 'ヤ' && firstChar <= 'ヨ') return 'ヤ';
  if (firstChar >= 'ラ' && firstChar <= 'ロ') return 'ラ';
  if (firstChar >= 'ワ' && firstChar <= 'ン') return 'ワ';

  // 英数字
  if ((firstChar >= 'a' && firstChar <= 'z') ||
      (firstChar >= 'A' && firstChar <= 'Z') ||
      (firstChar >= 'ａ' && firstChar <= 'ｚ') ||
      (firstChar >= 'Ａ' && firstChar <= 'Ｚ') ||
      (firstChar >= '0' && firstChar <= '9') ||
      (firstChar >= '０' && firstChar <= '９')) {
    return '英';
  }

  return 'その他';
}

// CSVファイルを読み込み
const csvPath = path.join(__dirname, '..', 'customers.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// CSVをパース
const records = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
});

console.log(`読み込んだレコード数: ${records.length}`);

// データを整理
const customers = {};

for (const record of records) {
  const kana = record['よみがな'];
  const companyName = record['会社名'];
  const personName = record['氏名'];

  // 会社名が空の場合はスキップ
  if (!companyName || companyName.trim() === '') {
    continue;
  }

  // 会社名をキーにして重複を除く（後のエントリで上書き）
  const companyKey = companyName.trim();

  // よみがなをカタカナに変換
  const kanaKatakana = hiraganaToKatakana(kana || '');

  customers[companyKey] = {
    kana: kanaKatakana || getKanaGroup(companyKey),
    companyName: companyKey,
    personName: personName ? personName.trim() : '',
  };
}

console.log(`ユニークな会社数: ${Object.keys(customers).length}`);

// カナでソート
const sortedCustomers = Object.values(customers).sort((a, b) => {
  // まずカナでソート
  const kanaCompare = a.kana.localeCompare(b.kana, 'ja');
  if (kanaCompare !== 0) return kanaCompare;

  // カナが同じ場合は会社名でソート
  return a.companyName.localeCompare(b.companyName, 'ja');
});

// CSVファイルに書き出し
const outputPath = path.join(__dirname, '..', 'customers-cleaned.csv');
const csvLines = ['よみがな,会社名,氏名'];

for (const customer of sortedCustomers) {
  // CSVエスケープ処理（カンマや改行を含む場合はダブルクォートで囲む）
  const escapeCsvField = (field) => {
    if (!field) return '';
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  };

  csvLines.push(
    `${escapeCsvField(customer.kana)},${escapeCsvField(customer.companyName)},${escapeCsvField(customer.personName)}`
  );
}

fs.writeFileSync(outputPath, csvLines.join('\n'), 'utf-8');

console.log(`整理済みCSVを作成しました: ${outputPath}`);
console.log('処理完了');
