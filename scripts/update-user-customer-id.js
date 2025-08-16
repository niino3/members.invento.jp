// Script to update user's customerId in Firestore
// Run this with: node scripts/update-user-customer-id.js

const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function updateUserCustomerId() {
  const email = 'test002@fortissimo.co.jp';
  const newCustomerId = 'N9gHGf6PholoTVafR5fM';
  
  try {
    // Find user document by email
    const usersQuery = await db.collection('users')
      .where('email', '==', email)
      .get();
    
    if (usersQuery.empty) {
      console.log('No user found with email:', email);
      return;
    }
    
    // Update the user's customerId
    const userDoc = usersQuery.docs[0];
    await userDoc.ref.update({
      customerId: newCustomerId,
      updatedAt: new Date()
    });
    
    console.log('Successfully updated user customerId:');
    console.log('Email:', email);
    console.log('New customerId:', newCustomerId);
    console.log('User document ID:', userDoc.id);
    
  } catch (error) {
    console.error('Error updating user customerId:', error);
  }
}

updateUserCustomerId();