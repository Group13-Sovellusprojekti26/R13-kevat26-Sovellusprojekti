# TaloFix - Property Management App

Production-ready Expo React Native application with TypeScript, MVVM architecture, and Firebase backend.

## Tech Stack

- **Framework**: Expo SDK ~54
- **Language**: TypeScript
- **UI Library**: react-native-paper (Material Design 3)
- **Navigation**: React Navigation (Native Stack + Bottom Tabs)
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Architecture**: MVVM (View, ViewModel, Data separation)
- **State Management**: Zustand
- **Forms**: react-hook-form + zod validation
- **Localization**: i18next + react-i18next + expo-localization
- **Image Picking**: expo-image-picker

## Project Structure

```
src/
├── app/
│   ├── navigation/         # Navigation configuration
│   │   ├── RootNavigator.tsx
│   │   ├── AuthNavigator.tsx
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
│   │   ├── faultReports.repo.ts
│   │   ├── announcements.repo.ts
│   │   └── users.repo.ts
│   └── models/           # Data models
│       ├── FaultReport.ts
│       ├── Announcement.ts
│       ├── UserProfile.ts
│       └── enums.ts
├── features/
│   ├── auth/
│   │   ├── views/        # UI screens
│   │   ├── viewmodels/   # Business logic
│   │   ├── services/     # External services
│   │   └── types/        # Feature-specific types
│   └── resident/
│       └── faultReports/
│           ├── views/
│           ├── viewmodels/
│           └── ...
└── shared/
    ├── components/       # Reusable components
    │   ├── Screen.tsx
    │   ├── TFButton.tsx
    │   └── TFTextField.tsx
    └── utils/           # Utility functions
        └── errors.ts
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
- Form validation using react-hook-form + zod
- MVVM architecture with Zustand state management

### Fault Reports (Resident)
- List all fault reports
- Create new fault reports
- Image upload support (ready for implementation)
- Urgency levels (Low, Medium, High, Urgent)
- Status tracking (Open, In Progress, Resolved, Closed)

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
- Separated from UI concerns

### Data/Services
- Firebase services in `services/` folders
- Repositories in `data/repositories/`
- Clean separation between UI and data layer

## Code Guidelines

- All code is TypeScript strict-compliant
- Comments are in English
- UI strings are localized (no hardcoded text)
- Consistent file naming conventions
- No circular dependencies

## Next Steps

1. Configure Firebase with your credentials
2. Set up Firestore security rules
3. Implement image upload functionality
4. Add more features (announcements, user profile, etc.)
5. Add error boundaries
6. Add loading screens
7. Add unit tests

## License

Private project
