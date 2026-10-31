const React = require('react');
const { act, create } = require('react-test-renderer');
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../api/client', () => ({ api: {} }));
jest.mock('../../api/ingredients', () => ({ ...jest.requireActual('../../api/ingredients'), searchIngredients: jest.fn(), selectIngredient: jest.fn().mockResolvedValue(undefined), loadIngredientSelections: jest.fn().mockResolvedValue([]) }));
jest.mock('../../design/components', () => ({ Action: 'Action', Copy: 'Copy', Field: 'Field', Notice: 'Notice', Skeleton: 'Skeleton', Sheet: 'Sheet', ListRow: 'ListRow', IconAction: 'IconAction' }));
const { searchIngredients, loadIngredientSelections } = require('../../api/ingredients');
const IngredientSearch = require('../IngredientSearch').default;
let tree;
beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); loadIngredientSelections.mockResolvedValue([]); });
afterEach(async () => { if (tree) await act(async () => tree.unmount()); jest.useRealTimers(); });
it('debounces queries and ignores an older response after the query changes', async () => {
 let oldResolve; searchIngredients.mockImplementationOnce(() => new Promise(resolve => { oldResolve = resolve; })).mockResolvedValueOnce([{ id: 'catalog-1', name: 'Pearl millet', caloriesPer100g: 348, preparation: 'raw/dry', source: 'humai-catalog' }]);
 await act(async () => { tree = create(<IngredientSearch onSelect={jest.fn()} />); });
 await act(async () => tree.root.findByType('Field').props.onChangeText('ri'));
 await act(async () => jest.advanceTimersByTime(350));
 await act(async () => tree.root.findByType('Field').props.onChangeText('bajra'));
 await act(async () => jest.advanceTimersByTime(350));
 await act(async () => oldResolve([{ id: 'old', name: 'Rice', caloriesPer100g: 100 }]));
 const rows = tree.root.findAllByType('ListRow');expect(rows).toHaveLength(1);expect(rows[0].props.title).toContain('Pearl millet');expect(rows[0].props.title).toContain('raw/dry');expect(rows[0].props.subtitle).toContain('kcal per 100 g');
});
it('collapses results into a selected row that can be changed again', async () => {
 const item = { id: 'catalog-1', name: 'Millet', caloriesPer100g: 348, macrosPer100g: { protein_g: 10.96, carbs_g: 73.27, fat_g: 5.43, fiber_g: 11.49 } }, select = jest.fn();
 searchIngredients.mockResolvedValue([item]);
 await act(async () => { tree = create(<IngredientSearch onSelect={select} />); });
 await act(async () => tree.root.findByType('Field').props.onChangeText('millet'));
 await act(async () => jest.advanceTimersByTime(350));
 await act(async () => tree.root.findAllByType('ListRow').find(x => x.props.subtitle.includes('kcal per 100 g')).props.onPress());
 expect(select).toHaveBeenCalledWith(item);
 // The dropdown closes: the picked food stays as a compact selected row.
 expect(tree.root.findByType('Field').props.value).toBe('');
 const rows = tree.root.findAllByType('ListRow');
 expect(rows).toHaveLength(1);
 expect(rows[0].props.title).toContain('Millet');
 expect(rows[0].props.subtitle).toContain('Selected');
 // Typing a new query swaps the selection back to live results.
 await act(async () => tree.root.findByType('Field').props.onChangeText('oats'));
 await act(async () => jest.advanceTimersByTime(350));
 expect(searchIngredients).toHaveBeenLastCalledWith('oats', { preparation: undefined, productType: undefined });
});
it('clears the selected row and returns to the saved lists', async () => {
 const item = { id: 'catalog-1', name: 'Millet', caloriesPer100g: 348 };
 searchIngredients.mockResolvedValue([item]);
 await act(async () => { tree = create(<IngredientSearch onSelect={jest.fn()} />); });
 await act(async () => tree.root.findByType('Field').props.onChangeText('millet'));
 await act(async () => jest.advanceTimersByTime(350));
 await act(async () => tree.root.findAllByType('ListRow')[0].props.onPress());
 expect(tree.root.findAllByType('ListRow')).toHaveLength(1);
 await act(async () => tree.root.findAllByProps({ label: 'Change food: Millet' })[0].props.onPress());
 expect(tree.root.findAllByType('ListRow')).toHaveLength(0);
});
it('applies preparation and product filters to subsequent searches', async () => {
 searchIngredients.mockResolvedValue([]);
 await act(async () => { tree = create(<IngredientSearch onSelect={jest.fn()} />); });
 await act(async () => tree.root.findByType('Field').props.onChangeText('rice'));
 await act(async () => jest.advanceTimersByTime(350));
 expect(searchIngredients).toHaveBeenLastCalledWith('rice', { preparation: undefined, productType: undefined });
 await act(async () => tree.root.findAllByProps({ accessibilityLabel: 'Filters' })[0].props.onPress());
 await act(async () => tree.root.findAllByProps({ accessibilityLabel: 'Raw' })[0].props.onPress());
 await act(async () => tree.root.findAllByProps({ accessibilityLabel: 'Branded' })[0].props.onPress());
 await act(async () => jest.advanceTimersByTime(350));
 expect(searchIngredients).toHaveBeenLastCalledWith('rice', { preparation: 'raw', productType: 'branded' });
});
it('loads recent foods under the empty field and switches to favorites', async () => {
 loadIngredientSelections.mockResolvedValue([{ id: 'r1', name: 'Dal', caloriesPer100g: 120 }]);
 await act(async () => { tree = create(<IngredientSearch onSelect={jest.fn()} />); });
 const rows = tree.root.findAllByType('ListRow');
 expect(rows).toHaveLength(1);
 expect(rows[0].props.title).toContain('Dal');
 await act(async () => tree.root.findAllByType('Action').find(a => a.props.label === 'Favorites').props.onPress());
 expect(loadIngredientSelections).toHaveBeenLastCalledWith(true);
});
it('labels estimated and review-conflict foods without claiming official verification', () => {
 const { verificationLabel } = require('../../api/ingredients');
 expect(verificationLabel({ verificationLevel: 'ESTIMATED' })).toBe('Estimated');
 expect(verificationLabel({ verificationLevel: 'REVIEW_CONFLICT' })).toContain('Needs review');
 expect(verificationLabel({ verificationLevel: 'PARTIALLY_SOURCE_BACKED', provenance: { confirmed_nutrients: 'Calories' } })).toContain('Macros may be estimated');
 expect(verificationLabel({ verificationLevel: 'SOURCE_BACKED_FULL' })).toBe('Source-backed');
});
