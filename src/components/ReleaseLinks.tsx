import React from 'react';
import { View, Text, Button, Linking, Alert } from 'react-native';
export default function ReleaseLinks() {
  const privacy = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL;
  const email = process.env.EXPO_PUBLIC_SUPPORT_EMAIL;
  const open = (url: string) => Linking.openURL(url).catch(() => Alert.alert('Could not open link', 'Please try again from your browser or email app.'));
  return <View style={{gap:8,paddingVertical:12}}>
    {!!privacy && /^https:\/\//.test(privacy) && <Button title="Privacy policy" onPress={()=>open(privacy)} />}
    {!!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && <Button title="Send beta feedback" onPress={()=>open(`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent('Fitness app beta feedback')}`)} />}
    <Text>TestFlight testers can also send feedback with screenshots from the TestFlight app. Avoid including passwords or personal health details.</Text>
  </View>;
}
