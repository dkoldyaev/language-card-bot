export interface AddWordRequest {
  word: string;
  dictionaryId?: number;
}

export interface AddWordResponse {
  message: string;
}

export interface AddWordBatchRequest {
  words: string[];
  dictionaryId?: number;
}

export interface AddWordBatchResponse {
  message: string;
  addedCount: number;
  duplicateCount: number;
}
