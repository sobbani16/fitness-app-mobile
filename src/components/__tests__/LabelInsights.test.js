jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const React = require('react'), { create, act } = require('react-test-renderer');
const { Action, Copy } = require('../../design/components');
const Component = require('../LabelInsights').default;
it('keeps evidence expandable and exposes the reason, source and confidence', async () => {
  let tree;
  const insight = {ruleId:'R1',ruleVersion:'v1',category:'label_fact',finding:'Maida',recommendation:'Compare fiber',explanation:'Refined wheat',confidence:'VERIFIED',confidenceExplanation:'User reviewed',personalRelevance:'Fiber goal',evidence:[{field:'ingredients',text:'Maida',origin:'USER_REVIEWED_LABEL'}],source:{title:'Reference',url:'https://www.fda.gov/'}};
  await act(async () => { tree = create(<Component analysis={{insights:[insight]}} />); });
  const texts = () => tree.root.findAllByType(Copy).map(x => JSON.stringify(x.props.children)).join(' ');
  expect(texts()).not.toContain('Refined wheat');
  await act(async () => tree.root.findByType(Action).props.onPress());
  expect(texts()).toContain('Refined wheat'); expect(texts()).toContain('User reviewed'); expect(texts()).toContain('https://www.fda.gov/');
  await act(async () => tree.unmount());
});
