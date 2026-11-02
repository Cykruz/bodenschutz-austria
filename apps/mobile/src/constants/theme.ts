/**
 * Markenfarben, Schrift und Maße laut docs/ARCHITEKTUR.md.
 * Alle Bildschirme und UI-Bausteine greifen nur hierauf zu.
 */

export const colors = {
  darkGreen: '#1E3A2F',
  sand: '#F6F3EC',
  sage: '#E6EDE3',
  terracotta: '#D97B2A',
  terracottaText: '#B9621C',
  accent: '#F0A85A',
  textGray: '#44524A',

  // abgeleitete Rollen
  background: '#F6F3EC',
  surface: '#FFFFFF',
  text: '#1E3A2F',
  textMuted: '#44524A',
  textOnDark: '#F6F3EC',
  border: '#CBD6CC',
  borderStrong: '#1E3A2F',
  disabled: '#9AA79E',
  error: '#A8321F',
  errorBackground: '#FBE7E2',
  success: '#2B6A44',
  successBackground: '#E1F0E5',
  warningBackground: '#FBEBD6',
  infoBackground: '#E6EDE3',
} as const;

export const fonts = {
  heading: 'Nunito_800ExtraBold',
  headingMedium: 'Nunito_700Bold',
  body: 'NunitoSans_400Regular',
  bodySemiBold: 'NunitoSans_600SemiBold',
  bodyBold: 'NunitoSans_700Bold',
} as const;

export const fontSizes = {
  title: 32,
  heading: 24,
  subheading: 20,
  body: 18,
  small: 15,
  tiny: 13,
  display: 56,
} as const;

export const lineHeights = {
  title: 38,
  heading: 30,
  subheading: 26,
  body: 26,
  small: 21,
  tiny: 18,
  display: 60,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  card: 24,
  button: 18,
  input: 16,
  badge: 999,
} as const;

export const sizes = {
  button: 56,
  input: 56,
  touchTarget: 48,
  maxContentWidth: 640,
} as const;

export const shadow = {
  card: {
    shadowColor: '#1E3A2F',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
} as const;
