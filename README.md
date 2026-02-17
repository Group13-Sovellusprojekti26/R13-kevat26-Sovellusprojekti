# TaloFix

TaloFix kokoaa taloyhtiön vikailmoitukset ja tiedotteet yhteen sovellukseen, jossa asukkaat ilmoittavat, hallitus viestii ja huolto sekä isännöinti hoitavat asiat.

## Teknologiat

- Expo React Native + TypeScript
- Firebase (Auth, Firestore, Functions, Storage)
- React Native Paper (Material Design 3)
- React Navigation
- Zustand (state management)
- i18next (suomi/englanti)

## Pika-aloitus

```bash
# Asenna riippuvuudet
npm install

# Käynnistä sovellus
npm run start:clean

# Käynnistä iOS/Android
npm run ios
npm run android
```

## Firebase-konfiguraatio

Kopioi Firebase-asetukset `.env`-tiedostoon:

```
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

## Firebase Functions

Backend-funktiot sijaitsevat `functions/`-kansiossa.

```bash
# Asenna riippuvuudet
cd functions
npm install

# Käännä TypeScript
npm run build

# Testaa lokaalisti
npm run serve

# Julkaise Firebase:een
npm run deploy
```

## Projektikansiot

```
/
├── firestore.rules               # Firestore Security Rules
├── firestore.indexes.json        # Firestore-indeksit
├── storage.rules                 # Firebase Storage Rules
├── firebase.json                 # Firebase-konfiguraatio
├── src/                          # Sovelluksen lähdekoodi
│   ├── app/                      # Sovellustason konfiguraatiot
│   │   ├── navigation/           # Navigaattorit (stack, tabs)
│   │   │   ├── RootNavigator.tsx
│   │   │   ├── AuthNavigator.tsx
│   │   │   ├── AdminStack.tsx
│   │   │   ├── HousingCompanyStack.tsx + HousingCompanyTabs.tsx
│   │   │   ├── MaintenanceStack.tsx + MaintenanceTabs.tsx
│   │   │   ├── ServiceCompanyStack.tsx + ServiceCompanyTabs.tsx
│   │   │   └── ResidentStack.tsx + ResidentTabs.tsx
│   │   ├── providers/            # React-providerit
│   │   ├── theme/                # MD3-teema
│   │   └── i18n/                 # Kielitiedostot (fi/en)
│   │
│   ├── data/                     # Data-kerros
│   │   ├── firebase/             # Firebase-konfiguraatio
│   │   ├── models/               # TypeScript-mallit
│   │   │   ├── UserProfile.ts
│   │   │   ├── FaultReport.ts
│   │   │   ├── Announcement.ts
│   │   │   ├── HousingCompany.ts
│   │   │   └── enums.ts
│   │   └── repositories/         # Firestore + Cloud Functions -operaatiot
│   │       ├── users.repo.ts
│   │       ├── faultReports.repo.ts
│   │       ├── announcements.repo.ts
│   │       ├── housingCompanies.repo.ts
│   │       ├── residentInvites.repo.ts
│   │       ├── managementInvites.repo.ts
│   │       ├── serviceCompanyInvites.repo.ts
│   │       ├── partners.repo.ts
│   │       └── settings.repo.ts
│   │
│   ├── features/                 # Ominaisuudet (MVVM)
│   │   ├── auth/                 # Kirjautuminen
│   │   │   ├── views/
│   │   │   ├── viewmodels/
│   │   │   ├── services/
│   │   │   └── types/
│   │   ├── admin/                # Admin-toiminnot
│   │   │   ├── views/
│   │   │   └── viewmodels/
│   │   ├── housingCompany/       # Taloyhtiön toiminnot
│   │   │   ├── views/
│   │   │   ├── viewmodels/
│   │   │   ├── utils/
│   │   │   ├── schemas/
│   │   │   └── hooks/
│   │   ├── maintenance/          # Isännöinnin toiminnot
│   │   │   ├── views/
│   │   │   └── viewmodels/
│   │   ├── serviceCompany/       # Huoltoyhtiön toiminnot
│   │   │   ├── views/
│   │   │   └── viewmodels/
│   │   ├── resident/             # Asukkaan toiminnot
│   │   │   ├── faultReports/
│   │   │   │   ├── views/
│   │   │   │   └── viewmodels/
│   │   │   ├── views/
│   │   │   └── viewmodels/
│   │   └── settings/             # Asetukset
│   │       ├── views/
│   │       ├── viewmodels/
│   │       └── types/
│   │
│   └── shared/                   # Jaetut komponentit
│       ├── components/
│       ├── hooks/
│       ├── utils/
│       ├── types/
│       ├── styles/
│       └── config/
│
├── functions/                    # Firebase Cloud Functions
│   └── src/
│       ├── index.ts
│       ├── faultReports.ts
│       ├── announcements.ts
│       ├── housingCompanies.ts
│       ├── userProfile.ts
│       ├── residentInvites.ts
│       ├── managementInvites.ts
│       ├── serviceCompanyInvites.ts
│       ├── partnerManagement.ts
│       └── utils.ts
│
├── App.tsx                       # Sovelluksen entry point
└── index.ts                      # Expo-rekisteröinti

```

## MVVM-arkkitehtuuri

Jokainen ominaisuus noudattaa MVVM-rakennetta:

- **View** (views/): React-komponentit, UI
- **ViewModel** (viewmodels/): Zustand-storet, state + logiikka
- **Repository** (repositories/): Firestore + Cloud Functions -kutsut
- **Model** (data/models/): TypeScript-tyypit

Esimerkki: Uusi vikailmoitus
1. Käyttäjä täyttää lomakkeen `CreateFaultReportScreen.tsx`:ssä
2. ViewModel `useCreateFaultReportVM.ts` validoi ja hallitsee staten
3. ViewModel kutsuu `faultReports.repo.ts`:n `createFaultReport()`
4. Data tallennetaan Firestoreen

## Uuden ominaisuuden lisääminen

1. Luo kansio `src/features/uusi-ominaisuus/`
2. Lisää alikansiot: `views/`, `viewmodels/`, `types/`
3. Luo View-komponentti (UI)
4. Luo ViewModel (Zustand)
5. Luo/päivitä Repository (Firebase-operaatiot)
6. Lisää navigaatioon

## Tärkeää

- Kaikki UI-tekstit lokalisoidaan (ei kovakoodattuja stringejä)
- Käytä `t('avain')` käännöksille
- Seuraa TypeScript strict-tilaa
- Erota View, ViewModel ja Data-kerrokset

## Kehitys

```bash
npm run start        # Käynnistä dev-server
npm run start:clean  # Tyhjennä cache ja käynnistä
```

## Firebase Backend -arkkitehtuuri

TaloFix käyttää **Security Rules + Cloud Functions** -hybridimallia:
- **Yksinkertainen luku/kirjoitus** → Suora Firestore + Security Rules (nopea, halpa)
- **Privilegoidut operaatiot** → Cloud Functions (admin/maintenance-roolit)

### Security Rules

Firestore Security Rules tarjoavat ensimmäisen suojakerroksen:
- Kaikki kokoelmat (faultReports, announcements, users) suojattu
- housingCompanyId-rajaus automaattinen
- Estää luvattoman datan lukemisen ja kirjoittamisen

**Deployaa Security Rules:**
```bash
firebase deploy --only firestore:rules
```

### Cloud Functions

 Vain privilegoidut operaatiot toteutetaan funktioina:
 - `updateFaultReportStatus` (admin/maintenance)
 - `publishAnnouncement` (admin)
 - `deleteAnnouncement` (admin)

**Kehitys:**
```bash
cd functions
npm run lint          # Tarkista virheet
npm run lint -- --fix # Korjaa automaattisesti
npm run build         # Käännä TypeScript
```

**Deployaa funktiot:**
```bash
cd functions
npm run deploy
```

Tai deployaa kaikki (rules + functions) kerralla:
```bash
firebase deploy
```


