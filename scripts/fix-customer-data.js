// Script to fix missing customer data for test002@fortissimo.co.jp
// Run this with: node scripts/fix-customer-data.js

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json'); // You'll need to add your service account key

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixCustomerData() {
  const customerId = 'CWowNsjU4HfBIfgRUSNNlKBzapm2';
  const email = 'test002@fortissimo.co.jp';
  
  try {
    // Check if customer document already exists
    const customerDoc = await db.collection('customers').doc(customerId).get();
    
    if (customerDoc.exists) {
      console.log('Customer document already exists:', customerDoc.data());
      return;
    }
    
    // Create missing customer document
    const customerData = {
      customerType: 'corporate', // or 'individual'
      companyName: 'テスト会社002', // Adjust as needed
      contactName: 'テスト太郎002', // Adjust as needed
      email: email,
      contractStatus: 'active',
      contractStartDate: new Date(),
      serviceIds: [], // Empty array, can be updated later
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
    
    await db.collection('customers').doc(customerId).set(customerData);
    
    console.log('Customer document created successfully:', customerId);
    console.log('Customer data:', customerData);
    
  } catch (error) {
    console.error('Error fixing customer data:', error);
  }
}

fixCustomerData();