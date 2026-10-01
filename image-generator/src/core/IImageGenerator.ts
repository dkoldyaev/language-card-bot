export interface IImageGenerator {
  generate(keywordGroups: string[][]): Promise<string[]>;
}
