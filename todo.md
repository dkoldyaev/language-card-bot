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
- [x] **Answer Submission API (`/api/v1/quiz/answer`)**: Implement an endpoint that receives the user's text suggestion, evaluates it using the Evaluation Utility, and sends a Mercure event with the evaluation result. (Изменение: отправка emoji отключена, решается на клиенте).

### Cleanup & Navigation
- [ ] **Quiz Cleanup Background Task**: (Отменено, не нужно делать, решается на клиенте).
- [x] **Next Card API (`/api/v1/quiz/next_card`)**: Implement an endpoint that resets the quiz state flags (`showVariants`, `showDefinitionTranslation`), calls the Quiz Generation Service to select a *new word*, updates the state, and sends the new card via a Mercure event.
- [x] **Next Definition API (`/api/v1/quiz/next_definition`)**: Implement an endpoint that resets the quiz state flags, selects a *different random definition* for the *currently active word*, updates the state, and sends the updated card via a Mercure event.

## Pending Tasks (PWA Integration)

### Core Data & Hydration
- [x] **Dictionary Fetch API (`GET /api/v1/dictionary`)**: Implement an endpoint to return the user's entire dictionary (all words, definitions, and translations) so the web app can render the "Edit dictionary" view without relying on chat messages.
- [x] **Quiz State Hydration (Enrichment)**: Update the `POST /api/v1/state/sync` endpoint so that when returning the `QUIZ` state, it includes the actual text of the current word and definition (instead of just their IDs), allowing the frontend to immediately render the card upon reload.
- [x] **Session Validation API (`GET /api/v1/auth/me`)**: Implement a simple endpoint that takes the JWT token from the Authorization header and returns the current user's profile (`id`, `username`) to easily re-validate sessions in the browser.

## Pending Tasks (Frontend - React + Zustand + Material-UI)

### 1. Foundation & Routing
- [x] **React App Initialization**: Set up a new React project (e.g., using Vite) with TypeScript in a `frontend` directory.
- [x] **Material-UI Setup**: Install and configure `@mui/material`, `@emotion/react`, `@emotion/styled`. Set up a custom theme with visually appealing defaults (dark/light mode support if needed).
- [x] **Routing Implementation**: Install `react-router-dom` and configure routing for main pages: `/settings`, `/dictionary/add`, `/dictionary/edit`, `/quiz`, and a default `/` Welcome page.
- [x] **Base Layout Component**: Create a main layout component (e.g., Navigation bar or Drawer, Main content area) to wrap all pages and handle simple mode switching.

### 2. State Management & API Services
- [x] **Zustand Store - Global & Auth**: Create a Zustand store to handle authentication (JWT token), user profile (`/api/v1/auth/me`), and global application state.
- [x] **API Client Service**: Implement an Axios (or fetch) wrapper configured with the base API URL and an interceptor to automatically attach the Authorization token.
- [x] **Mercure Event Listener Setup**: Create a React hook or service to connect to the Mercure Hub, listen to server-sent events, and dispatch updates to the Zustand store.
- [x] **State Sync Hydration**: Implement a call to `POST /api/v1/state/sync` on app load/login to hydrate the Zustand store with the initial state (including Quiz state).

### 3. Settings Mode (`/settings`)
- [x] **Settings UI Components**: Create Material-UI forms/selects for setting "Base Language", "Learned Language", and "Level".
- [x] **Settings API Integration**: Connect the settings form to the `/api/v1/settings` endpoint to save user preferences, updating the Zustand store on success.

### 4. Dictionary: Add Word (`/dictionary/add`)
- [x] **Add Word UI Component**: Create a multiline text area (Material-UI TextField) for users to input multiple words (one per line) and a submit button.
- [x] **Add Word Submission API**: Connect the submit button to the `/api/v1/add_word` endpoint.
- [x] **Word Processing Real-time Status**: Implement a UI component (e.g., a List) that displays the words being processed and updates their status in real-time based on Mercure events stored in Zustand.

### 5. Dictionary: Edit Dictionary (`/dictionary/edit`)
- [x] **Dictionary Fetch API & Store**: Implement the call to `GET /api/v1/dictionary` on page load and store the entire dictionary data in Zustand.
- [x] **Dictionary List View**: Create a Material-UI component (e.g., Accordion or List) to display all words with their definitions and translations.
- [ ] **Delete Word Logic**: Implement a "Delete" button with a confirmation dialog for each word, triggering the `/api/v1/word_delete` endpoint.
- [ ] **Definition Editing UI & API**: Implement inline editing (or a dialog) for definition texts and translations, connecting them to `/api/v1/definition_edit` and `/api/v1/definition_translate_edit`.
- [ ] **Definition Add/Delete Logic**: Implement UI and actions to add a new definition (`/api/v1/definition_add`) or delete an existing one (`/api/v1/definition_delete`).

### 6. Quiz Mode (`/quiz`)
- [ ] **Quiz Start & Card UI**: Create the main Quiz view with a "Start Quiz" button (`/api/v1/quiz/start`). Create a Card component to display the current word/definition based on the Quiz state in Zustand.
- [ ] **Quiz Suggestion Input**: Add a TextField for the user to type their answer (suggestion) and a submit button. Connect to `/api/v1/quiz/answer` and display the result emoji/message (Success, Sad, Close Match).
- [ ] **Quiz Card Controls**: Add buttons for "Translate definition" (`/api/v1/quiz/translate_definition`), "Another definition" (`/api/v1/quiz/next_definition`), and "Show variants" (`/api/v1/quiz/variants`).
- [ ] **Quiz Variants Display**: Implement UI to display the 5 wrong variants when "Show variants" is active. Allow clicking a variant to submit it.
- [ ] **Quiz Next Card Logic**: Implement a "Next card" button connected to `/api/v1/quiz/next_card` to proceed to the next word.
