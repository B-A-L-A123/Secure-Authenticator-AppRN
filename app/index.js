// app/index.tsx
import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect to the tabs
  return <Redirect href="/(tabs)/authenticator" />;
}