import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
  try {
    const { email, customerId } = await req.json();

    if (!email || !customerId) {
      return NextResponse.json({ error: 'Email and customerId are required' }, { status: 400 });
    }

    // Find user document by email
    const usersQuery = await adminDb.collection('users')
      .where('email', '==', email)
      .get();

    if (usersQuery.empty) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update the user's customerId
    const userDoc = usersQuery.docs[0];
    await userDoc.ref.update({
      customerId: customerId,
      updatedAt: new Date()
    });

    console.log('Successfully updated user customerId:', {
      email,
      customerId,
      userDocId: userDoc.id
    });

    return NextResponse.json({ 
      success: true, 
      message: 'User customerId updated successfully',
      userDocId: userDoc.id
    });

  } catch (error) {
    console.error('Error updating user customerId:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}