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
    version: '0.1.0',
    description: `
## English Card Bot REST API

Внешний REST-интерфейс для управления словарём и настройками пользователя.

Используется как альтернативный клиент наряду с Telegram Bot.

### Архитектура
API-клиент подключается к **Core Service** через \`ICoreServiceAdapter\`.
В dev-режиме все внешние зависимости заменены mock-заглушками.

### Текущее состояние
🚧 Skeleton — моки, без реальной БД и авторизации.
    `.trim(),
    contact: {
      name: 'English Card Bot',
    },
  },

  servers: [
    {
      url: 'http://localhost:3002',
      description: 'Development (mock)',
    },
  ],

  tags: [
    { name: 'health', description: 'Служебные эндпоинты' },
    { name: 'users', description: 'Управление пользователями' },
    { name: 'settings', description: 'Настройки пользователя (язык, уровень)' },
    { name: 'words', description: 'Словарь пользователя' },
    { name: 'definitions', description: 'Определения и переводы' },
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // Reusable components
  // ─────────────────────────────────────────────────────────────────────────
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
        example: {
          baseLanguage: 'ru',
          learnedLanguage: 'en',
          level: 'B1',
        },
      },
      User: {
        type: 'object',
        required: ['id', 'settings', 'createdAt'],
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Внутренний идентификатор' },
          telegramId: { type: 'string', description: 'Telegram user ID (если есть)', nullable: true },
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
          text: { type: 'string', description: 'Слово на изучаемом языке', example: 'apple' },
          translation: { type: 'string', description: 'Перевод слова', example: '[MOCK:en→ru] apple' },
          translationStatus: { $ref: '#/components/schemas/WordStatus' },
          definitions: {
            type: 'array',
            items: { $ref: '#/components/schemas/Definition' },
          },
          status: { $ref: '#/components/schemas/WordStatus' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: { type: 'string', description: 'Сообщение об ошибке' },
        },
        example: { error: 'User not found' },
      },
      AddWordRequest: {
        type: 'object',
        required: ['text'],
        properties: {
          text: { type: 'string', description: 'Слово для добавления', example: 'serendipity' },
        },
      },
      UpdateSettingsRequest: {
        type: 'object',
        properties: {
          baseLanguage: { $ref: '#/components/schemas/Language' },
          learnedLanguage: { $ref: '#/components/schemas/Language' },
          level: { $ref: '#/components/schemas/CefrLevel' },
        },
      },
      UpdateDefinitionRequest: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Новый текст определения' },
          translation: { type: 'string', description: 'Новый перевод определения' },
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
        example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
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
    },

    responses: {
      NotFound: {
        description: 'Ресурс не найден',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      BadRequest: {
        description: 'Некорректный запрос',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Paths
  // ─────────────────────────────────────────────────────────────────────────
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
      post: {
        tags: ['users'],
        summary: 'Найти или создать пользователя по Telegram ID',
        description:
          'Используется при первом входе через Telegram. Создаёт пользователя с настройками по умолчанию если не существует.',
        operationId: 'findOrCreateUserByTelegram',
        parameters: [
          {
            name: 'telegramId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Telegram User ID',
            example: '123456789',
          },
        ],
        responses: {
          '200': {
            description: 'Пользователь найден или создан',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
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
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/UserSettings' } },
            },
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['settings'],
        summary: 'Обновить настройки пользователя',
        description: 'Частичное обновление (PATCH-семантика). Передавайте только изменяемые поля.',
        operationId: 'updateSettings',
        parameters: [{ $ref: '#/components/parameters/userId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateSettingsRequest' },
              examples: {
                changeLanguage: {
                  summary: 'Сменить изучаемый язык',
                  value: { learnedLanguage: 'en' },
                },
                changeLevel: {
                  summary: 'Повысить уровень',
                  value: { level: 'B2' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Обновлённые настройки',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/UserSettings' } },
            },
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
        description: 'Возвращает все слова пользователя с их определениями и статусами обработки.',
        operationId: 'getWords',
        parameters: [{ $ref: '#/components/parameters/userId' }],
        responses: {
          '200': {
            description: 'Список слов',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Word' } },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      post: {
        tags: ['words'],
        summary: 'Добавить слово в словарь',
        description: `
Добавляет слово и запускает асинхронное обогащение:
1. Перевод слова (Translation Service)
2. Загрузка определений (Definitions Service)
3. Перевод каждого определения

Ответ возвращается немедленно со статусом \`pending\`.
Обогащение происходит в фоне.
        `.trim(),
        operationId: 'addWord',
        parameters: [{ $ref: '#/components/parameters/userId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AddWordRequest' },
              example: { text: 'serendipity' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Слово добавлено, обогащение запущено',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Word' } } },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
          '409': {
            description: 'Слово уже существует в словаре пользователя',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { type: 'string' },
                    word: { $ref: '#/components/schemas/Word' },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/users/{userId}/words/{wordId}': {
      delete: {
        tags: ['words'],
        summary: 'Удалить слово из словаря',
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
        description:
          'Обновляет текст определения и/или его перевод. Передавайте только изменяемые поля.',
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
              schema: { $ref: '#/components/schemas/UpdateDefinitionRequest' },
              examples: {
                updateText: {
                  summary: 'Изменить текст определения',
                  value: { text: 'A fruit that grows on trees.' },
                },
                updateTranslation: {
                  summary: 'Изменить перевод',
                  value: { translation: 'Фрукт, растущий на деревьях.' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Обновлённое слово с определениями',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Word' } } },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
  },
} satisfies Record<string, unknown>;
