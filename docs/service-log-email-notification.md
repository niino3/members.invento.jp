# サービスログ登録時のメール通知機能

## 概要

顧客管理画面で顧客ごとに「サービスログ登録時のメール通知」のON/OFFを設定可能にし、ONの場合はサービスログ登録時に顧客にメール通知を送信する機能。

調査日: 2025-12-18

## 機能要件

### 基本要件
- 顧客管理画面で顧客ごとに「サービスログ登録時のメール通知」のON/OFFを設定可能にする
- ONの場合、サービスログ登録時に顧客にメール通知を送る
- 対象は「ログ記録が有効なサービス」を利用している顧客のみ

### 制約事項
- サービスログ新規登録時のみメール送信（編集時は送信しない）
- メール送信失敗時もサービスログ作成は成功させる
- 顧客にメールアドレスが設定されている必要がある

## 影響範囲と実装内容

### 1. 型定義の追加

**ファイル**: `types/customer.ts`

```typescript
export interface Customer {
  // ... 既存フィールド
  sendServiceLogEmail?: boolean; // サービスログ登録時のメール通知
}

export interface CreateCustomerInput {
  // ... 既存フィールド
  sendServiceLogEmail?: boolean;
}

export interface UpdateCustomerInput extends Partial<CreateCustomerInput> {
  id: string;
}
```

### 2. 顧客データ変換の修正

**ファイル**: `lib/firebase/customers.ts`

#### 修正箇所

1. **convertToCustomer関数**
   - 新フィールド `sendServiceLogEmail` の読み込み追加
   ```typescript
   sendServiceLogEmail: data.sendServiceLogEmail || false,
   ```

2. **createCustomer関数**
   - 新フィールドの保存対応（既存の実装で自動的に対応）

3. **updateCustomer関数**
   - 新フィールドの更新対応（既存の実装で自動的に対応）

### 3. 顧客フォームの修正

**ファイル**: `components/CustomerForm.tsx`

#### 修正内容

1. **formDataステートに新フィールド追加** (行26付近)
   ```typescript
   const [formData, setFormData] = useState({
     // ... 既存フィールド
     sendServiceLogEmail: customer?.sendServiceLogEmail || false,
   });
   ```

2. **UIに新しいセクション追加** (「サービス選択」セクションの後、行565付近)
   ```tsx
   {/* サービスログ通知設定 */}
   <div className="bg-white shadow rounded-lg p-6">
     <h3 className="text-lg font-medium text-gray-900 mb-4">サービスログ通知設定</h3>
     <div className="space-y-3">
       <div className="flex items-center">
         <input
           type="checkbox"
           name="sendServiceLogEmail"
           checked={formData.sendServiceLogEmail}
           onChange={handleInputChange}
           disabled={!hasLogEnabledService}
           className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
         />
         <label className="ml-2 block text-sm text-gray-700">
           サービスログ登録時にメール通知を送信する
         </label>
       </div>
       <p className="text-sm text-gray-500">
         ONの場合、サービスログが登録されたときに自動的にメールで通知されます。
         {!hasLogEnabledService && '（ログ記録が有効なサービスを選択している場合のみ有効）'}
         {!formData.email && '（メールアドレスの設定が必要です）'}
       </p>
     </div>
   </div>
   ```

3. **ログ記録有効サービスの判定ロジック追加**
   ```typescript
   const hasLogEnabledService = formData.serviceIds.some(serviceId => {
     const service = services.find(s => s.id === serviceId);
     return service?.logEnabled === true;
   });
   ```

### 4. メール送信API作成

**ファイル**: `app/api/send-service-log-email/route.ts` (新規作成)

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { serviceLog, customer, service, workerName } = await req.json();

    // バリデーション
    if (!serviceLog || !customer || !service) {
      return NextResponse.json(
        { error: 'Required data is missing' },
        { status: 400 }
      );
    }

    // 顧客のメール通知設定を確認
    if (!customer.sendServiceLogEmail) {
      return NextResponse.json({
        success: true,
        message: 'Email notification is disabled for this customer'
      });
    }

    // メールアドレスを確認
    if (!customer.email) {
      return NextResponse.json({
        success: true,
        message: 'Customer email is not set'
      });
    }

    // Resendを動的インポート
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    // 作業日時のフォーマット
    const workDate = new Date(serviceLog.workDate);
    const formattedDate = workDate.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Tokyo'
    });

    // 郵送料情報（あれば）
    let shippingInfo = '';
    if (serviceLog.shippingCost) {
      shippingInfo = `■ 郵送料: ${serviceLog.shippingCost.name} - ¥${serviceLog.shippingCost.price.toLocaleString('ja-JP')}\n`;
    }

    // メール本文
    const emailHtml = `
      <h2>サービスログが登録されました</h2>
      <p>${customer.companyName} 様</p>
      <p>いつもご利用ありがとうございます。<br>
      以下の作業記録が登録されましたのでお知らせします。</p>

      <hr style="margin: 20px 0;">
      <h3>作業記録</h3>
      <p><strong>作業日時:</strong> ${formattedDate}</p>
      <p><strong>サービス名:</strong> ${service.name}</p>
      <p><strong>作業者:</strong> ${workerName}</p>
      <p><strong>画像:</strong> ${serviceLog.images?.length || 0}枚</p>
      ${shippingInfo ? `<p><strong>郵送料:</strong> ${serviceLog.shippingCost.name} - ¥${serviceLog.shippingCost.price.toLocaleString('ja-JP')}</p>` : ''}

      ${serviceLog.comment ? `
        <p><strong>作業内容:</strong></p>
        <pre style="white-space: pre-wrap; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">${serviceLog.comment}</pre>
      ` : ''}
      <hr style="margin: 20px 0;">

      <p>詳細は以下のURLよりご確認ください:<br>
      <a href="https://members.invento.jp/dashboard/service-logs">https://members.invento.jp/dashboard/service-logs</a></p>

      <p style="color: #666; font-size: 12px;">
      このメールは自動送信されています。<br>
      お問い合わせは管理者までご連絡ください。
      </p>
    `;

    // メール送信
    const result = await resend.emails.send({
      from: 'info@coworking.invento.jp',
      to: customer.email,
      subject: `【サービスログ記録】${service.name}の作業記録が登録されました`,
      html: emailHtml,
    });

    if (result.error) {
      console.error('Email send error:', result.error);
      return NextResponse.json({
        error: 'Failed to send email',
        details: result.error
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      emailId: result.data?.id
    });

  } catch (error) {
    console.error('Error in send-service-log-email API:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
```

### 5. サービスログ作成処理にメール送信を統合

**ファイル**: `lib/firebase/serviceLogs.ts`

#### 修正箇所: createServiceLog関数 (行119-182)

```typescript
export async function createServiceLog(
  input: CreateServiceLogInput,
  workerId: string,
  workerName: string
): Promise<string> {
  try {
    const now = new Date();
    const serviceLogData: ServiceLogFirestore = {
      serviceId: input.serviceId,
      customerId: input.customerId,
      workDate: Timestamp.fromDate(input.workDate),
      workerId,
      workerName,
      comment: input.comment,
      images: [],
      status: input.status,
      shippingCostId: input.shippingCostId,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), serviceLogData);

    // 画像がある場合はアップロード
    if (input.images && input.images.length > 0) {
      const uploadedImages: ServiceLogImage[] = [];

      for (const file of input.images) {
        const imageId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const uploadedImage = await uploadServiceLogImage(docRef.id, file, imageId);
        uploadedImages.push(uploadedImage);
      }

      await updateDoc(docRef, {
        images: uploadedImages.map(img => ({
          ...img,
          uploadedAt: Timestamp.fromDate(img.uploadedAt),
        })),
        updatedAt: serverTimestamp(),
      });
    }

    // 活動を記録
    if (input.customerId) {
      const customer = await getCustomer(input.customerId);
      if (customer) {
        await logActivity(
          'service_log_created',
          docRef.id,
          customer.companyName,
          workerId,
          workerName
        );

        // メール通知送信（追加部分）
        try {
          // サービス情報を取得
          const { getServices } = await import('./services');
          const services = await getServices();
          const service = services.find(s => s.id === input.serviceId);

          // 郵送料情報を取得（あれば）
          let shippingCost = null;
          if (input.shippingCostId) {
            const { getShippingCost } = await import('./shippingCosts');
            shippingCost = await getShippingCost(input.shippingCostId);
          }

          // メール送信APIを呼び出し
          const response = await fetch('/api/send-service-log-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              serviceLog: {
                id: docRef.id,
                workDate: input.workDate.toISOString(),
                comment: input.comment,
                images: input.images || [],
                shippingCost,
              },
              customer: {
                companyName: customer.companyName,
                email: customer.email,
                sendServiceLogEmail: customer.sendServiceLogEmail,
              },
              service: service ? { name: service.name } : null,
              workerName,
            }),
          });

          const result = await response.json();
          if (!response.ok) {
            console.warn('Service log email notification failed:', result.error);
          } else {
            console.log('Service log email notification sent:', result.emailId);
          }
        } catch (emailError) {
          // メール送信失敗はログのみ記録し、サービスログ作成は成功させる
          console.error('Failed to send service log email notification:', emailError);
        }
      }
    }

    return docRef.id;
  } catch (error) {
    console.error('Error creating service log:', error);
    throw new Error('サービスログの作成に失敗しました');
  }
}
```

### 6. Firestoreセキュリティルールの確認

**ファイル**: `firestore.rules`

新フィールドに対する特別なルールは不要。既存のcustomers権限で対応可能。

```javascript
// 顧客ドキュメント（既存のまま）
match /customers/{customerId} {
  allow read, write: if request.auth != null && isAdmin();
  allow read: if request.auth != null && isOwner(customerId);
}
```

## データベース影響

- **既存データへの影響**: なし（新フィールドはオプショナル）
- **マイグレーション**: 不要（既存顧客は`undefined`として扱われ、メール送信されない）
- **インデックス**: 不要

## メール仕様

### 送信タイミング
- サービスログ新規登録時のみ
- 編集時は送信しない（将来的に追加可能）

### 送信条件
1. 顧客の`sendServiceLogEmail`が`true`
2. 顧客の`email`が設定されている
3. サービスログが正常に作成された

### メール内容

**件名**: `【サービスログ記録】{サービス名}の作業記録が登録されました`

**送信元**: `info@coworking.invento.jp`

**本文構成**:
- 挨拶
- 作業日時
- サービス名
- 作業者名
- 画像枚数
- 郵送料（設定されている場合）
- 作業内容（コメント）
- 詳細確認用URL
- 自動送信の注記

## 実装の順序

1. ✅ 型定義の追加（`types/customer.ts`）
2. ✅ Firebaseデータ層の修正（`lib/firebase/customers.ts`）
3. ✅ 顧客フォームUIの追加（`components/CustomerForm.tsx`）
4. ✅ メール送信API作成（`app/api/send-service-log-email/route.ts`）
5. ✅ サービスログ作成処理にメール送信を統合（`lib/firebase/serviceLogs.ts`）
6. ⬜ テスト

## 注意点

### 1. エラーハンドリング
- **メール送信失敗時の挙動**: サービスログ作成は成功させ、エラーはログに記録のみ
- ユーザーにはメール送信失敗を通知しない（サービスログ作成成功を優先）

### 2. バリデーション
- チェックボックスONの場合、メールアドレスが入力されているか確認（推奨）
- ログ記録が有効なサービスを選択している場合のみチェックボックスを有効化

### 3. 環境変数
- `RESEND_API_KEY`: 既に設定済み
- `ADMIN_EMAIL`: 既に設定済み（将来的なBCC用）

### 4. Resendドメイン認証
- `info@coworking.invento.jp`が既に認証済みの前提
- 未認証の場合は事前にResendで認証作業が必要

## 追加で検討すべき項目

### 優先度: 低
- サービスログ編集時のメール送信の有無
- 管理者へのBCC送信の有無
- メールテンプレートのカスタマイズ性
- メール送信履歴の記録（Firestoreに別コレクション）

### 優先度: 中
- メール内の画像プレビュー表示（Firebase Storageの画像URLを埋め込み）
- メール本文のテンプレート管理（データベースで管理）

### 優先度: 高（実装前に確認）
- メール送信回数の制限（スパム防止）
- Resendの送信制限確認（プランによる制限）

## テスト計画

### 1. 単体テスト
- [ ] 顧客作成時に`sendServiceLogEmail`フィールドが正しく保存される
- [ ] 顧客更新時に`sendServiceLogEmail`フィールドが正しく更新される
- [ ] メール送信APIが正しいデータで呼び出される

### 2. 統合テスト
- [ ] サービスログ登録時にメール送信APIが呼び出される
- [ ] `sendServiceLogEmail=false`の場合はメールが送信されない
- [ ] メールアドレスが設定されていない場合はメールが送信されない
- [ ] メール送信失敗時もサービスログ作成は成功する

### 3. E2Eテスト
- [ ] 顧客管理画面でチェックボックスが表示される
- [ ] チェックボックスの状態が保存される
- [ ] サービスログ登録後に実際にメールが届く

## 参考資料

- 既存のメール送信実装: `app/api/send-inquiry-email/route.ts`
- Resend SDK ドキュメント: https://resend.com/docs
- Firebase Admin SDK: https://firebase.google.com/docs/admin/setup

## 更新履歴

- 2025-12-18: 初版作成（調査完了）
