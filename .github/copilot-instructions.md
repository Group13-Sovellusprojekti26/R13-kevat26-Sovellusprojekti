# Copilot Instructions – TaloFix

You are working in a React Native + Expo + TypeScript project called TaloFix.

## Project Overview
TaloFix is a mobile application for housing companies.
Residents submit fault reports with images.
Board and property management publish announcements.
Maintenance handles fault resolution.

Backend: Firebase (Auth, Firestore, Storage).
Architecture: MVVM.

Account roles and hierarchy:
- **Admin**: top-level operator (app administrators). Can manage housing companies and global settings.
- **Housing Company**: primary customer account that represents a housing company. Each housing company may have the following linked partner accounts:
  - **Resident**: regular users who report faults and receive announcements.
  - **Property Manager / Maintenance (isännöinti)**: partner account responsible for managing repair requests and administrative tasks for the housing company.
  - **Service Company (huolto)**: partner account responsible for on-site maintenance work and service operations.

Relationship: Admin -> Housing Company -> (Resident, Property Manager, Service Company).

Developer rule: comment code always in English.

## Tech Stack
- React Native with Expo (managed workflow)
- TypeScript (strict)
- UI: react-native-paper (Material Design 3)
- Navigation: @react-navigation/native (stack + bottom tabs)
- State management: zustand (used in ViewModels only)
- Forms: react-hook-form + zod
- Localization: i18next + react-i18next (fi/en)
- Backend: Firebase Web SDK (v9+ modular)

## Architecture Rules (IMPORTANT)
- UI (views) must not call Firebase directly.
- UI → ViewModel → Repository → Firebase / Cloud Functions.
- Each screen has its own ViewModel.
- ViewModels handle state, loading, and errors.
- Repositories are the ONLY layer that accesses Firebase SDK or Cloud Functions.
- No business logic in UI components.

## Folder Structure
Use and respect this structure:
- src/app: navigation, providers, theme, i18n
- src/features: feature-based folders with views, viewmodels, services
- src/data: firebase init, repositories, models
- src/shared: reusable UI components and utilities
- functions/: Firebase Cloud Functions (separate package.json)

## File Naming Conventions
- Components: PascalCase (LoginScreen.tsx, TFButton.tsx)
- ViewModels: camelCase with "use" prefix (useLoginVM.ts)
- Services: camelCase with ".service" suffix (auth.service.ts)
- Repositories: camelCase with ".repo" suffix (faultReports.repo.ts)
- Models: PascalCase (FaultReport.ts, UserProfile.ts)
- Types: camelCase with ".types" suffix (auth.types.ts)

## New Feature Creation
When adding new features, ALWAYS follow this structure:

src/features/feature-name/
  ├── views/ # UI components
  ├── viewmodels/ # Zustand ViewModels
  ├── services/ # Optional domain logic (NO Firebase calls)
  └── types/ # TypeScript types

## Firebase Rules
- Use Firebase Web SDK only.
- Do NOT use firebase/analytics.
- Firebase configuration must come from environment variables.
- No hardcoded Firebase keys in source code.
- Repositories handle Firestore (direct access), Auth, Storage, and httpsCallable (Cloud Functions).
- **Security Rules + Cloud Functions hybrid approach:**
  - Simple read/write operations → direct Firestore + Security Rules
  - Privileged operations (admin/maintenance only) → Cloud Functions
  - Security Rules provide the first layer of defense
  - Cloud Functions handle complex business logic and role-based operations

## User and Role Model
- Each user has a Firestore profile at users/{uid}.
- UserProfile contains:
  - role (resident | admin | maintenance)
  - housingCompanyId
- All data access must be scoped by housingCompanyId.
- Navigation and permissions are role-based.

## Localization Rules
- No hardcoded UI strings.
- Always use i18n keys via t("...").
- Finnish and English must be supported.
- New UI text requires adding keys to both fi.json and en.json.

## Code Style
- TypeScript only.
- Functional components and hooks only.
- No em dashes in strings.
- Comments must be in English.
- Keep code clean, minimal, and compile-safe.
- Use shared components (Screen, TFButton, TFTextField) instead of creating duplicates.
- Follow existing patterns in the codebase.

## Import Rules
- Prefer path alias imports (e.g. "@/shared/components") for project code.
- Use relative imports only within the same feature folder.
- Avoid deep ../../../ paths.
- Do not create duplicate components if similar ones exist in shared/.
- Do not use deprecated React Native Paper components (e.g. Title).
- Avoid modifying firebase.ts unless necessary; keep changes minimal and consistent.

## Shared Code Rule (IMPORTANT)
- Any component, hook, or utility used in more than one place MUST be placed in src/shared.
- Feature folders must not duplicate shared logic.
- If a piece of code is reused, move it to shared immediately.
- Shared components must be generic and not feature-specific.

## Firebase Cloud Functions Usage (IMPORTANT)

TaloFix uses a **Security Rules + Cloud Functions hybrid approach** for optimal performance and security.

### When to use Security Rules (Direct Firestore Access)
Use direct Firestore operations in repositories when:
- Simple read operations (get fault reports, announcements, user profile)
- Simple create operations that don't require role checks (create fault report)
- Operations where Security Rules can fully enforce permissions and data integrity
- No sensitive business logic or third-party integrations needed

### When to use Cloud Functions
Use Cloud Functions via httpsCallable when:
- **Role-based operations:** Status updates requiring admin/maintenance roles
- **Privileged operations:** Publishing/deleting announcements (admin only)
- **Complex business logic:** Multi-document transactions, data aggregation
- **Third-party integrations:** Payment processing, email sending, external APIs
- **Background processing:** Image processing, batch operations, scheduled tasks

**Example:** `updateFaultReportStatus` is a Function because only admin/maintenance can change status.

### Implementation Pattern

Repositories combine both approaches:
```typescript
// Direct Firestore for simple reads
export async function getFaultReportsByUser(): Promise<FaultReport[]> {
  const q = query(
    collection(db, 'faultReports'),
    where('createdBy', '==', user.uid),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => mapFaultReport(doc.id, doc.data()));
}

// Cloud Function for privileged operations
export async function updateFaultReportStatus(id: string, status: string): Promise<void> {
  const fn = httpsCallable(functions, 'updateFaultReportStatus');
  await fn({ faultReportId: id, status });
}
```

### Security Rules Structure
All Firestore collections have Security Rules defined in `firestore.rules`:
- `faultReports`: Read (authenticated + housingCompanyId match), Create (authenticated), Update/Delete (Functions only)
- `announcements`: Read (authenticated + housingCompanyId match), Create/Update/Delete (Functions only)
- `users`: Read (own profile), Create (Functions only), Update (own profile, limited fields), Delete (Functions only)

### Critical Rules
- UI components and ViewModels must NEVER access Firebase directly
- Repositories are the ONLY layer that accesses Firestore or calls Cloud Functions
- Security Rules must be deployed alongside Functions for proper security
- All privileged operations MUST go through Cloud Functions for role validation

If a requested change bypasses these rules, it must be discussed with the team before implementation.

## Expo Usage Rules
- Expo is allowed and expected.
- Allowed Expo APIs:
  - expo-image-picker
  - expo-localization
  - expo-notifications (if needed)
  - expo-secure-store (if needed)
- Do not introduce additional Expo APIs without team discussion.

## Team Collaboration
- Do not add new dependencies without team agreement.
- Keep pull requests focused on a single feature or fix.
- Document architectural decisions when necessary.
- If unsure about structure, follow existing features (auth, resident/faultReports).

## What NOT to do
- Do not bypass MVVM.
- Do not access Firebase directly from screens.
- Do not introduce Redux or other state libraries.
- Do not change folder structure.

## Instruction Conflicts
- If a user request conflicts with these instructions, do NOT implement the request.
- Clearly inform the user that the request violates project rules.
- Explain briefly which rule would be broken.
- Ask the user to discuss the change with the team before proceeding.

Follow these instructions strictly when generating or modifying code.
