import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  RecipeNutrition,
  getRecipeNutrition,
} from '../api/recipes';
import { MatchResultV2, matchIngredientsV2, addGroceryItems } from '../api/cooking';

interface Props {
  onSelect: (nutrition: RecipeNutrition) => void;
}

const STATUS_LABEL: Record<MatchResultV2['status'], string> = {
  ready: 'Ready to cook',
  'insufficient-quantity': 'Quantity short',
  'missing-one': 'Missing 1 item',
  'missing-few': 'Missing a few',
  partial: 'Partial match',
};

/**
 * "Wondering what to cook?" — relational ingredient-based recipe finder.
 * Names resolve to canonical catalog ingredients server-side; coverage,
 * missing lines and quantities come back per recipe. Cook opens guided mode;
 * tapping a row still offers the quick-log path.
 */
export default function RecipeByIngredients({ onSelect }: Props) {
  const navigation = useNavigation<any>();
  const [input, setInput] = useState('');
  const [chips, setChips] = useState<string[]>([]);
  const [results, setResults] = useState<MatchResultV2[]>([]);
  const [unresolved, setUnresolved] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [groceryFor, setGroceryFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addChip = () => {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed || chips.includes(trimmed)) return;
    const next = [...chips, trimmed];
    setChips(next);
    setInput('');
    searchWithIngredients(next);
  };

  const removeChip = (chip: string) => {
    const next = chips.filter((c) => c !== chip);
    setChips(next);
    if (next.length > 0) searchWithIngredients(next);
    else { setResults([]); setUnresolved([]); }
  };

  const searchWithIngredients = async (ingredients: string[]) => {
    if (!ingredients.length) return;
    setSearching(true);
    setError(null);
    try {
      const r = await matchIngredientsV2({ items: ingredients.map((name) => ({ name })) });
      setResults(r.results);
      setUnresolved(r.unresolvedInputs);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? 'Search failed');
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const pick = async (item: MatchResultV2) => {
    setFetchingId(item.recipe.id);
    setError(null);
    try {
      const nutrition = await getRecipeNutrition(item.recipe.id);
      onSelect(nutrition);
      setChips([]);
      setResults([]);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? 'Could not load nutrition');
    } finally {
      setFetchingId(null);
    }
  };

  const cook = (item: MatchResultV2) => {
    navigation.navigate('CookingMode', {
      recipeId: item.recipe.id,
      missing: item.missingRequired.map((m) => m.name),
      quantityAssumed: item.quantityAssumed,
    });
  };

  const toGrocery = async (item: MatchResultV2) => {
    setGroceryFor(item.recipe.id);
    setError(null);
    try {
      await addGroceryItems([
        ...item.missingRequired.map((m) => ({ name: m.name, amountG: m.amountG, sourceRecipeId: item.recipe.id })),
        ...item.missingOptional.map((m) => ({ name: m.name, amountG: m.amountG, optional: true, sourceRecipeId: item.recipe.id })),
      ]);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? 'Could not add to grocery list');
    } finally {
      setGroceryFor(null);
    }
  };

  return (
    <View>
      <Text style={styles.sectionLabel}>Wondering what to cook?</Text>
      <Text style={styles.hint}>Add ingredients you have, get recipe ideas.</Text>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="e.g. eggs, avocado, bread"
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={addChip}
          returnKeyType="done"
        />
        <Pressable
          style={[styles.addBtn, !input.trim() && styles.addBtnDisabled]}
          onPress={addChip}
          disabled={!input.trim()}
        >
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
      </View>

      {chips.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          <View style={styles.chipRow}>
            {chips.map((chip) => (
              <Pressable key={chip} style={styles.chip} onPress={() => removeChip(chip)}>
                <Text style={styles.chipText}>{chip}</Text>
                <Text style={styles.chipX}>×</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}

      {searching && <ActivityIndicator style={{ marginTop: 8 }} />}
      {!!error && <Text style={styles.error}>{error}</Text>}
      {unresolved.length > 0 && (
        <Text style={styles.hint}>Not recognized: {unresolved.join(', ')} — try another name.</Text>
      )}

      {results.length > 0 && (
        <View style={styles.dropdown}>
          {results.map((item) => {
            const miss = item.missingRequired.map((m) => m.name);
            return (
              <View key={item.recipe.id} style={styles.resultRow}>
                <Pressable
                  style={{ flex: 1 }}
                  onPress={() => pick(item)}
                  disabled={fetchingId !== null}
                  accessibilityLabel={`${item.recipe.name}, ${STATUS_LABEL[item.status]}${miss.length ? `, missing ${miss.join(', ')}` : ''}`}
                >
                  <View style={styles.nameRow}>
                    <Text style={styles.resultText} numberOfLines={1}>{item.recipe.name}</Text>
                    <Text style={[styles.statusChip, item.status === 'ready' && styles.statusReady]}>{STATUS_LABEL[item.status]}</Text>
                  </View>
                  <Text style={styles.resultSub} numberOfLines={2}>
                    {item.status === 'ready'
                      ? `You have all ${item.availableIngredients.length} required ingredients${item.recipe.prepMinutes ? ` · ~${item.recipe.prepMinutes} min` : ''}`
                      : `Missing: ${miss.slice(0, 3).join(', ')}${miss.length > 3 ? '…' : ''}`}
                  </Text>
                </Pressable>
                <View style={styles.actions}>
                  <Pressable style={styles.cookBtn} onPress={() => cook(item)} accessibilityRole="button">
                    <Text style={styles.cookBtnText}>Cook</Text>
                  </Pressable>
                  {miss.length > 0 && (
                    <Pressable
                      style={styles.listBtn}
                      onPress={() => toGrocery(item)}
                      disabled={groceryFor === item.recipe.id}
                      accessibilityLabel={`Add ${miss.length} missing items to grocery list`}
                    >
                      {groceryFor === item.recipe.id
                        ? <ActivityIndicator size="small" />
                        : <Text style={styles.listBtnText}>+ List</Text>}
                    </Pressable>
                  )}
                  {fetchingId === item.recipe.id && <ActivityIndicator size="small" />}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {chips.length > 0 && results.length === 0 && !searching && (
        <Text style={styles.noResults}>No recipes found for these ingredients. Try adding or removing one.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#222', marginTop: 12 },
  hint: { fontSize: 12, color: '#888', marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d0d0d5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  addBtn: {
    backgroundColor: '#1e6fb8',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  addBtnDisabled: { backgroundColor: '#a9c4dd' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  chipScroll: { marginTop: 8 },
  chipRow: { flexDirection: 'row', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f0fe',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  chipText: { fontSize: 13, color: '#1a4a7a', fontWeight: '600' },
  chipX: { fontSize: 16, color: '#1a4a7a', fontWeight: '700', marginLeft: 2 },
  error: { color: '#c0392b', marginTop: 6, fontSize: 13 },
  noResults: { color: '#888', fontSize: 13, marginTop: 8, fontStyle: 'italic' },
  dropdown: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e0e0e5',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
    gap: 8,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resultText: { flexShrink: 1, fontSize: 15, color: '#222', fontWeight: '500' },
  statusChip: { fontSize: 10, fontWeight: '700', color: '#8a6d1f', backgroundColor: '#fdf3d8', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },
  statusReady: { color: '#1f7a4d', backgroundColor: '#e0f2e9' },
  resultSub: { fontSize: 12, color: '#888', marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cookBtn: { backgroundColor: '#137C63', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  cookBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  listBtn: { borderWidth: 1, borderColor: '#d0d0d5', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, minWidth: 46, alignItems: 'center' },
  listBtnText: { color: '#555', fontWeight: '600', fontSize: 12 },
});
