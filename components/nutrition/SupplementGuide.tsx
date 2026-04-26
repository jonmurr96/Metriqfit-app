import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useTokens } from '../../lib/theme';
import { SUPPLEMENTS, SUPPLEMENT_TAGS, type SupplementTag } from '../../lib/nutrition/supplements';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DISCLAIMER_SHORT = 'Educational only. Always consult a qualified professional before starting supplements.';
const DISCLAIMER_FULL =
  'This tool is educational only. It does not tell you what you should take. Always consult a qualified doctor, pharmacist, or licensed professional before starting supplements, especially if you are pregnant, nursing, have a medical condition, or take medications.';

export function SupplementGuide() {
  const { c, ty, s, r } = useTokens();
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<SupplementTag | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const lower = query.toLowerCase();
    return SUPPLEMENTS.filter((item) => {
      const matchesQuery =
        !lower ||
        item.name.toLowerCase().includes(lower) ||
        item.supports.some((b) => b.toLowerCase().includes(lower)) ||
        item.tags.some((t) => t.toLowerCase().includes(lower));
      const matchesTag = !activeTag || item.tags.includes(activeTag);
      return matchesQuery && matchesTag;
    });
  }, [query, activeTag]);

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Top disclaimer */}
      <View style={{ backgroundColor: `${c.warning}14`, paddingVertical: 10, paddingHorizontal: s.lg }}>
        <Text style={{ color: c.warning, fontFamily: ty.body.familyMedium, fontSize: ty.sizes.xs, textAlign: 'center' }}>
          {DISCLAIMER_SHORT}
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: s.lg, paddingBottom: s.xl * 4 }}>
        {/* Search */}
        <View style={[styles.searchWrap, { backgroundColor: c.surface2, borderRadius: r.pill }]}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search supplements, benefits, or goals"
            placeholderTextColor={c.textSubtle}
            style={[styles.searchInput, { color: c.text, fontFamily: ty.body.family }]}
          />
        </View>

        {/* Tag filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ marginTop: s.md, gap: 8, paddingBottom: s.sm }}>
          <TagChip label="All" active={activeTag === null} onPress={() => setActiveTag(null)} />
          {SUPPLEMENT_TAGS.map((tag) => (
            <TagChip key={tag} label={tag} active={activeTag === tag} onPress={() => setActiveTag(tag)} />
          ))}
        </ScrollView>

        {/* Results count */}
        <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: s.sm }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </Text>

        {/* List */}
        <View style={{ marginTop: s.md, gap: 10 }}>
          {filtered.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => toggleExpand(item.id)}
              style={[
                styles.card,
                {
                  backgroundColor: c.surface,
                  borderColor: c.border,
                  borderRadius: r.lg,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconWrap, { backgroundColor: `${c.primary}14`, borderRadius: r.md }]}>
                  <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: 12 }}>
                    {item.name.charAt(0)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md }}>
                    {item.name}
                  </Text>
                  <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 2 }}>
                    {item.supports.slice(0, 2).join(' • ')}
                    {item.supports.length > 2 ? ' • ...' : ''}
                  </Text>
                </View>
                <Text style={{ color: c.textMuted, fontFamily: ty.mono.family, fontSize: ty.sizes.lg }}>
                  {expandedId === item.id ? '−' : '+'}
                </Text>
              </View>

              {expandedId === item.id && (
                <View style={{ marginTop: s.md, paddingTop: s.md, borderTopWidth: 1, borderTopColor: c.border }}>
                  <Section title="Supports" color={c.primary}>
                    {item.supports.map((b, i) => (
                      <Bullet key={i} text={b} color={c.text} />
                    ))}
                  </Section>

                  <Section title="Common forms" color={c.textMuted}>
                    <Text style={{ color: c.text, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
                      {item.commonForms.join(', ')}
                    </Text>
                  </Section>

                  <Section title="Things to know" color={c.warning}>
                    <Text style={{ color: c.text, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
                      {item.thingsToKnow}
                    </Text>
                  </Section>

                  <Section title="Ask a professional if" color={c.accent}>
                    <Text style={{ color: c.text, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
                      {item.askProfessionalIf}
                    </Text>
                  </Section>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Bottom disclaimer */}
      <View style={{ backgroundColor: c.surface, padding: s.lg, borderTopWidth: 1, borderTopColor: c.border }}>
        <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, textAlign: 'center' }}>
          {DISCLAIMER_FULL}
        </Text>
      </View>
    </View>
  );
}

function TagChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { c, ty, r } = useTokens();
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: active ? c.primary : c.surface2,
        borderRadius: r.pill,
        paddingHorizontal: 12,
        paddingVertical: 6,
      }}
    >
      <Text style={{ color: active ? c.bg : c.text, fontFamily: ty.body.familyMedium, fontSize: 12 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  const { c, ty, s } = useTokens();
  return (
    <View style={{ marginBottom: s.md }}>
      <Text style={{ color, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, marginBottom: 4 }}>{title}</Text>
      {children}
    </View>
  );
}

function Bullet({ text, color }: { text: string; color: string }) {
  const { c, ty } = useTokens();
  return (
    <View style={{ flexDirection: 'row', marginBottom: 2 }}>
      <Text style={{ color: c.primary, marginRight: 6 }}>•</Text>
      <Text style={{ color, fontFamily: ty.body.family, fontSize: ty.sizes.sm, flex: 1 }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchInput: {
    fontSize: 16,
  },
  card: {
    borderWidth: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
