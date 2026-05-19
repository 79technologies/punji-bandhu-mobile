import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'pb.onboarded.v1';

export async function hasOnboarded(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEY)) === 'true';
}

export async function markOnboarded(): Promise<void> {
  await AsyncStorage.setItem(KEY, 'true');
}
