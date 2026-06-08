# Документация по unit-тестам

## Обзор

Проект покрыт **92 unit-тестами** в 4 файлах, использующих [Vitest](https://vitest.dev/) + [Supertest](https://github.com/ladjs/supertest).

```
Test Files  4 passed (4)
     Tests  92 passed (92)
  Duration  ~300ms
```

---

## Как запускать

| Команда | Описание |
|---|---|
| `npm test` | Одноразовый запуск (CI-режим) |
| `npm run test:watch` | Watch-режим — тесты перезапускаются при изменении файлов |
| `npm run test:coverage` | Запуск с отчётом покрытия (HTML в `coverage/`) |

---

## Архитектура тестов

```
packages/core-service/src/__tests__/
├── WordRepository.test.ts          # 28 тестов
├── UserRepository.test.ts          # 25 тестов
├── WordEnrichmentOrchestrator.test.ts # 18 тестов
└── router.test.ts                  # 28 тестов (HTTP API)
```

### Ключевые решения

**Изолированный SyncMockBroker** — в тестах оркестратора используется синхронный брокер (без `setImmediate`), что позволяет проверять последствия событий сразу после `broker.publish()` без `await` или таймеров.

**NoopBroker** — в тестах роутера брокер ничего не делает, чтобы `orchestrator.enrich()` не порождал побочных эффектов, и тесты оставались изолированными.

**`beforeEach` + новые экземпляры** — каждый тест создаёт свежие репозитории и брокер, тесты не влияют друг на друга.

---

## Описание тест-файлов

### `WordRepository.test.ts` — 28 тестов

Тестирует in-memory хранилище слов.

| Группа | Тест-кейсы |
|---|---|
| `create()` | создаёт слово со статусом Pending; обрезает пробелы; выдаёт уникальные UUID |
| `findById()` | находит по ID; возвращает undefined для несуществующего |
| `findByUserId()` | фильтрует по userId; возвращает пустой массив |
| `findByUserIdAndText()` | нечувствительность к регистру; обрезка пробелов; изоляция по userId |
| `updateTranslation()` | обновляет перевод и `translationStatus`; статус Processing без определений; ошибка при bad ID |
| `addDefinitions()` | добавляет N определений; каждое получает UUID и статус Pending |
| `updateDefinitionTranslation()` | обновляет перевод определения; статус Ready когда всё готово; ошибка при bad defId |
| `updateDefinitionText()` | обновляет текст; ошибка при bad defId |
| `delete()` | удаляет из хранилища; не бросает ошибку при несуществующем ID |
| `_recalculateStatus` | Processing если перевод готов, но нет определений; Processing если определения есть, но перевод нет; Ready когда всё готово; Processing если одно из нескольких определений не готово |

---

### `UserRepository.test.ts` — 25 тестов

Тестирует in-memory хранилище пользователей с индексом по `telegramId` и FSM-состояниями.

| Группа | Тест-кейсы |
|---|---|
| `create()` | дефолтные настройки (ru/en/A1); сохраняет telegramId; создаёт без telegramId; уникальные UUID; копирует настройки (не ссылку) |
| `findById()` | находит; undefined для unknown |
| `findByTelegramId()` | находит через индекс; undefined для unknown |
| `findOrCreateByTelegramId()` | создаёт при первом вызове; идемпотентен; не создаёт дублей |
| `updateSettings()` | частичный patch; полное обновление 3 полей; ошибка при bad userId |
| `getDialogState()` / `setDialogState()` | дефолт WELCOME; сохраняет состояние; изоляция между пользователями |
| `getDialogContext()` / `setDialogContext()` | дефолт `{}`; сохраняет контекст; перезаписывает при повторе |
| `list()` | возвращает всех; пустой массив |

---

### `WordEnrichmentOrchestrator.test.ts` — 18 тестов

Тестирует асинхронный оркестратор обогащения слов.

> Используется `SyncMockBroker` — синхронный in-test брокер, доставляющий события мгновенно.

| Группа | Тест-кейсы |
|---|---|
| `enrich()` | публикует `WORD_TRANSLATE_REQUESTED` и `WORD_DEFINITIONS_REQUESTED`; событие содержит корректные поля; не публикует если пользователь не найден |
| `WORD_TRANSLATE_COMPLETED` | обновляет перевод в репозитории; вызывает коллбек `onWordStatusUpdate` |
| `WORD_DEFINITIONS_COMPLETED` | добавляет определения; публикует `DEFINITION_TRANSLATE_REQUESTED` для каждого; событие содержит корректные поля; не обрабатывает если слово не найдено; вызывает коллбек |
| `DEFINITION_TRANSLATE_COMPLETED` | обновляет перевод определения; вызывает коллбек |
| `onWordStatusUpdate()` | несколько коллбеков вызываются все; ошибка в одном не ломает другие |

---

### `router.test.ts` — 28 тестов (HTTP API)

Тестирует Express-роутер через реальные HTTP-запросы с помощью Supertest.

> Используется `NoopBroker` — брокер-заглушка, чтобы `enrich()` не вызывал побочных эффектов.

| Эндпоинт | HTTP-коды | Тест-кейсы |
|---|---|---|
| `GET /health` | 200 | статус ok, поле service, поле ts |
| `GET /users/:userId/settings` | 200, 404 | возвращает настройки; 404 если не найден |
| `PUT /users/:userId/settings` | 200, 400, 404 | обновляет настройки; 400 при невалидном language/level; 404 если не найден |
| `GET /users/:userId/words` | 200, 404 | пустой массив; список слов; 404 если не найден |
| `POST /users/:userId/words` | 201, 400, 404, 409 | создаёт слово; 400 если text пустой/отсутствует; 404 если не найден; 409 при дубликате; дедупликация без учёта регистра |
| `DELETE /users/:userId/words/:wordId` | 204, 404 | удаляет; 404 при bad id; 404 если чужое слово |
| `PUT /users/:userId/words/:wordId/definitions/:defId` | 200, 404 | обновляет текст; обновляет перевод; 404 если слово не найдено; 404 если def не найден |
| `POST /users/telegram/:telegramId` | 200 | создаёт пользователя; идемпотентен |
| `GET /users/telegram/:telegramId` | 200, 404 | находит по telegramId; 404 если не зарегистрирован |

---

## Конфигурация

### `vitest.config.ts`

```typescript
defineConfig({
  plugins: [tsconfigPaths()],   // резолвит @ecb/shared и @ecb/broker-mock через tsconfig paths
  test: {
    globals: true,              // describe/it/expect доступны без импорта
    environment: 'node',
    include: ['packages/**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
})
```

### Зависимости

```json
"vitest": "^2.0.0",
"@vitest/coverage-v8": "^2.0.0",
"supertest": "^7.0.0",
"@types/supertest": "^6.0.2",
"vite-tsconfig-paths": "^5.0.0"
```
