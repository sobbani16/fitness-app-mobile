import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
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
 * Debounced recipe search with an autosuggest dropdown. Selecting a result
 * fetches its nutrition (per-100g macros) and hands it back to the parent.
 */
export default function RecipeSearch({ onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RecipeSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    timer.current = setTimeout(async () => {
      try {
        const r = await searchRecipes(q);
        setResults(r);
        setError(null);
      } catch (e: any) {
        setError(e?.message ?? 'Search failed');
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  const pick = async (item: RecipeSuggestion) => {
    setFetchingId(item.id);
    setError(null);
    try {
      const nutrition = await getRecipeNutrition(item.id);
      onSelect(nutrition);
      setQuery('');
      setResults([]);
    } catch (e: any) {
      setError(e?.message ?? 'Could not load nutrition');
    } finally {
      setFetchingId(null);
    }
  };

  return (
    <View>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Search a recipe (e.g. chicken curry)"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searching && <ActivityIndicator style={styles.spinner} />}
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

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
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d0d0d5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  spinner: { position: 'absolute', right: 12 },
  error: { color: '#c0392b', marginTop: 6 },
  dropdown: {
    marginTop: 6,
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
