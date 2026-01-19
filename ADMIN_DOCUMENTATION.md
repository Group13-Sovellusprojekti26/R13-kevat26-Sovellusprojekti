# Admin Functionality Documentation

## Overview

This document describes the Admin features in the TaloFix project. Admins can create housing companies and generate invite codes that allow property managers, maintenance staff, and residents to join a housing company and register a user profile.

## Hierarchy

```
Admin (top-level)
   └── Housing Company
         ├── Property Manager
         ├── Maintenance
         └── Resident
```

- **Admin**: Can create housing companies and generate invite codes.
- **Housing Company**: Unit created and owned by an `admin`.
- **Property Manager / Maintenance / Resident**: Join a housing company using an invite code.

## Architecture

The project follows an MVVM structure. Relevant folders:

```
src/features/admin/
   ├── views/              # UI screens (AdminDashboardScreen, CreateCompanyScreen, CompanyDetailsScreen)
   ├── viewmodels/         # Zustand ViewModels (useAdminVM.ts)
   └── repositories/services as needed

src/data/repositories/
   └── housingCompanies.repo.ts  # Repository for Firestore + Cloud Functions
```

### Firebase Rules + Cloud Functions

The codebase uses a hybrid approach:
- Firestore Security Rules enforce read access and data scoping.
- Cloud Functions handle privileged operations and role validation.

Key Cloud Functions (see `functions/src/index.ts`):
- `createHousingCompany` — create a housing company (admin only)
- `generateInviteCode` — generate an 8-character invite code (admin only)
- `validateInviteCode` — validate an invite code and return housing company data

Security Rules summary:
- Admins can read housing companies they created.
- Users can read data scoped to their `housingCompanyId`.
- Create/update/delete privileged operations are performed via Cloud Functions.

## Deployment

Build and deploy Cloud Functions:

```bash
cd functions
npm run build
firebase deploy --only functions
```

Deploy Firestore security rules:

```bash
firebase deploy --only firestore:rules
```

## Creating the initial Admin user

Create an admin user in Firebase Authentication and add the corresponding Firestore profile at `users/{uid}`. Example document:

```json
{
   "email": "admin@example.com",
   "firstName": "Admin",
   "lastName": "User",
   "role": "admin",
   "buildingId": "",
   "housingCompanyId": "",
   "createdAt": "2026-01-15T12:00:00Z",
   "updatedAt": "2026-01-15T12:00:00Z"
}
```

Note: `admin` users do not need a `buildingId` or `housingCompanyId`.

## Admin workflow

1. Sign in with an `admin` account — the app detects role and opens the Admin dashboard.
2. Create a housing company via `CreateCompanyScreen` (name, address, city, postal code).
3. Generate an invite code for the company using the Admin dashboard. Invite codes are 8 characters and expire in 7 days.
4. Share the invite code with property managers, maintenance staff, or residents.

## Staff / Resident workflow (join via invite code)

1. Receive an 8-character invite code from the Admin.
2. In the app, go to the invite/registration flow (`InviteCodeScreen` / `RegisterWithInviteScreen`).
3. Validate the invite code. The client calls `validateInviteCode` (Cloud Function) which returns the housing company data.
4. Register an account; the user profile is created and scoped to the returned `housingCompanyId`.
5. After registration/login, the app routes the user to the correct stack based on their role.

## Database structure

### `housingCompanies/{companyId}`

```ts
{
   id: string;
   name: string;
   address: string;
   city: string;
   postalCode: string;
   createdByAdminId: string;  // Admin who created the housing company
   isActive: boolean;
   isRegistered: boolean;     // True after someone completes registration for this company
   email?: string;            // (optional) housing company's login email
   userId?: string;           // (optional) reference to users/{uid}
   contactPerson?: string;    // (optional)
   phone?: string;            // (optional)
   inviteCode?: string;       // 8-character invite code
   inviteCodeExpiresAt?: Date;
   createdAt: Date;
   updatedAt: Date;
# Admin Functionality Documentation

## Overview

This document describes the Admin features in the TaloFix project. Admins can create housing companies and generate invite codes that allow property managers, maintenance staff, and residents to join a housing company and register a user profile.

## Hierarchy

```
Admin (top-level)
   └── Housing Company
         ├── Property Manager
         ├── Maintenance
         └── Resident
```

- **Admin**: Can create housing companies and generate invite codes.
- **Housing Company**: Unit created and owned by an `admin`.
- **Property Manager / Maintenance / Resident**: Join a housing company using an invite code.

## Architecture

The project follows an MVVM structure. Relevant folders:

```
src/features/admin/
   ├── views/              # UI screens (AdminDashboardScreen, CreateCompanyScreen, CompanyDetailsScreen)
   ├── viewmodels/         # Zustand ViewModels (useAdminVM.ts)
   └── repositories/services as needed

src/data/repositories/
   └── housingCompanies.repo.ts  # Repository for Firestore + Cloud Functions
```

### Firebase Rules + Cloud Functions

The codebase uses a hybrid approach:
- Firestore Security Rules enforce read access and data scoping.
- Cloud Functions handle privileged operations and role validation.

Key Cloud Functions (see `functions/src/index.ts`):
- `createHousingCompany` — create a housing company (admin only)
- `generateInviteCode` — generate an 8-character invite code (admin only)
- `validateInviteCode` — validate an invite code and return housing company data

Security Rules summary:
- Admins can read housing companies they created.
- Users can read data scoped to their `housingCompanyId`.
- Create/update/delete privileged operations are performed via Cloud Functions.

## Deployment

Build and deploy Cloud Functions:

```bash
cd functions
npm run build
firebase deploy --only functions
```

Deploy Firestore security rules:

```bash
firebase deploy --only firestore:rules
```

## Creating the initial Admin user

Create an admin user in Firebase Authentication and add the corresponding Firestore profile at `users/{uid}`. Example document:

```json
{
   "email": "admin@example.com",
   "firstName": "Admin",
   "lastName": "User",
   "role": "admin",
   "buildingId": "",
   "housingCompanyId": "",
   "createdAt": "2026-01-15T12:00:00Z",
   "updatedAt": "2026-01-15T12:00:00Z"
}
```

Note: `admin` users do not need a `buildingId` or `housingCompanyId`.

## Admin workflow

1. Sign in with an `admin` account — the app detects role and opens the Admin dashboard.
2. Create a housing company via `CreateCompanyScreen` (name, address, city, postal code).
3. Generate an invite code for the company using the Admin dashboard. Invite codes are 8 characters and expire in 7 days.
4. Share the invite code with property managers, maintenance staff, or residents.

## Staff / Resident workflow (join via invite code)

1. Receive an 8-character invite code from the Admin.
2. In the app, go to the invite/registration flow (`InviteCodeScreen` / `RegisterWithInviteScreen`).
3. Validate the invite code. The client calls `validateInviteCode` (Cloud Function) which returns the housing company data.
4. Register an account; the user profile is created and scoped to the returned `housingCompanyId`.
5. After registration/login, the app routes the user to the correct stack based on their role.

## Database structure

### `housingCompanies/{companyId}`

```ts
{
   id: string;
   name: string;
   address: string;
   city: string;
   postalCode: string;
   createdByAdminId: string;  // Admin who created the housing company
   isActive: boolean;
   isRegistered: boolean;     // True after someone completes registration for this company
   email?: string;            // (optional) housing company's login email
   userId?: string;           // (optional) reference to users/{uid}
   contactPerson?: string;    // (optional)
   phone?: string;            // (optional)
   inviteCode?: string;       // 8-character invite code
   inviteCodeExpiresAt?: Date;
   createdAt: Date;
   updatedAt: Date;
}
```

### `users/{userId}`

```ts
{
   id: string;
   email: string;
   firstName: string;
   lastName: string;
   role: 'admin' | 'property_manager' | 'maintenance' | 'resident';
   housingCompanyId: string;  // Reference to housing company
   buildingId: string;
   apartmentNumber?: string;
   phone?: string;
   photoUrl?: string;
   createdAt: Date;
   updatedAt: Date;
}
```

## Known issues & troubleshooting

"Permission denied" errors:
- Verify the user has the correct `role` in Firestore (e.g. `admin`).
- Ensure Firestore security rules have been deployed:

```bash
firebase deploy --only firestore:rules
```

"Invalid invite code" errors:
- Invite code expired (> 7 days)
- Housing company has been deactivated (`isActive: false`)
- Invite code typed incorrectly

Admin dashboard not visible:
- Ensure `RootNavigator.tsx` fetches the user profile and routes by `role`.
- Confirm the Firestore `users/{uid}` document has `role: 'admin'`.

## Summary

Admin features follow the project's MVVM architecture and the Security Rules + Cloud Functions hybrid approach:

- Security Rules: primary protection for read operations and data scoping
- Cloud Functions: privileged operations that require server-side role checks
- Repositories: the only layer that uses the Firebase SDK
- ViewModels: Zustand-based state + loading/error handling
- Views: UI only, no direct Firebase access

This setup keeps privileged logic server-side while allowing efficient client reads under Firestore rules.
