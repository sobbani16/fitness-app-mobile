import { parseQuickText } from '../quickParse';

describe('parseQuickText', () => {
  it.each([
    ['water 250', 250], ['drank 500 ml', 500], ['500ml of water', 500],
    ['2 glasses of water', 500], ['1.5 l water', 1500], ['1 bottle of water', 500],
  ])('parses water "%s"', (text, ml) => {
    expect(parseQuickText(text)).toEqual({ type: 'water', ml });
  });

  it.each([
    ['weight 70 kg', 70], ['weigh 154 lb', 69.9], ['70kg', 70], ['weight: 11 stone', 69.9],
  ])('parses weight "%s"', (text, kg) => {
    expect(parseQuickText(text)).toEqual({ type: 'weight', weightKg: kg });
  });

  it.each(['hello there', 'water', 'weight', 'ran 5 km', 'water 99999', 'weight 5 kg'])(
    'returns none for ambiguous or out-of-range "%s"', text => {
      expect(parseQuickText(text).type).toBe('none');
    });
});

test.each(['did not drink 500 ml water', "didn't drink 500ml water", 'weight -70 kg', 'water -250 ml', 'water 250 ml and 500 ml', 'weight 70 kg water 250 ml'])(
  'does not silently log an ambiguous command: %s', text => expect(parseQuickText(text)).toEqual({ type: 'none' }),
);
test('unitless weight follows the preferred unit system', () => {
  expect(parseQuickText('weight 154', 'imperial')).toEqual({ type: 'weight', weightKg: 69.9 });
  expect(parseQuickText('weight 70', 'metric')).toEqual({ type: 'weight', weightKg: 70 });
});
