# Process Log — English Card Bot 2

Журнал прогресса разработки скелета приложения.

---

## 2026-06-03 — Сессия 1: Скелет монорепозитория

### Что сделано

Собран скелет всего приложения. Все внешние сервисы (переводы, словари, Telegram API, БД) заменены mock-заглушками.

#### Структура проекта

```
english-card-bot-2/
├── package.json                    # npm workspaces root
├── tsconfig.json                   # общий TypeScript config
├── process.md                      # этот файл
└── packages/
    ├── shared/                     # ✅ Общие типы и контракты
    │   └── src/index.ts
    ├── broker-mock/                # ✅ In-process EventEmitter broker
    │   └── src/index.ts
    ├── core-service/               # ✅ Центральный оркестратор
    │   └── src/
    │       ├── index.ts            # точка входа + Express :3001
    │       ├── repositories/
    │       │   ├── UserRepository.ts
    │       │   └── WordRepository.ts
    │       ├── services/
    │       │   └── WordEnrichmentOrchestrator.ts
    │       └── api/
    │           └── router.ts       # HTTP REST API
    ├── translation-service/        # ✅ Mock перевод слов и определений
    │   └── src/index.ts
    ├── definitions-service/        # ✅ Mock загрузка определений
    │   └── src/index.ts
    └── telegram-bot/               # ✅ Bot FSM + mock Telegram client
        └── src/
            ├── index.ts            # точка входа + demo-сценарий
            ├── BotFSM.ts           # конечный автомат диалога
            ├── CoreServiceAdapter.ts
            └── MockTelegramClient.ts
```

#### Ключевые интерфейсы

| Интерфейс | Файл | Назначение |
|-----------|------|------------|
| `IBroker` | `shared/src/index.ts` | Контракт брокера (publish/subscribe) |
| `ICoreServiceAdapter` | `telegram-bot/src/CoreServiceAdapter.ts` | Контракт взаимодействия бота с core |
| `EventTopics` | `shared/src/index.ts` | Реестр имён событий |
| `DialogState` | `shared/src/index.ts` | FSM состояния диалога |

#### Event flow (enrichment pipeline)

```
addWord()
  → broker.publish(word.translate.requested)
  → broker.publish(word.definitions.requested)
      ↓                          ↓
translation-service        definitions-service
      ↓                          ↓
word.translate.completed   word.definitions.completed
      ↓                          ↓
core: save translation     core: save defs
                                 ↓
                     broker.publish(definition.translate.requested) × N
                                 ↓
                         translation-service × N
                                 ↓
                     definition.translate.completed × N
                                 ↓
                         core: save def translation
                                 ↓
                     onWordStatusUpdate() → notify bot
```

### Моки (подлежат замене)

| Мок | Где | Что заменить |
|-----|-----|--------------|
| `MockBroker` | `broker-mock/src/index.ts` | RabbitMQ / NATS |
| `mockTranslate()` | `translation-service/src/index.ts` | DeepL / Google Translate |
| `mockGetDefinitions()` | `definitions-service/src/index.ts` | Merriam-Webster / Oxford API |
| `MockTelegramClient` | `telegram-bot/src/MockTelegramClient.ts` | grammy / telegraf |
| In-memory репозитории | `core-service/src/repositories/` | PostgreSQL / TypeORM |
| `DirectCoreServiceAdapter` | `telegram-bot/src/CoreServiceAdapter.ts` | HTTP клиент (axios) |

### Следующие шаги

- [ ] `npm install` + `npm run dev` — проверка запуска
- [ ] Подключить реальный Telegram Bot token (grammy)
- [ ] Добавить реальную БД (PostgreSQL + TypeORM / Prisma)
- [ ] Подключить RabbitMQ вместо MockBroker
- [ ] Реализовать Translation Service (DeepL API)
- [ ] Реализовать Definitions Service (Free Dictionary API / Merriam-Webster)
- [ ] Auth Service
- [ ] Quiz / тренировка (SRS алгоритм)
- [ ] PWA frontend

---

_Следующая запись будет добавлена при следующей сессии разработки._

---

## 2026-06-03 — Сессия 2: REST API + Scalar документация

Добавлен `packages/rest-api` — HTTP REST-интерфейс с OpenAPI 3.1 документацией через **Scalar**.

### Новые файлы
- `packages/rest-api/src/index.ts` — Express + Scalar + CORS
- `packages/rest-api/src/router.ts` — REST эндпоинты /api/*
- `packages/rest-api/src/openapi.ts` — OpenAPI 3.1 спецификация

### Эндпоинты (порт 3002)
- `GET /api/health`
- `POST /api/users/telegram/:id` — найти/создать пользователя
- `GET/PUT /api/users/:id/settings`
- `GET/POST /api/users/:id/words` — словарь + обогащение
- `DELETE /api/users/:id/words/:wid`
- `PUT /api/users/:id/words/:wid/definitions/:did`
- `GET /docs` — Scalar UI
- `GET /openapi.json` — спецификация

### Запуск
```bash
npm run dev:rest   # REST API на :3002
```

### Smoke test результат
Полный pipeline: `POST /words` → broker → translation/definitions mocks → `status: ready` ✅

---

## 2026-06-08 — Сессия 3: Полноценная реализация REST API

### Что сделано

REST API из монолитного роутера переработан в модульную структуру с валидацией, типизированными ошибками и расширенными эндпоинтами.

### Новые файлы

```
packages/rest-api/src/
├── validation.ts              # Zod-схемы для всех запросов
├── middleware/
│   └── errors.ts              # AppError, NotFoundError, ConflictError, asyncHandler, errorHandler
└── routes/
    ├── users.ts               # GET/POST /users/telegram/:id, GET /users/:id
    ├── settings.ts            # GET/PUT /users/:id/settings
    └── words.ts               # Полный CRUD слов + batch + определения
```

### Изменения в существующих файлах

- `router.ts` — теперь композитный, собирает доменные роутеры
- `index.ts` — добавлен request logger, 404-catch-all, errorHandler последним
- `openapi.ts` — v0.2.0: добавлены новые эндпоинты, PaginatedWords, BatchWordResult, ValidationError схемы

### Новые эндпоинты

| Метод | Путь | Что нового |
|-------|------|------------|
| `GET` | `/api/users/telegram/:id` | Найти (без создания) |
| `GET` | `/api/users/:id` | Получить пользователя |
| `GET` | `/api/users/:id/words?limit&offset&status&search` | Пагинация + фильтр + поиск |
| `GET` | `/api/users/:id/words/:wordId` | Слово по ID |
| `POST` | `/api/users/:id/words/batch` | Пакетное добавление (до 50 слов) |

### Middleware стек (index.ts)

1. JSON парсинг
2. CORS
3. Request logger
4. Роутеры
5. 404 catch-all
6. Central errorHandler

### Формат ошибок

```json
// 400 Validation Error
{ "error": "Ошибка валидации запроса", "details": [{ "path": "text", "message": "..." }] }

// 409 Conflict
{ "error": "Слово 'apple' уже есть в словаре", "existing": { ...Word } }

// 404
{ "error": "Слово '...' не найден" }
```

### Тесты

23/24 автоматических тестов прошли ✅ (1 — артефакт тест-фреймворка: `json.loads("")` при 204).
DELETE 204 → GET 404 подтверждён отдельно.
