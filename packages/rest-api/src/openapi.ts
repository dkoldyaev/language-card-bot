/**
 * OpenAPI 3.1 спецификация для REST API клиента.
 *
 * Этот объект является единым источником правды:
 *  - Scalar использует его для рендера документации
 *  - Маршруты Express соответствуют путям здесь
 *
 * TODO: Рассмотреть генерацию типов из этой спецификации (openapi-typescript).
 */
export const openApiSpec = {
  openapi: '3.1.0',

  info: {
    title: 'English Card Bot — REST API',
    version: '0.3.0',
    description: `
## English Card Bot REST API

Внешний REST-интерфейс для управления словарём, настройками и квизом.

### Архитектура
API-клиент подключается к **Core Service**.
В dev-режиме все внешние зависимости заменены mock-заглушками.

### Особенности
- Ошибки валидации **400** с \`details\` (\`[{path, message}]\`)
- Конфликты **409** с \`existing\`
- Список слов: envelope \`{data, meta: {total, limit, offset, hasMore}}\`
- Batch: **207 Multi-Status**
- Quiz: stateful сессия по userId

### Текущее состояние
🚧 Skeleton — моки, без реальной БД и авторизации.
    `.trim(),
    contact: { name: 'English Card Bot' },
  },

  servers: [
    { url: 'http://localhost:3002', description: 'Development (mock)' },
  ],

  tags: [
    { name: 'health', description: 'Служебные эндпоинты' },
    { name: 'users', description: 'Управление пользователями' },
    { name: 'settings', description: 'Настройки пользователя (язык, уровень)' },
    { name: 'words', description: 'Словарь пользователя' },
    { name: 'definitions', description: 'Определения и переводы' },
    { name: 'quiz', description: 'Квиз-режим: угадай слово по определению' },
  ],

  components: {
    schemas: {
      Language: {
        type: 'string',
        enum: ['ru', 'en', 'es', 'de', 'fr'],
        description: 'Код языка (ISO 639-1)',
        example: 'en',
      },
      CefrLevel: {
        type: 'string',
        enum: ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
        description: 'Уровень владения языком (CEFR)',
        example: 'B1',
      },
      WordStatus: {
        type: 'string',
        enum: ['pending', 'processing', 'ready', 'error'],
        description: 'Статус обработки слова',
      },
      UserSettings: {
        type: 'object',
        required: ['baseLanguage', 'learnedLanguage', 'level'],
        properties: {
          baseLanguage: { $ref: '#/components/schemas/Language' },
          learnedLanguage: { $ref: '#/components/schemas/Language' },
          level: { $ref: '#/components/schemas/CefrLevel' },
        },
        example: { baseLanguage: 'ru', learnedLanguage: 'en', level: 'B1' },
      },
      User: {
        type: 'object',
        required: ['id', 'settings', 'createdAt'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          telegramId: { type: 'string', nullable: true },
          settings: { $ref: '#/components/schemas/UserSettings' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Definition: {
        type: 'object',
        required: ['id', 'text', 'translation', 'translationStatus'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          text: { type: 'string', description: 'Определение на изучаемом языке' },
          translation: { type: 'string', description: 'Перевод определения' },
          translationStatus: { $ref: '#/components/schemas/WordStatus' },
        },
      },
      Word: {
        type: 'object',
        required: ['id', 'userId', 'text', 'translation', 'status', 'definitions', 'createdAt'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          text: { type: 'string', example: 'ephemeral' },
          translation: { type: 'string', example: '[MOCK:en→ru] ephemeral' },
          translationStatus: { $ref: '#/components/schemas/WordStatus' },
          definitions: { type: 'array', items: { $ref: '#/components/schemas/Definition' } },
          status: { $ref: '#/components/schemas/WordStatus' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      PaginatedWords: {
        type: 'object',
        required: ['data', 'meta'],
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/Word' } },
          meta: {
            type: 'object',
            required: ['total', 'limit', 'offset', 'hasMore'],
            properties: {
              total: { type: 'integer', description: 'Общее количество слов (с учётом фильтров)' },
              limit: { type: 'integer' },
              offset: { type: 'integer' },
              hasMore: { type: 'boolean' },
            },
          },
        },
      },
      BatchWordResult: {
        type: 'object',
        required: ['text', 'word', 'duplicate'],
        properties: {
          text: { type: 'string' },
          word: { $ref: '#/components/schemas/Word' },
          duplicate: { type: 'boolean', description: 'true если слово уже было в словаре' },
        },
      },
      ValidationError: {
        type: 'object',
        required: ['error', 'details'],
        properties: {
          error: { type: 'string', example: 'Ошибка валидации запроса' },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                path: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: { type: 'string' },
        },
        example: { error: 'Пользователь не найден' },
      },

      // ── Quiz schemas ──────────────────────────────────────────────────────────

      QuizCard: {
        type: 'object',
        required: ['sessionId', 'wordId', 'definitionId', 'definitionText', 'definitionTranslation', 'variants', 'streak'],
        properties: {
          sessionId: { type: 'string', description: 'ID сессии (= userId)' },
          wordId: { type: 'string', description: 'ID загаданного слова' },
          definitionId: { type: 'string', description: 'ID показываемого определения' },
          definitionText: { type: 'string', example: 'A round fruit typically red or green.', description: 'Текст определения' },
          definitionTranslation: {
            type: 'string',
            nullable: true,
            description: 'Перевод определения — null пока не нажата кнопка translate_definition',
          },
          variants: {
            type: 'array',
            items: { type: 'string' },
            nullable: true,
            description: 'Варианты ответа (null пока не нажата show_variants)',
          },
          streak: { type: 'integer', description: 'Количество правильных ответов за сессию', example: 3 },
        },
      },

      QuizAnswerResult: {
        type: 'object',
        required: ['verdict', 'correctWord', 'nextCard', 'streak'],
        properties: {
          verdict: {
            type: 'string',
            enum: ['correct', 'close', 'wrong'],
            description: 'correct — правильно, close — близко (опечатка), wrong — неверно',
          },
          correctWord: { type: 'string', description: 'Правильный ответ', example: 'serendipity' },
          nextCard: {
            oneOf: [{ $ref: '#/components/schemas/QuizCard' }, { type: 'null' }],
            description: 'Следующая карточка (не null только при verdict=correct)',
          },
          streak: { type: 'integer', description: 'Обновлённый streak' },
        },
      },
    },

    parameters: {
      userId: {
        name: 'userId',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
        description: 'Идентификатор пользователя',
      },
      wordId: {
        name: 'wordId',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
        description: 'Идентификатор слова',
      },
      defId: {
        name: 'defId',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
        description: 'Идентификатор определения',
      },
      limit: {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
        description: 'Количество записей на странице',
      },
      offset: {
        name: 'offset',
        in: 'query',
        schema: { type: 'integer', minimum: 0, default: 0 },
        description: 'Сдвиг от начала выборки',
      },
      statusFilter: {
        name: 'status',
        in: 'query',
        schema: { type: 'string', enum: ['pending', 'processing', 'ready', 'error'] },
        description: 'Фильтр по статусу обработки слова',
      },
      searchFilter: {
        name: 'search',
        in: 'query',
        schema: { type: 'string', maxLength: 100 },
        description: 'Поиск по тексту слова или переводу (substring, case-insensitive)',
      },
    },

    responses: {
      NotFound: {
        description: 'Ресурс не найден',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      BadRequest: {
        description: 'Ошибка валидации',
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ValidationError' } },
        },
      },
      Conflict: {
        description: 'Конфликт — ресурс уже существует',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
    },
  },

  paths: {
    '/api/health': {
      get: {
        tags: ['health'],
        summary: 'Health check',
        operationId: 'healthCheck',
        responses: {
          '200': {
            description: 'Сервис работает',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    service: { type: 'string', example: 'rest-api' },
                    ts: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/users/telegram/{telegramId}': {
      get: {
        tags: ['users'],
        summary: 'Найти пользователя по Telegram ID',
        operationId: 'findUserByTelegram',
        parameters: [
          { name: 'telegramId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Пользователь найден',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      post: {
        tags: ['users'],
        summary: 'Найти или создать пользователя по Telegram ID',
        description: 'Идемпотентно: если пользователь существует — возвращает его, иначе создаёт с настройками по умолчанию.',
        operationId: 'findOrCreateUserByTelegram',
        parameters: [
          { name: 'telegramId', in: 'path', required: true, schema: { type: 'string' }, example: '123456789' },
        ],
        responses: {
          '200': {
            description: 'Пользователь найден или создан',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
        },
      },
    },

    '/api/users/{userId}': {
      get: {
        tags: ['users'],
        summary: 'Получить пользователя по ID',
        operationId: 'getUserById',
        parameters: [{ $ref: '#/components/parameters/userId' }],
        responses: {
          '200': {
            description: 'Пользователь',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/users/{userId}/settings': {
      get: {
        tags: ['settings'],
        summary: 'Получить настройки пользователя',
        operationId: 'getSettings',
        parameters: [{ $ref: '#/components/parameters/userId' }],
        responses: {
          '200': {
            description: 'Настройки',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/UserSettings' } } },
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['settings'],
        summary: 'Обновить настройки пользователя',
        description: 'Частичное обновление. Необходимо передать хотя бы одно поле.',
        operationId: 'updateSettings',
        parameters: [{ $ref: '#/components/parameters/userId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  baseLanguage: { $ref: '#/components/schemas/Language' },
                  learnedLanguage: { $ref: '#/components/schemas/Language' },
                  level: { $ref: '#/components/schemas/CefrLevel' },
                },
              },
              examples: {
                changeLanguage: { summary: 'Сменить изучаемый язык', value: { learnedLanguage: 'en' } },
                changeLevel: { summary: 'Повысить уровень', value: { level: 'B2' } },
                full: { summary: 'Полное обновление', value: { baseLanguage: 'ru', learnedLanguage: 'en', level: 'B1' } },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Обновлённые настройки',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/UserSettings' } } },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/users/{userId}/words': {
      get: {
        tags: ['words'],
        summary: 'Получить словарь пользователя',
        description: 'Поддерживает пагинацию, фильтрацию по статусу и поиск по тексту/переводу.',
        operationId: 'getWords',
        parameters: [
          { $ref: '#/components/parameters/userId' },
          { $ref: '#/components/parameters/limit' },
          { $ref: '#/components/parameters/offset' },
          { $ref: '#/components/parameters/statusFilter' },
          { $ref: '#/components/parameters/searchFilter' },
        ],
        responses: {
          '200': {
            description: 'Список слов с метаданными пагинации',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedWords' } } },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      post: {
        tags: ['words'],
        summary: 'Добавить слово в словарь',
        description: 'Запускает асинхронное обогащение: перевод → определения → переводы определений. Ответ приходит немедленно со статусом `pending`.',
        operationId: 'addWord',
        parameters: [{ $ref: '#/components/parameters/userId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['text'],
                properties: { text: { type: 'string', example: 'serendipity' } },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Слово добавлено',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Word' } } },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
          '409': {
            description: 'Слово уже существует в словаре',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { type: 'string' },
                    existing: { $ref: '#/components/schemas/Word' },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/users/{userId}/words/batch': {
      post: {
        tags: ['words'],
        summary: 'Пакетное добавление слов',
        description: 'Добавляет несколько слов за один запрос. Возвращает 207 Multi-Status с результатом по каждому слову. Дубликаты не вызывают ошибку — помечаются `duplicate: true`.',
        operationId: 'addWordsBatch',
        parameters: [{ $ref: '#/components/parameters/userId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['words'],
                properties: {
                  words: {
                    type: 'array',
                    items: { type: 'string' },
                    minItems: 1,
                    maxItems: 50,
                    example: ['apple', 'banana', 'cherry'],
                  },
                },
              },
            },
          },
        },
        responses: {
          '207': {
            description: 'Multi-Status — результат по каждому слову',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    results: { type: 'array', items: { $ref: '#/components/schemas/BatchWordResult' } },
                    summary: {
                      type: 'object',
                      properties: {
                        total: { type: 'integer' },
                        created: { type: 'integer' },
                        duplicates: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/users/{userId}/words/{wordId}': {
      get: {
        tags: ['words'],
        summary: 'Получить слово по ID',
        operationId: 'getWordById',
        parameters: [
          { $ref: '#/components/parameters/userId' },
          { $ref: '#/components/parameters/wordId' },
        ],
        responses: {
          '200': {
            description: 'Слово с определениями',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Word' } } },
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['words'],
        summary: 'Удалить слово',
        operationId: 'deleteWord',
        parameters: [
          { $ref: '#/components/parameters/userId' },
          { $ref: '#/components/parameters/wordId' },
        ],
        responses: {
          '204': { description: 'Слово удалено' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/users/{userId}/words/{wordId}/definitions/{defId}': {
      put: {
        tags: ['definitions'],
        summary: 'Редактировать определение',
        description: 'Обновляет текст определения и/или перевод. Необходимо передать хотя бы одно поле.',
        operationId: 'updateDefinition',
        parameters: [
          { $ref: '#/components/parameters/userId' },
          { $ref: '#/components/parameters/wordId' },
          { $ref: '#/components/parameters/defId' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  text: { type: 'string', maxLength: 2000, description: 'Новый текст определения' },
                  translation: { type: 'string', maxLength: 2000, description: 'Новый перевод' },
                },
              },
              examples: {
                updateText: { summary: 'Изменить текст', value: { text: 'A fruit that grows on trees.' } },
                updateTranslation: { summary: 'Изменить перевод', value: { translation: 'Фрукт, растущий на деревьях.' } },
                updateBoth: { summary: 'Изменить оба поля', value: { text: 'A round fruit.', translation: 'Круглый фрукт.' } },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Слово с обновлённым определением',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Word' } } },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ──────────────────────────────────────────────────────────────────────────────
    // Quiz
    // ──────────────────────────────────────────────────────────────────────────────

    '/api/users/{userId}/quiz/start': {
      post: {
        tags: ['quiz'],
        summary: 'Начать квиз',
        description: 'Создаёт сессию и возвращает первую карточку. Перезапуск обнуляет streak.',
        operationId: 'quizStart',
        parameters: [{ $ref: '#/components/parameters/userId' }],
        responses: {
          '200': {
            description: 'Первая карточка',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/QuizCard' } } },
          },
          '404': {
            description: 'Нет слов с определениями — невозможно запустить квиз',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },

    '/api/users/{userId}/quiz/card': {
      get: {
        tags: ['quiz'],
        summary: 'Текущая карточка',
        description: 'Возвращает текущую карточку без изменения состояния. 404 если сессии нет — вызовите POST /start.',
        operationId: 'quizCurrentCard',
        parameters: [{ $ref: '#/components/parameters/userId' }],
        responses: {
          '200': {
            description: 'Текущая карточка',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/QuizCard' } } },
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/users/{userId}/quiz/answer': {
      post: {
        tags: ['quiz'],
        summary: 'Ответить на квиз-вопрос',
        description: `Проверяет ответ пользователя.

**Verdict:**
- \`correct\` — точное совпадение → streak++, клиент показывает emoji «успех» 2 сек. и удаляет, nextCard = следующая карточка
- \`close\` — опечатка (Levenshtein ≤ 2, длина > 4) → остаёмся на карточке; клиент показывает emoji «почти» 2 сек. и удаляет; \`variants\` не меняются
- \`wrong\` — неверно → остаёмся на карточке; клиент показывает emoji «неверно» 2 сек. и удаляет; \`variants\` не меняются

> Чтобы показать варианты ответа — отдельно вызовите **POST /quiz/action** с \`action: show_variants\``,

        operationId: 'quizAnswer',
        parameters: [{ $ref: '#/components/parameters/userId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['suggestion'],
                properties: { suggestion: { type: 'string', example: 'serendipity' } },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Результат проверки',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/QuizAnswerResult' } } },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/users/{userId}/quiz/action': {
      post: {
        tags: ['quiz'],
        summary: 'Действие на карточке',
        description: `Обработка действий UI:

| action | Что делает |
|--------|--------|
| \`show_variants\` | Генерирует 5 дистракторов + правильный |
| \`translate_definition\` | Открывает \`definitionTranslation\` |
| \`another_card\` | Следующее случайное слово |
| \`another_definition\` | Другое определение того же слова |`,
        operationId: 'quizAction',
        parameters: [{ $ref: '#/components/parameters/userId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['action'],
                properties: {
                  action: {
                    type: 'string',
                    enum: ['show_variants', 'translate_definition', 'another_card', 'another_definition'],
                  },
                },
              },
              examples: {
                showVariants: { summary: 'Показать варианты', value: { action: 'show_variants' } },
                translate: { summary: 'Перевести определение', value: { action: 'translate_definition' } },
                skip: { summary: 'Следующее слово', value: { action: 'another_card' } },
                anotherDef: { summary: 'Другое определение', value: { action: 'another_definition' } },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Обновлённая карточка',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/QuizCard' } } },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
  },
} satisfies Record<string, unknown>;
