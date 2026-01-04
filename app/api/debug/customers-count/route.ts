import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const admin = await import('firebase-admin');

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        }),
      });
    }

    const db = admin.firestore();

    // 全顧客を取得
    const allCustomers = await db.collection('customers').get();

    // createdBy が 'import-script' の顧客を取得
    const importedCustomers = await db
      .collection('customers')
      .where('createdBy', '==', 'import-script')
      .get();

    // ハ行の顧客を確認
    const haGyouCustomers: any[] = [];

    const dakutenMap: { [key: string]: string } = {
      'ガ': 'カ', 'ギ': 'キ', 'グ': 'ク', 'ゲ': 'ケ', 'ゴ': 'コ',
      'ザ': 'サ', 'ジ': 'シ', 'ズ': 'ス', 'ゼ': 'セ', 'ゾ': 'ソ',
      'ダ': 'タ', 'ヂ': 'チ', 'ヅ': 'ツ', 'デ': 'テ', 'ド': 'ト',
      'バ': 'ハ', 'ビ': 'ヒ', 'ブ': 'フ', 'ベ': 'ヘ', 'ボ': 'ホ',
      'パ': 'ハ', 'ピ': 'ヒ', 'プ': 'フ', 'ペ': 'ヘ', 'ポ': 'ホ',
      'ヴ': 'ウ',
    };

    const getKanaGroup = (kana: string | undefined): string => {
      if (!kana || kana.length === 0) return 'その他';
      const firstChar = kana.charAt(0);
      const seionChar = dakutenMap[firstChar] || firstChar;

      if (seionChar >= 'ハ' && seionChar <= 'ホ') return 'ハ行';
      return '';
    };

    allCustomers.forEach((doc) => {
      const data = doc.data();
      if (getKanaGroup(data.companyNameKana) === 'ハ行') {
        haGyouCustomers.push({
          id: doc.id,
          kana: data.companyNameKana,
          name: data.companyName,
          serviceIds: data.serviceIds || [],
        });
      }
    });

    return NextResponse.json({
      totalCustomers: allCustomers.size,
      importedCustomers: importedCustomers.size,
      haGyouCustomers: haGyouCustomers.length,
      haGyouList: haGyouCustomers.sort((a, b) =>
        a.kana.localeCompare(b.kana, 'ja')
      ),
    });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
