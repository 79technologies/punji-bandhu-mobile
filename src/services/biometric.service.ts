import * as LocalAuthentication from 'expo-local-authentication';

export async function isBiometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;
  return LocalAuthentication.isEnrolledAsync();
}

// disableDeviceFallback: the OS passcode fallback is deliberately not used —
// the app's own PIN (pin.storage.ts) is the fallback. See ADR 0002.
export async function authenticateWithBiometrics(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Punji Bandhu',
      cancelLabel: 'Use PIN instead',
      disableDeviceFallback: true,
    });
    return result.success;
  } catch {
    return false;
  }
}
