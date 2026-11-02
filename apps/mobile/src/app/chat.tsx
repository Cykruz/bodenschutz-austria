import AsyncStorage from '@react-native-async-storage/async-storage';
import { useHeaderHeight } from 'expo-router/react-navigation';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type ScrollViewInstance,
} from 'react-native';
import Animated, { FadeInLeft, FadeInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TypingDots } from '@/components/motion/TypingDots';
import { AppText, Body, DisclosureBanner, InfoBanner, KiBadge, Small } from '@/components/ui';
import { colors, fonts, fontSizes, radius, sizes, spacing } from '@/constants/theme';
import { useInquiry } from '@/context/InquiryContext';
import { api, errorMessage } from '@/lib/api';
import { useReduceMotion } from '@/lib/motion';
import type { ChatMessage, ChatRequest } from '@/lib/types';

const STORAGE_KEY = 'ba.chat.v1';
const STATIC_DISCLOSURE = 'Du sprichst mit einem KI-Assistenten von Bodenschutz Austria.';
const QUICK_QUESTIONS = [
  'Welche Platte passt zu meiner Baustelle?',
  'Wie wird geliefert und entladen?',
  'Kann ich Platten auch mieten?',
  'Wie läuft die Anfrage ab?',
  'Was kostet das ungefähr?',
];

interface StoredChat {
  sessionId?: string;
  messages: ChatMessage[];
  disclosure?: string;
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { draft } = useInquiry();
  const scrollRef = useRef<ScrollViewInstance>(null);

  const reduceMotion = useReduceMotion();
  const [hydrated, setHydrated] = useState(false);
  // Gespeicherte Nachrichten erscheinen ohne Bewegung, nur neue gleiten ein.
  const [animateFrom, setAnimateFrom] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [apiDisclosure, setApiDisclosure] = useState<string | undefined>();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        const stored = JSON.parse(raw) as StoredChat;
        const list = Array.isArray(stored.messages) ? stored.messages : [];
        setAnimateFrom(list.length);
        setSessionId(stored.sessionId);
        setMessages(list);
        setApiDisclosure(stored.disclosure);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) {
          setAnimateFrom((v) => v ?? 0);
          setHydrated(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const stored: StoredChat = { sessionId, messages, disclosure: apiDisclosure };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stored)).catch(() => undefined);
  }, [hydrated, sessionId, messages, apiDisclosure]);

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [messages.length, sending]);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || sending) return;
      setError(undefined);
      setInput('');
      const nextMessages: ChatMessage[] = [...messages, { role: 'user', content }];
      setMessages(nextMessages);
      setSending(true);
      try {
        const context: NonNullable<ChatRequest['context']> = {};
        if (draft.projectType) context.projectType = draft.projectType;
        if (draft.calculation) context.calculation = draft.calculation;
        const response = await api.chat({
          sessionId,
          channel: 'APP',
          messages: nextMessages.slice(-20),
          context: Object.keys(context).length > 0 ? context : undefined,
        });
        setSessionId(response.sessionId);
        setApiDisclosure(response.disclosure);
        setMessages([...nextMessages, { role: 'assistant', content: response.reply }]);
      } catch (e) {
        setError(errorMessage(e, 'Der Berater ist gerade nicht erreichbar. Bitte später erneut versuchen.'));
        setInput(content);
        setMessages(messages);
      } finally {
        setSending(false);
      }
    },
    [draft.calculation, draft.projectType, messages, sending, sessionId]
  );

  const clearChat = () => {
    setMessages([]);
    setSessionId(undefined);
    setApiDisclosure(undefined);
    setError(undefined);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <DisclosureBanner blink text={apiDisclosure ? `${apiDisclosure} ${STATIC_DISCLOSURE}` : STATIC_DISCLOSURE} />
        <Small>
          Der Berater erklärt Produkte, Verlegung, Entladung und den Ablauf. Verbindliche Preise, Lieferzeiten und
          Tragfähigkeitszusagen gibt es nur nach persönlicher Prüfung.
        </Small>

        {messages.length === 0 ? (
          <View style={styles.bubbleAssistantWrap}>
            <KiBadge compact />
            <View style={styles.bubbleAssistant}>
              <Body>Hallo! Womit kann ich helfen? Wählen Sie eine Frage oder schreiben Sie selbst.</Body>
            </View>
          </View>
        ) : null}

        {messages.map((m, i) => {
          const animate = !reduceMotion && animateFrom !== null && i >= animateFrom;
          return m.role === 'user' ? (
            <Animated.View
              key={i}
              entering={animate ? FadeInRight.duration(260) : undefined}
              style={styles.bubbleUserWrap}
            >
              <View style={styles.bubbleUser}>
                <Body color={colors.sand}>{m.content}</Body>
              </View>
            </Animated.View>
          ) : (
            <Animated.View
              key={i}
              entering={animate ? FadeInLeft.duration(300) : undefined}
              style={styles.bubbleAssistantWrap}
            >
              <KiBadge compact />
              <View style={styles.bubbleAssistant}>
                <Body>{m.content}</Body>
              </View>
            </Animated.View>
          );
        })}

        {sending ? (
          <Animated.View
            entering={reduceMotion ? undefined : FadeInLeft.duration(200)}
            style={styles.bubbleAssistantWrap}
          >
            <KiBadge compact />
            <View style={styles.bubbleAssistant}>
              <TypingDots />
            </View>
          </Animated.View>
        ) : null}

        {error ? <InfoBanner tone="error" text={error} /> : null}

        {messages.length > 0 ? (
          <Pressable onPress={clearChat} accessibilityRole="button" style={styles.clear}>
            <Small color={colors.terracottaText}>Verlauf löschen</Small>
          </Pressable>
        ) : null}
      </ScrollView>

      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          keyboardShouldPersistTaps="handled"
        >
          {QUICK_QUESTIONS.map((q) => (
            <Pressable
              key={q}
              onPress={() => send(q)}
              disabled={sending}
              accessibilityRole="button"
              style={({ pressed }) => [styles.chip, pressed ? styles.chipPressed : null]}
            >
              <Small color={colors.darkGreen} style={styles.chipText}>
                {q}
              </Small>
            </Pressable>
          ))}
        </ScrollView>
        <View style={styles.inputRow}>
          <View style={styles.inputWrap}>
            <KiBadge compact />
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Frage an den KI-Berater …"
              placeholderTextColor={colors.disabled}
              style={styles.input}
              multiline
              maxLength={1000}
              accessibilityLabel="Nachricht an den KI-Berater"
              returnKeyType="send"
              blurOnSubmit
              onSubmitEditing={() => send(input)}
              editable={!sending}
            />
          </View>
          <Pressable
            onPress={() => send(input)}
            disabled={sending || !input.trim()}
            accessibilityRole="button"
            accessibilityLabel="Senden"
            style={({ pressed }) => [
              styles.sendButton,
              pressed ? styles.chipPressed : null,
              sending || !input.trim() ? styles.sendDisabled : null,
            ]}
          >
            <AppText variant="bodyBold" color={colors.sand}>
              Senden
            </AppText>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    maxWidth: sizes.maxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  bubbleUserWrap: { alignItems: 'flex-end' },
  bubbleUser: {
    backgroundColor: colors.darkGreen,
    borderRadius: radius.card,
    borderBottomRightRadius: 6,
    padding: spacing.md,
    maxWidth: '85%',
  },
  bubbleAssistantWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, maxWidth: '90%' },
  bubbleAssistant: {
    flexShrink: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderBottomLeftRadius: 6,
    padding: spacing.md,
  },
  clear: { alignSelf: 'center', minHeight: 44, justifyContent: 'center' },
  composer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  chips: { paddingHorizontal: spacing.md, gap: spacing.sm },
  chip: {
    backgroundColor: colors.sage,
    borderRadius: radius.badge,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  chipPressed: { opacity: 0.8 },
  chipText: { fontFamily: fonts.bodySemiBold },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingHorizontal: spacing.md },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: sizes.input,
    maxHeight: 140,
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.text,
    paddingVertical: spacing.sm,
    maxHeight: 120,
  },
  sendButton: {
    minHeight: sizes.button,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.input,
    backgroundColor: colors.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.5 },
});
