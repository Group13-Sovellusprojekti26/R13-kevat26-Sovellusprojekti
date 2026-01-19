declare module 'expo-clipboard' {
  export function setStringAsync(value: string): Promise<void>;
  export function getStringAsync(): Promise<string>;
  const _default: {
    setStringAsync: (value: string) => Promise<void>;
    getStringAsync: () => Promise<string>;
  };
  export default _default;
}
