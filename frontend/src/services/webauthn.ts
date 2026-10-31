import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
} from '@simplewebauthn/browser';

export interface BiometricCheckResult {
  supported: boolean;
  hasPlatformAuthenticator: boolean;
}

export async function checkBiometricSupport(): Promise<BiometricCheckResult> {
  const supported = browserSupportsWebAuthn();
  let hasPlatformAuthenticator = false;

  if (supported) {
    try {
      hasPlatformAuthenticator = await platformAuthenticatorIsAvailable();
    } catch {
      hasPlatformAuthenticator = false;
    }
  }

  return { supported, hasPlatformAuthenticator };
}

export async function executeWebAuthnRegistration(options: any) {
  try {
    const regResponse = await startRegistration({ optionsJSON: options });
    return regResponse;
  } catch (error: any) {
    console.error('WebAuthn Registration Error:', error);
    if (error.name === 'NotAllowedError') {
      throw new Error('Biometric registration was canceled or timed out.');
    }
    throw new Error(error.message || 'Failed to complete biometric enrollment on this device.');
  }
}

export async function executeWebAuthnAuthentication(options: any) {
  try {
    const authResponse = await startAuthentication({ optionsJSON: options });
    return authResponse;
  } catch (error: any) {
    console.error('WebAuthn Authentication Error:', error);
    if (error.name === 'NotAllowedError') {
      throw new Error('Biometric verification prompt was canceled.');
    }
    throw new Error(error.message || 'Biometric authentication failed.');
  }
}

