/**
 * 日本時間（JST）関連のユーティリティ関数
 */

/**
 * 現在のJST時刻を取得してISO形式で返す（秒以下切り捨て）
 * @returns YYYY-MM-DDTHH:mm 形式の文字列
 */
export function getCurrentJSTDateTime(): string {
  const now = new Date();
  // JSTでフォーマットしてISO形式に変換
  const jstString = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(now);
  
  return jstString.replace(' ', 'T');
}

/**
 * Date オブジェクトをJST時刻のISO形式に変換
 * @param date 変換したい日時
 * @returns YYYY-MM-DDTHH:mm 形式の文字列
 */
export function dateToJSTString(date: Date): string {
  const jstString = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
  
  return jstString.replace(' ', 'T');
}

/**
 * 日本時間でフォーマットされた日付文字列を返す
 * @param date 表示したい日時
 * @param options Intl.DateTimeFormatOptions（オプション）
 * @returns フォーマットされた日付文字列
 */
export function formatJSTDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  };
  
  return date.toLocaleDateString('ja-JP', options || defaultOptions);
}

/**
 * JST時刻文字列からUTCのDateオブジェクトに変換
 * @param jstString YYYY-MM-DDTHH:mm または YYYY-MM-DD 形式の文字列
 * @returns UTC時刻のDateオブジェクト
 */
export function jstStringToDate(jstString: string): Date {
  if (!jstString || typeof jstString !== 'string') {
    throw new Error('Invalid date string provided');
  }

  // JST時刻として解釈してUTCに変換
  let datePart: string;
  let timePart: string;

  if (jstString.includes('T')) {
    // YYYY-MM-DDTHH:mm 形式
    [datePart, timePart] = jstString.split('T');
  } else {
    // YYYY-MM-DD 形式（時刻は00:00とする）
    datePart = jstString;
    timePart = '00:00';
  }

  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  
  // JSTの時刻として新しいDateオブジェクトを作成
  // JavaScriptのDateコンストラクタは現地時間として解釈するので、
  // UTC時刻として作成してからJSTオフセット（9時間）を引く
  const utcTime = new Date(Date.UTC(year, month - 1, day, hour, minute));
  return new Date(utcTime.getTime() - 9 * 60 * 60 * 1000);
}