export class Localization {
  private translations: Record<string, string> = {};

  public t = (key: string): string | null => {
    return this.translations[key] || null;
  };

  public load = (translations: Record<string, string>): void => {
    this.translations = { ...this.translations, ...translations };
  };

  public clear = (): void => {
    this.translations = {};
  };

  public hasTranslation = (key: string): boolean => {
    return key in this.translations;
  };
}
