import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();
const auth = getAuth();

/**
 * Get management user info for the caller's housing company
 */
export const getManagementUser = onCall(
  {region: 'europe-west1'},
  async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be logged in');
  }

  // Get user profile to verify role and get housingCompanyId
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) {
    throw new HttpsError('not-found', 'User profile not found');
  }

  const userData = userDoc.data();
  if (userData?.role !== 'housing_company') {
    throw new HttpsError('permission-denied', 'Only housing companies can access this function');
  }

  const housingCompanyId = userData.housingCompanyId;
  if (!housingCompanyId) {
    throw new HttpsError('failed-precondition', 'Housing company ID not found');
  }

  // Query for management user
  const managementQuery = await db
    .collection('users')
    .where('role', '==', 'maintenance')
    .where('housingCompanyId', '==', housingCompanyId)
    .limit(1)
    .get();

  if (managementQuery.empty) {
    return { exists: false };
  }

  const managementDoc = managementQuery.docs[0];
  const managementData = managementDoc.data();

  return {
    exists: true,
    user: {
      id: managementDoc.id,
      firstName: managementData.firstName,
      lastName: managementData.lastName,
      email: managementData.email,
      phone: managementData.phone,
      companyName: managementData.companyName,
    },
  };
});

/**
 * Get service company user info for the caller's housing company
 */
export const getServiceCompanyUser = onCall(
  {region: 'europe-west1'},
  async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be logged in');
  }

  // Get user profile to verify role and get housingCompanyId
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) {
    throw new HttpsError('not-found', 'User profile not found');
  }

  const userData = userDoc.data();
  if (userData?.role !== 'housing_company') {
    throw new HttpsError('permission-denied', 'Only housing companies can access this function');
  }

  const housingCompanyId = userData.housingCompanyId;
  if (!housingCompanyId) {
    throw new HttpsError('failed-precondition', 'Housing company ID not found');
  }

  // Query for service company user
  const serviceCompanyQuery = await db
    .collection('users')
    .where('role', '==', 'service_company')
    .where('housingCompanyId', '==', housingCompanyId)
    .limit(1)
    .get();

  if (serviceCompanyQuery.empty) {
    return { exists: false };
  }

  const serviceCompanyDoc = serviceCompanyQuery.docs[0];
  const serviceCompanyData = serviceCompanyDoc.data();

  return {
    exists: true,
    user: {
      id: serviceCompanyDoc.id,
      firstName: serviceCompanyData.firstName,
      lastName: serviceCompanyData.lastName,
      email: serviceCompanyData.email,
      phone: serviceCompanyData.phone,
      companyName: serviceCompanyData.companyName,
    },
  };
});

/**
 * Remove management user and all related invites
 */
export const removeManagementUser = onCall(
  {region: 'europe-west1'},
  async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be logged in');
  }

  // Get user profile to verify role and get housingCompanyId
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) {
    throw new HttpsError('not-found', 'User profile not found');
  }

  const userData = userDoc.data();
  if (userData?.role !== 'housing_company') {
    throw new HttpsError('permission-denied', 'Only housing companies can remove management users');
  }

  const housingCompanyId = userData.housingCompanyId;
  if (!housingCompanyId) {
    throw new HttpsError('failed-precondition', 'Housing company ID not found');
  }

  // Find management user
  const managementQuery = await db
    .collection('users')
    .where('role', '==', 'maintenance')
    .where('housingCompanyId', '==', housingCompanyId)
    .limit(1)
    .get();

  if (managementQuery.empty) {
    throw new HttpsError('not-found', 'No management user found');
  }

  const managementDoc = managementQuery.docs[0];
  const managementUserId = managementDoc.id;

  // Delete from Firebase Auth
  try {
    await auth.deleteUser(managementUserId);
  } catch (error) {
    console.error('Error deleting management user from Auth:', error);
  }

  // Delete user document
  await db.collection('users').doc(managementUserId).delete();

  // Delete all management invites for this housing company
  const invitesQuery = await db
    .collection('managementInvites')
    .where('housingCompanyId', '==', housingCompanyId)
    .get();

  const batch = db.batch();
  invitesQuery.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  return { ok: true };
});

/**
 * Remove service company user and all related invites
 */
export const removeServiceCompanyUser = onCall(
  {region: 'europe-west1'},
  async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be logged in');
  }

  // Get user profile to verify role and get housingCompanyId
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) {
    throw new HttpsError('not-found', 'User profile not found');
  }

  const userData = userDoc.data();
  if (userData?.role !== 'housing_company') {
    throw new HttpsError('permission-denied', 'Only housing companies can remove service company users');
  }

  const housingCompanyId = userData.housingCompanyId;
  if (!housingCompanyId) {
    throw new HttpsError('failed-precondition', 'Housing company ID not found');
  }

  // Find service company user
  const serviceCompanyQuery = await db
    .collection('users')
    .where('role', '==', 'service_company')
    .where('housingCompanyId', '==', housingCompanyId)
    .limit(1)
    .get();

  if (serviceCompanyQuery.empty) {
    throw new HttpsError('not-found', 'No service company user found');
  }

  const serviceCompanyDoc = serviceCompanyQuery.docs[0];
  const serviceCompanyUserId = serviceCompanyDoc.id;

  // Delete from Firebase Auth
  try {
    await auth.deleteUser(serviceCompanyUserId);
  } catch (error) {
    console.error('Error deleting service company user from Auth:', error);
  }

  // Delete user document
  await db.collection('users').doc(serviceCompanyUserId).delete();

  // Delete all service company invites for this housing company
  const invitesQuery = await db
    .collection('serviceCompanyInvites')
    .where('housingCompanyId', '==', housingCompanyId)
    .get();

  const batch = db.batch();
  invitesQuery.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  return { ok: true };
});
