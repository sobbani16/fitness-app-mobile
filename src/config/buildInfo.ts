import * as Application from 'expo-application';

// Response contract this bundle was written against. Bump together with the
// backend API_CONTRACT_VERSION when a breaking response change ships.
export const CLIENT_API_CONTRACT = 2;

export function clientBuild(): string {
  const version = Application.nativeApplicationVersion || 'dev';
  const build = Application.nativeBuildVersion || '0';
  return `${version}(${build})`.replace(/[^A-Za-z0-9._+() -]/g, '').slice(0, 64);
}
