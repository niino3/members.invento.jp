import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const { inquiry, type } = await req.json();
    
    console.log('Email API called with:', { inquiry, type });

    if (!inquiry || !type) {
      return NextResponse.json({ error: 'Inquiry data and type are required' }, { status: 400 });
    }

    // 管理者メールアドレス（環境変数から取得）
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@fortissimo.co.jp';

    if (type === 'new') {
      try {
        // SMTP設定（環境変数から取得）
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          },
          tls: {
            rejectUnauthorized: false, // 自己署名証明書を許可
            servername: process.env.SMTP_HOST, // SNI設定
            minDHSize: 1024, // DH鍵の最小サイズを設定
            ciphers: 'DEFAULT@SECLEVEL=0' // 古いサーバーとの互換性を確保
          }
        });

        console.log('Email configuration:', {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          user: process.env.SMTP_USER,
          hasPassword: !!process.env.SMTP_PASSWORD,
          adminEmail: process.env.ADMIN_EMAIL,
        });

        // 顧客への確認メール
        const customerMailOptions = {
          from: process.env.FROM_EMAIL || 'noreply@fortissimo.co.jp',
          to: inquiry.customerEmail,
          subject: `【お問い合わせ受付完了】${inquiry.subject}`,
          html: `
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
          `,
        };

        // 管理者への通知メール
        const adminMailOptions = {
          from: process.env.FROM_EMAIL || 'noreply@fortissimo.co.jp',
          to: adminEmail,
          subject: `【新規問い合わせ】${inquiry.companyName} - ${inquiry.subject}`,
          html: `
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
          `,
        };

        // メール送信
        await Promise.all([
          transporter.sendMail(customerMailOptions),
          transporter.sendMail(adminMailOptions),
        ]);

        console.log('Inquiry emails sent successfully');
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