import React, { useState } from 'react';
import { Linking } from 'react-native';
import { Action, Card, Copy } from '../design/components';
import { LabelAnalysis, LabelInsight } from '../api/labelScanner';
import FoodIntelligence from './FoodIntelligence';
function Insight({ insight }: { insight: LabelInsight }) {
  const [expanded, setExpanded] = useState(false), [linkError, setLinkError] = useState(false);
  return <Card>
    <Copy size="title">What we found: {insight.finding}</Copy>
    <Copy>What you can do: {insight.recommendation}</Copy>
    <Copy tone="muted">{insight.category.replace(/_/g, ' ')} · {insight.confidence.replace(/_/g, ' ').toLowerCase()}</Copy>
    <Action secondary label="Why was this flagged?" selected={expanded} onPress={() => setExpanded(v => !v)} />
    {expanded && <>
      <Copy>Why it matters: {insight.explanation}</Copy>
      {!!insight.personalRelevance && <Copy>For you: {insight.personalRelevance}</Copy>}
      <Copy size="title">View evidence</Copy>
      {insight.evidence.map((item, index) => <Copy selectable key={index}>{item.field}: “{item.text}” ({item.origin.replace(/_/g, ' ').toLowerCase()})</Copy>)}
      <Copy>{insight.confidenceExplanation}</Copy>
      <Copy selectable>Source: {insight.source.title}{'\n'}{insight.source.url}</Copy>
      <Action secondary label="Open source" onPress={() => { setLinkError(false); void Linking.openURL(insight.source.url).catch(() => setLinkError(true)); }} />
      {linkError && <Copy>Could not open source. The address above can be copied.</Copy>}
      <Copy size="caption">{insight.ruleId} · {insight.ruleVersion}</Copy>
    </>}
  </Card>;
}
export default function LabelInsights({ analysis }: { analysis: LabelAnalysis }) {
  return <>
    {analysis.foodIntelligence && <FoodIntelligence result={analysis.foodIntelligence} />}
    <Copy size="heading">Label insights</Copy>
    <Copy tone="muted">Educational checks of your label, not a health score or compliance certification.</Copy>
    {analysis.insights.length ? analysis.insights.map(item => <Insight key={item.ruleId} insight={item} />) : <Copy>No supported finding from the supplied facts. This does not establish product safety or claim compliance.</Copy>}
  </>;
}
