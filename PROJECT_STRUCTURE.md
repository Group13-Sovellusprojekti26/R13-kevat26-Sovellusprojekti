# TaloFix - Property Management App

Production-ready Expo React Native application with TypeScript, MVVM architecture, and Firebase backend.

## Tech Stack

- **Framework**: Expo SDK ~54
- **Language**: TypeScript
- **UI Library**: react-native-paper (Material Design 3)
- **Navigation**: React Navigation (Native Stack + Bottom Tabs)
- **Backend**: Firebase (Auth, Firestore, Storage, Cloud Functions)
- **Architecture**: MVVM (View, ViewModel, Repository separation)
- **State Management**: Zustand
- **Forms**: react-hook-form + zod validation
- **Localization**: i18next + react-i18next + expo-localization
- **Image Handling**: expo-image-picker + expo-image-manipulator
- **Charts**: react-native-gifted-charts

## Project Structure

```
src/
├── app/
│   ├── navigation/         # Navigation configuration
│   │   ├── RootNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   ├── AdminStack.tsx
│   │   ├── HousingCompanyStack.tsx
│   │   ├── HousingCompanyTabs.tsx
│   │   ├── MaintenanceStack.tsx
│   │   ├── MaintenanceTabs.tsx
│   │   ├── ServiceCompanyStack.tsx
│   │   ├── ServiceCompanyTabs.tsx
│   │   ├── ResidentStack.tsx
│   │   └── ResidentTabs.tsx
│   ├── providers/          # App providers
│   │   └── AppProviders.tsx
│   ├── theme/             # Material Design 3 theme
│   │   └── theme.ts
│   └── i18n/              # Internationalization
│       ├── i18n.ts
│       └── locales/
│           ├── fi.json
│           └── en.json
├── data/
│   ├── firebase/          # Firebase configuration
│   │   └── firebase.ts
│   ├── repositories/      # Data access layer
│   │   ├── users.repo.ts
│   │   ├── faultReports.repo.ts
│   │   ├── announcements.repo.ts
│   │   ├── housingCompanies.repo.ts
│   │   ├── residentInvites.repo.ts
│   │   ├── managementInvites.repo.ts
│   │   ├── serviceCompanyInvites.repo.ts
│   │   ├── partners.repo.ts
│   │   └── settings.repo.ts
│   └── models/           # Data models
│       ├── UserProfile.ts
│       ├── FaultReport.ts
│       ├── Announcement.ts
│       ├── HousingCompany.ts
│       └── enums.ts
├── features/
│   ├── auth/
│   │   ├── views/        # UI screens
│   │   ├── viewmodels/   # Business logic
│   │   ├── services/     # Auth services
│   │   └── types/        # Feature-specific types
│   ├── admin/
│   │   ├── views/
│   │   └── viewmodels/
│   ├── housingCompany/
│   │   ├── views/
│   │   ├── viewmodels/
│   │   ├── utils/
│   │   ├── schemas/
│   │   └── hooks/
│   ├── maintenance/
│   │   ├── views/
│   │   └── viewmodels/
│   ├── serviceCompany/
│   │   ├── views/
│   │   └── viewmodels/
│   ├── resident/
│   │   ├── faultReports/
│   │   │   ├── views/
│   │   │   └── viewmodels/
│   │   ├── views/
│   │   └── viewmodels/
│   └── settings/
│       ├── views/
│       ├── viewmodels/
│       └── types/
└── shared/
    ├── components/       # Reusable components
    │   ├── Screen.tsx
    │   ├── TFButton.tsx
    │   ├── TFTextField.tsx
    │   └── ...
    ├── hooks/
    ├── utils/           # Utility functions
    ├── types/
    ├── styles/
    └── config/

functions/               # Firebase Cloud Functions
├── src/
│   ├── index.ts
│   ├── faultReports.ts
│   ├── announcements.ts
│   ├── housingCompanies.ts
│   ├── userProfile.ts
│   ├── residentInvites.ts
│   ├── managementInvites.ts
│   ├── serviceCompanyInvites.ts
│   ├── partnerManagement.ts
│   └── utils.ts
└── package.json
```

## Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Authentication (Email/Password)
3. Create Firestore database
4. Enable Storage
5. Add your Firebase config to environment variables:

Create a `.env` file (or use Expo environment variables):

```
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## Running the App

```bash
# Start Expo development server
npx expo start

# Run on iOS simulator
npx expo start --ios

# Run on Android emulator
npx expo start --android

# Run on web
npx expo start --web
```

## Features

### Authentication
- Email/Password sign-in with Firebase Auth
- Role-based registration with invite codes
- Form validation using react-hook-form + zod
- MVVM architecture with Zustand state management

### User Roles
- **Admin**: Create housing companies, manage global settings
- **Housing Company**: Manage residents, partners, announcements
- **Maintenance (Property Manager)**: Handle fault reports, publish announcements
- **Service Company**: View and complete assigned tasks
- **Resident**: Submit fault reports, view announcements

### Fault Reports
- List all fault reports with filtering
- Create new fault reports with images
- Image upload with Firebase Storage
- Urgency levels (Low, Medium, High, Urgent)
- Status tracking (Open, In Progress, Resolved, Closed)
- Assignment to service companies

### Announcements
- Housing company and maintenance can publish announcements
- Image support for announcements
- All residents in housing company receive announcements

### Invite System
- 8-character invite codes for each role
- Secure registration flow
- Housing company scoped invitations

### Localization
- Finnish (fi) and English (en) support
- Automatic language detection from device settings
- Easy to extend with more languages

## MVVM Architecture

### View
- React components in `views/` folders
- Minimal business logic
- Uses ViewModels for state and actions

### ViewModel
- Zustand stores in `viewmodels/` folders
- Contains business logic and state
- Calls repositories for data operations

### Repository
- Repository pattern in `data/repositories/`
- Firestore operations and Cloud Functions calls
- Only layer that accesses Firebase SDK
- Clean separation between UI and data layer

### Model
- TypeScript types and interfaces in `data/models/`
- Enums for Status, Priority, Role

## Code Guidelines

- All code is TypeScript strict-compliant
- Comments are in English
- UI strings are localized (no hardcoded text)
- Consistent file naming conventions
- No circular dependencies
- UI components never call Firebase directly
- Only repositories access Firebase SDK
- ViewModels handle all business logic

## Next Steps

1. Configure Firebase with your credentials
2. Deploy Firestore security rules
3. Deploy Cloud Functions
4. Test all user roles and workflows
5. Add error boundaries
6. Add loading screens
7. Add unit tests
8. Performance optimization

## License

Private project
