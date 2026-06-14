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
import {
  RecipeNutrition,
  RecipeSuggestion,
  getRecipeNutrition,
  searchRecipes,
} from '../api/recipes';

interface Props {
  onSelect: (nutrition: RecipeNutrition) => void;
}

/**
 * "Wondering what to cook?" — ingredient-based recipe finder.
 * User types ingredients one at a time, they appear as chips.
 * Recipes are filtered to match all selected ingredients.
 */
export default function RecipeByIngredients({ onSelect }: Props) {
  const [input, setInput] = useState('');
  const [chips, setChips] = useState<string[]>([]);
  const [results, setResults] = useState<RecipeSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [fetchingId, setFetchingId] = useState<string | null>(null);
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
    if (next.length > 0) {
      searchWithIngredients(next);
    } else {
      setResults([]);
    }
  };

  const searchWithIngredients = async (ingredients: string[]) => {
    if (ingredients.length === 0) return;
    setSearching(true);
    setError(null);
    try {
      // Search using all ingredients joined as query
      const query = ingredients.join(' ');
      const r = await searchRecipes(query);
      setResults(r);
    } catch (e: any) {
      setError(e?.message ?? 'Search failed');
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const pick = async (item: RecipeSuggestion) => {
    setFetchingId(item.id);
    setError(null);
    try {
      const nutrition = await getRecipeNutrition(item.id);
      onSelect(nutrition);
      setChips([]);
      setResults([]);
    } catch (e: any) {
      setError(e?.message ?? 'Could not load nutrition');
    } finally {
      setFetchingId(null);
    }
  };

  return (
    <View>
      <Text style={styles.sectionLabel}>Wondering what to cook?</Text>
      <Text style={styles.hint}>Add ingredients you have, get recipe ideas.</Text>

      {/* Input + Add button */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="e.g. chicken, rice, broccoli"
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

      {/* Chips */}
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

      {/* Loading */}
      {searching && <ActivityIndicator style={{ marginTop: 8 }} />}

      {/* Error */}
      {!!error && <Text style={styles.error}>{error}</Text>}

      {/* Results */}
      {results.length > 0 && (
        <View style={styles.dropdown}>
          {results.map((item) => (
            <Pressable
              key={item.id}
              style={styles.resultRow}
              onPress={() => pick(item)}
              disabled={fetchingId !== null}
            >
              <Text style={styles.resultText} numberOfLines={1}>
                {item.title}
              </Text>
              {fetchingId === item.id && <ActivityIndicator size="small" />}
            </Pressable>
          ))}
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
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
    gap: 8,
  },
  resultText: { flex: 1, fontSize: 15, color: '#222' },
});
