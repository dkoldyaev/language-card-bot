# Project Tasks: English Card Bot Backend

Below is a list of sequential, independent technical tasks based on the `user-flow.txt` logic and current codebase analysis.

## Completed Tasks

- [x] **Settings Management Schema & API**: Implement database schema for `UserSettings` (baseLanguage, targetLanguage, desiredLevel) and create the `/api/v1/settings` endpoint to save/update user settings.
- [x] **Mode Switching Endpoints**: Implement API endpoints (`/api/v1/switch_mode_dictionary_add`, `/api/v1/switch_mode_dictionary_edit`, `/api/v1/switch_mode_quiz`) to change the user's mode and update the `UserState` table in the database.
- [x] **Word Addition Pipeline**: Implement the `/api/v1/add_word` endpoint to receive words and a background worker (`add_word.worker`) to process them (split by lines, check existence, download translations and definitions, save to DB).
- [x] **Dictionary Edit - Word Deletion**: Implement the `/api/v1/word_delete` endpoint to remove a word from the database.
- [x] **Dictionary Edit - Definition Management**: Implement endpoints to add (`/api/v1/definition_add`), delete (`/api/v1/definition_delete`), edit text (`/api/v1/definition_edit`), and edit translation (`/api/v1/definition_translate_edit`).
- [x] **Mercure Integration Base**: Set up the generic event bus to publish state syncs and asynchronous word processing updates to clients via Mercure.

## Pending Tasks (Quiz Mode)

### Quiz State & Generation
- [x] **Quiz State Schema Update**: Add new fields to the `UserState` model in `schema.prisma` to track the active quiz session state (e.g., `showVariants: Boolean`, `showDefinitionTranslation: Boolean`, `currentDefinitionId: Int`).
- [x] **Quiz Generation Service**: Implement a backend service function to select a random word from a specific user's dictionary and a random definition for that word.
- [x] **Quiz Start API (`/api/v1/quiz/start`)**: Implement an endpoint that utilizes the Quiz Generation Service, resets the quiz state flags in `UserState` to false, and sends a Mercure event containing the initial quiz card data.

### Quiz Interactions
- [x] **Quiz Variants API (`/api/v1/quiz/variants`)**: Implement an endpoint that fetches 5 random incorrect words from the user's dictionary, updates `showVariants` to true in `UserState`, and sends the variants list via a Mercure event.
- [x] **Quiz Translate Definition API (`/api/v1/quiz/translate_definition`)**: Implement an endpoint that sets `showDefinitionTranslation` to true in `UserState`, fetches the translation for the currently active definition, and sends it via a Mercure event.

### Answer Processing & Evaluation
- [x] **Suggestion Evaluation Utility**: Implement a string comparison service to evaluate user text suggestions against the correct word (handling exact matches, detecting close matches/typos using a distance algorithm like Levenshtein, and identifying incorrect answers).
- [x] **Answer Submission API (`/api/v1/quiz/answer`)**: Implement an endpoint that receives the user's text suggestion, evaluates it using the Evaluation Utility, and sends a Mercure event with the evaluation result (success emoji, close match emoji, or sad emoji).

### Cleanup & Navigation
- [ ] **Quiz Cleanup Background Task**: Implement a delayed job/worker (triggered ~2 seconds after an answer) that sends Mercure events instructing the client to delete the quiz message, user suggestions, and answer reactions.
- [ ] **Next Card API (`/api/v1/quiz/next_card`)**: Implement an endpoint that resets the quiz state flags (`showVariants`, `showDefinitionTranslation`), calls the Quiz Generation Service to select a *new word*, updates the state, and sends the new card via a Mercure event.
- [ ] **Next Definition API (`/api/v1/quiz/next_definition`)**: Implement an endpoint that resets the quiz state flags, selects a *different random definition* for the *currently active word*, updates the state, and sends the updated card via a Mercure event.
