import { createContext, useContext, useState, type ReactNode } from 'react';

export type Language = 'en' | 'sw';

type TranslationDict = Record<string, string>;

const en: TranslationDict = {
  // Onboarding
  'onboarding.tagline': 'Social. Live. Play. Connect.',
  'onboarding.createAccount': 'Create your account',
  'onboarding.joinCommunity': 'Join the FLIP community in just a few steps.',
  'onboarding.username': 'Username',
  'onboarding.email': 'Email',
  'onboarding.password': 'Password',
  'onboarding.phone': 'Phone Number',
  'onboarding.deviceLimit': 'Max 2 accounts per device. This is an enforced anti-spam measure.',
  'onboarding.termsTitle': 'Terms & Conditions',
  'onboarding.termsDesc': 'Please review and accept our terms to continue.',
  'onboarding.agreeTerms': 'I have read and agree to the Terms of Service and Liability Waiver of FLIP.',
  'onboarding.readFullTerms': 'Read full terms page',
  'onboarding.verifyNumber': 'Verify your number',
  'onboarding.otpSent': 'We sent a 6-character code to',
  'onboarding.otpEnter': 'Enter it below.',
  'onboarding.otpVerified': 'Verified! Taking you to the next step...',
  'onboarding.otpIncorrect': 'Incorrect code. Please try again.',
  'onboarding.demoCode': 'Demo code:',
  'onboarding.resendCode': 'Resend code',
  'onboarding.profileTitle': 'Set up your profile',
  'onboarding.profileDesc': 'Add a photo and bio so people can recognize you.',
  'onboarding.uploadPhoto': 'Upload Photo',
  'onboarding.takePhoto': 'Take Photo',
  'onboarding.pasteUrl': 'Paste image URL...',
  'onboarding.bio': 'Bio',
  'onboarding.bioPlaceholder': 'Tell people about yourself...',
  'onboarding.connectTitle': 'Welcome to FLIP!',
  'onboarding.connectDesc': 'Connect with people to see their content in your feed.',
  'onboarding.noSuggestions': 'No suggestions yet. You can skip and explore!',
  'onboarding.follow': 'Follow',
  'onboarding.following': 'Following',
  'onboarding.continue': 'Continue',
  'onboarding.back': 'Back',
  'onboarding.enterFlip': 'Enter FLIP',
  'onboarding.skip': 'Skip',
  'onboarding.finishing': 'Finishing...',
  'onboarding.agreeTermsBtn': 'I Agree to These Terms',
  'onboarding.fillAllFields': 'Please fill in all fields.',
  'onboarding.invalidEmail': 'Please enter a valid email address.',
  'onboarding.deviceMaxReached': 'This device has reached the maximum of 2 accounts. This is an anti-spam measure.',
  'onboarding.connectionError': 'Unable to reach the server. Please check your connection and try again.',
  'onboarding.signingUp': 'Creating your account...',
  'onboarding.accountReady': 'Account created! You can now connect with others.',
  // Auth
  'auth.signIn': 'Sign In',
  'auth.signingIn': 'Signing in...',
  'auth.createAccount': 'Create New Account',
  'auth.newToFlip': 'New to FLIP?',
  'auth.byContinuing': "By continuing, you agree to FLIP's Terms of Service and Privacy Policy.",
  'auth.connectionError': 'Connection error. Please check your internet and try again.',
  'auth.wrongCredentials': 'Wrong email or password. Please try again.',
  'auth.alreadyRegistered': 'This email is already registered. Try signing in instead.',
  'auth.accountCreated': 'Account created! Please sign in with your credentials.',
  'auth.passwordShort': 'Password must be at least 6 characters long.',
  'auth.invalidEmail': 'Please enter a valid email address.',
  'auth.enterCredentials': 'Please enter your email and password.',
  'auth.somethingWrong': 'Something went wrong. Please try again.',
  // Language
  'lang.label': 'Language',
  'lang.english': 'English',
  'lang.swahili': 'Kiswahili',
  // Step labels
  'step.account': 'Account',
  'step.terms': 'Terms',
  'step.verify': 'Verify',
  'step.profile': 'Profile',
  'step.connect': 'Connect',
};

const sw: TranslationDict = {
  // Onboarding
  'onboarding.tagline': 'Maisha. Moja. Mziki. Ungana.',
  'onboarding.createAccount': 'Fungua akaunti yako',
  'onboarding.joinCommunity': 'Jiunge na jamii ya FLIP kwa hatua chache tu.',
  'onboarding.username': 'Jina la mtumiaji',
  'onboarding.email': 'Barua pepe',
  'onboarding.password': 'Nenosiri',
  'onboarding.phone': 'Nambari ya Simu',
  'onboarding.deviceLimit': 'Akaunti 2 pekee kwa kifaa. Hii ni hatua ya kuzuia spam.',
  'onboarding.termsTitle': 'Masharti & Vigezo',
  'onboarding.termsDesc': 'Tafadhali soma na kukubali masharti yetu kuendelea.',
  'onboarding.agreeTerms': 'Nimesoma na nakubali Masharti ya Huduma na Msamaha wa FLIP.',
  'onboarding.readFullTerms': 'Soma masharti kamili',
  'onboarding.verifyNumber': 'Thibitisha nambari yako',
  'onboarding.otpSent': 'Tumetuma namba ya tarakimu 6 kwa',
  'onboarding.otpEnter': 'Iingie hapa chini.',
  'onboarding.otpVerified': 'Imethibitishwa! Tunakupeleka hatua inayofuata...',
  'onboarding.otpIncorrect': 'Kodi sio sahihi. Tafadhali jaribu tena.',
  'onboarding.demoCode': 'Kodi ya demo:',
  'onboarding.resendCode': 'Tuma kodi tena',
  'onboarding.profileTitle': 'Andika wasifu wako',
  'onboarding.profileDesc': 'Ongeza picha na maelezo ili watu wakutambue.',
  'onboarding.uploadPhoto': 'Pakia Picha',
  'onboarding.takePhoto': 'Piga Picha',
  'onboarding.pasteUrl': 'Bandika kiungo cha picha...',
  'onboarding.bio': 'Maelezo',
  'onboarding.bioPlaceholder': 'Mwambie watu mambo kuhusu wewe...',
  'onboarding.connectTitle': 'Karibu FLIP!',
  'onboarding.connectDesc': 'Ungana na watu kuona maudhui yao kwenye feed yako.',
  'onboarding.noSuggestions': 'Hakuna mapendekezo bado. Unaweza ruka na kuchunguza!',
  'onboarding.follow': 'Follow',
  'onboarding.following': 'Ukifuata',
  'onboarding.continue': 'Endelea',
  'onboarding.back': 'Rudi',
  'onboarding.enterFlip': 'Ingia FLIP',
  'onboarding.skip': 'Ruka',
  'onboarding.finishing': 'Inakamilisha...',
  'onboarding.agreeTermsBtn': 'Nakubali Masharti Haya',
  'onboarding.fillAllFields': 'Tafadhali jaza sehemu zote.',
  'onboarding.invalidEmail': 'Tafadhali weka barua pepe halali.',
  'onboarding.deviceMaxReached': 'Kifaa hiki kimefikia akaunti 2 za kiwango cha juu. Hii ni hatua ya kuzuia spam.',
  'onboarding.connectionError': 'Imeshindwa kufikia seva. Tafadhali angalia muunganisho wako na jaribu tena.',
  'onboarding.signingUp': 'Inafungua akaunti yako...',
  'onboarding.accountReady': 'Akaunti imeundwa! Sasa unaweza kuungana na wengine.',
  // Auth
  'auth.signIn': 'Ingia',
  'auth.signingIn': 'Unaingia...',
  'auth.createAccount': 'Fungua Akaunti Mpya',
  'auth.newToFlip': 'Mpya FLIP?',
  'auth.byContinuing': 'Kwa kuendelea, unakubali Masharti ya Huduma na Sera ya Faragha ya FLIP.',
  'auth.connectionError': 'Kosa la muunganisho. Tafadhali angalia intaneti yako na jaribu tena.',
  'auth.wrongCredentials': 'Barua pepe au nenosiri sio sahihi. Tafadhali jaribu tena.',
  'auth.alreadyRegistered': 'Barua pepe hii imesajishwa tayari. Jaribu kuingia badala yake.',
  'auth.accountCreated': 'Akaunti imeundwa! Tafadhali ingia na taarifa zako.',
  'auth.passwordShort': 'Nenosiri lazima liwe na herufi 6 angalau.',
  'auth.invalidEmail': 'Tafadhali weka barua pepe halali.',
  'auth.enterCredentials': 'Tafadhali weka barua pepe na nenosiri lako.',
  'auth.somethingWrong': 'Kitu kimeenda vibaya. Tafadhali jaribu tena.',
  // Language
  'lang.label': 'Lugha',
  'lang.english': 'English',
  'lang.swahili': 'Kiswahili',
  // Step labels
  'step.account': 'Akaunti',
  'step.terms': 'Masharti',
  'step.verify': 'Thibitisha',
  'step.profile': 'Wasifu',
  'step.connect': 'Ungana',
};

const dictionaries: Record<Language, TranslationDict> = { en, sw };

interface LanguageContextValue {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const STORAGE_KEY = 'flip-lang';

function getInitialLang(): Language {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'sw') return stored;
  return 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(getInitialLang);

  const setLang = (l: Language) => {
    setLangState(l);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, l);
  };

  const t = (key: string): string => {
    return dictionaries[lang][key] ?? dictionaries.en[key] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used within LanguageProvider');
  return ctx;
}
