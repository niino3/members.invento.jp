import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { inquiry, type } = await req.json();
    
    console.log('Email API called with:', { inquiry, type });
    console.log('Resend API Key:', process.env.RESEND_API_KEY ? 'Set (length: ' + process.env.RESEND_API_KEY.length + ')' : 'Not set');
    console.log('Admin Email:', process.env.ADMIN_EMAIL);

    if (!inquiry || !type) {
      return NextResponse.json({ error: 'Inquiry data and type are required' }, { status: 400 });
    }

    // 管理者メールアドレス（環境変数から取得）
    const adminEmailAddress = process.env.ADMIN_EMAIL || 'admin@fortissimo.co.jp';

    if (type === 'new') {
      try {
        console.log('Sending emails with Resend...');
        console.log('Sending to:', {
          customer: inquiry.customerEmail,
          admin: adminEmailAddress
        });

        // 顧客への確認メール
        const customerEmailHtml = `
          <h2>お問い合わせを受け付けました</h2>
          <p>${inquiry.customerName} 様</p>
          <p>お問い合わせいただきありがとうございます。<br>
          以下の内容で承りました。担当者より順次回答させていただきますので、今しばらくお待ちください。</p>
          
          <hr>
          <h3>お問い合わせ内容</h3>
          <p><strong>件名：</strong>${inquiry.subject}</p>
          <p><strong>カテゴリー：</strong>${inquiry.categoryLabel}</p>
          <p><strong>内容：</strong></p>
          <pre style="white-space: pre-wrap;">${inquiry.content}</pre>
          <hr>
          
          <p>このメールは自動送信されています。<br>
          お問い合わせの内容によってはお返事にお時間をいただく場合がございます。</p>
          
          <p>よろしくお願いいたします。</p>
        `;

        // 管理者への通知メール
        const adminEmailHtml = `
          <h2>新規問い合わせがありました</h2>
          
          <h3>顧客情報</h3>
          <p><strong>会社名：</strong>${inquiry.companyName}</p>
          <p><strong>お名前：</strong>${inquiry.customerName}</p>
          <p><strong>メール：</strong>${inquiry.customerEmail}</p>
          
          <h3>問い合わせ内容</h3>
          <p><strong>件名：</strong>${inquiry.subject}</p>
          <p><strong>カテゴリー：</strong>${inquiry.categoryLabel}</p>
          <p><strong>内容：</strong></p>
          <pre style="white-space: pre-wrap;">${inquiry.content}</pre>
          
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/inquiries">管理画面で確認する</a></p>
        `;

        // Resendでメール送信
        console.log('Attempting to send emails...');
        console.log('Customer email:', inquiry.customerEmail);
        console.log('Admin email:', adminEmailAddress);
        
        const [customerEmail, adminEmail] = await Promise.all([
          resend.emails.send({
            from: 'Invento <onboarding@resend.dev>', // テスト用アドレス
            to: inquiry.customerEmail,
            subject: `【お問い合わせ受付完了】${inquiry.subject}`,
            html: customerEmailHtml,
          }),
          resend.emails.send({
            from: 'Invento <onboarding@resend.dev>', // テスト用アドレス
            to: adminEmailAddress,
            subject: `【新規問い合わせ】${inquiry.companyName} - ${inquiry.subject}`,
            html: adminEmailHtml,
          }),
        ]);

        console.log('Resend API Response - Customer Email:', JSON.stringify(customerEmail, null, 2));
        console.log('Resend API Response - Admin Email:', JSON.stringify(adminEmail, null, 2));
        
        // エラーをチェック
        if (customerEmail.error) {
          console.error('Customer email error:', customerEmail.error);
        }
        if (adminEmail.error) {
          console.error('Admin email error:', adminEmail.error);
        }
        
        console.log('Inquiry emails sent successfully:', {
          customerEmailId: customerEmail.data?.id,
          adminEmailId: adminEmail.data?.id,
          customerEmailError: customerEmail.error,
          adminEmailError: adminEmail.error
        });
        
        return NextResponse.json({ success: true, message: 'Emails sent successfully' });
      } catch (mailError) {
        console.error('Email send error:', mailError);
        return NextResponse.json({ 
          error: 'Failed to send email', 
          details: mailError instanceof Error ? mailError.message : 'Unknown error' 
        }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Invalid email type' }, { status: 400 });

  } catch (error) {
    console.error('Error in email API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}