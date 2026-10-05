# Ревизия покрытия тестами

Дата ревизии: 4 октября 2026. PWA/service worker намеренно исключены из оценки: это пока не в области текущей работы.

## Итог

Набор хорошо покрывает основную серверную предметную логику: auth, слова, определения, квизы, presets, dashboard и state sync имеют unit/API-тесты, а PostgreSQL/Redis/Mercure задействованы в интеграционных сценариях. Есть и ценные пользовательские потоки — регистрация, словари, preset и гостевой режим.

Покрытие пока нельзя считать надёжным для роутинга и realtime: часть browser E2E маскирует ошибки reload-ами, условными ветками и селекторами реализации; некоторые тесты не делают проверяемого действия вовсе. Нет метрик coverage, поэтому количественный процент заявлять нельзя.

## P0 — исправить тесты, которые не доказывают заявленное поведение

### 1. Unit-тест Mercure проверяет воздух

Проблема: [`useMercure.test.ts`](frontend/src/shared/api/useMercure.test.ts:33) только рендерит хук. Второй тест заканчивается `expect(true).toBe(true)`, а profile устанавливается без `mercureToken`, из-за чего эффект заканчивается до подключения в [`useMercure.ts`](frontend/src/shared/api/useMercure.ts:16). Кроме того, тест мокает `EventSource`, хотя реализация использует `fetchEventSource`.

Решение: мокировать `@microsoft/fetch-event-source`, задать profile и Mercure token, проверить topic, Authorization и отмену `AbortController` при unmount. Вызвать захваченный `onmessage` для каждого типа сообщения и проверить обновление store/DOM: `quiz_card`, оценка, варианты, перевод, state sync, dictionary processing/definitions/translation. Отдельно проверить невалидный JSON и reconnect/error без бесконечного старта квиза.

### 2. Проверка запрета presets не открывает защищённый URL

Проблема: тест утверждает, что ссылка Presets невидима, а затем пытается по ней кликнуть — [`presets.spec.ts`](frontend/tests/presets.spec.ts:19). Это не проверяет direct access и в зависимости от DOM либо падает до assert, либо проверяет не тот переход.

Решение: после проверки отсутствия пункта вызвать `page.goto('/en/presets')`, дождаться перенаправления на `'/en'` и убедиться, что каталог не виден. Дополнить API-проверкой, что обычный пользователь не может создать, изменить или удалить preset, даже если UI скрыт.

### 3. Условные ветки разрешают E2E пройти без действия

Проблема: в [`presets.spec.ts`](frontend/tests/presets.spec.ts:97) применение preset выполняется только если кнопка уже видима; в [`anonymous-access.spec.ts`](frontend/tests/anonymous-access.spec.ts:104) ни текстовый, ни вариантный ответ не обязателен. Оба сценария могут завершиться зелёными, не проверив заявленное поведение.

Решение: создать нужный preset через API/fixture конкретно для теста и безусловно нажать Apply. Для гостевого квиза заранее выбрать детерминированный режим ответа или разделить тесты на input и variants; в каждом после действия проверить результат попытки и доступное сообщение.

### 4. E2E скрывает realtime-регрессии перезагрузкой страницы

Проблема: словарь перезагружается внутри polling-цикла в [`dictionary.spec.ts`](frontend/tests/dictionary.spec.ts:30) и после редактирования в том же файле. Так тест может получить данные обычным API-запросом даже при неработающей доставке Mercure в браузер — именно такой дефект уже возникал.

Решение: отдельный browser E2E: добавить слово, не выполнять reload, дождаться появившегося placeholder-слова, затем определений и перевода. На уровне backend оставить проверку topic/payload, но ожидать конкретное SSE-сообщение вместо паузы. Так тест проверит весь путь publisher → hub → `useMercure` → интерфейс.

## P1 — критические пробелы и нестабильность

### 5. Нет контракта URL для выбранного словаря и пресета

Проблема: текущие сценарии переключают словари через UI ([`dictionary.spec.ts`](frontend/tests/dictionary.spec.ts:104)), но не утверждают конечный адрес с id, не проверяют reload/copy-link и не проверяют, что `new` или нечисловой id не открывает другой словарь. Locale-тесты ограничены корнем и auth-маршрутами ([`locale.spec.ts`](frontend/tests/locale.spec.ts:5)).

Решение: после клика по словарю проверить `/${locale}/dictionary/${id}`, обновить страницу и убедиться, что на ней тот же заголовок и слова. Аналогично проверить quiz и preset. Невалидный id должен давать безопасный not-found/redirect, а `/dictionary/new` не должен открывать страницу создания: создание происходит только через модальное действие в sidebar/selector.

### 6. SSE-тесты используют фиксированные паузы

Проблема: `setTimeout(500)` в [`quiz.e2e.test.ts`](base/src/e2e/quiz.e2e.test.ts:95), [`presets.e2e.test.ts`](base/src/e2e/presets.e2e.test.ts:189), [`state.e2e.test.ts`](base/src/e2e/state.e2e.test.ts:95) и [`echo.e2e.test.ts`](base/src/e2e/echo.e2e.test.ts:51) делает тесты одновременно медленными и flaky. Ещё listener разбирает chunk построчно, хотя SSE-сообщение может быть разрезано между chunk-ами ([`helpers.ts`](base/src/e2e/helpers.ts:89)).

Решение: добавить `waitForMercureMessage(messages, predicate, timeout)` с polling/diagnostic dump и потоковый SSE parser с буфером до пустой строки. Все тесты должны ждать нужный event, не «давать ему 500 мс».

### 7. Большой гостевой сценарий смешивает шесть независимых правил

Проблема: единственный тест в [`anonymous-access.spec.ts`](frontend/tests/anonymous-access.spec.ts:14) создаёт admin, словарь, preset, гостевой quiz, persistence, миграцию в новый аккаунт и merge в существующий. Его диагностика плохая, время 90 секунд и шаги зависят друг от друга.

Решение: разделить на четыре теста с общими fixtures: (1) guest create/apply/persistence, (2) guest quiz attempt, (3) migration в новый аккаунт, (4) merge в существующий. Каждый готовит только необходимые данные и утверждает один итог.

### 8. Проверки ориентированы на внутренности и Material UI

Проблема: E2E читают `localStorage` как основной oracle ([`anonymous-access.spec.ts`](frontend/tests/anonymous-access.spec.ts:66), [`auth.spec.ts`](frontend/tests/auth.spec.ts:74)), используют `.MuiAccordion-root`, `.MuiCardContent-root`, `.MuiButton-colorSecondary` и `first()` ([`quiz.spec.ts`](frontend/tests/quiz.spec.ts:54), [`dictionary.spec.ts`](frontend/tests/dictionary.spec.ts:35)). Небольшая замена дизайна ломает тест, а дефект поведения может остаться незамеченным.

Решение: добавить стабильные test id к карточке слова, quiz card, вариантам и результату; искать их в контексте конкретного слова. Persistence оставить отдельным тестом с reload, а в flow-тестах подтверждать видимое состояние.

### 9. Состояние frontend unit-тестов изолировано неполно

Проблема: [`useStore.test.ts`](frontend/src/store/useStore.test.ts:4) не сбрасывает Zustand между `it`; [`client.test.ts`](frontend/src/shared/api/client.test.ts:11) меняет только token, но использует dictionary/dictionaries от предыдущих тестов. Это создаёт зависимость от порядка и persisted storage.

Решение: завести один `resetTestStore()` в test setup, очищать localStorage/cookies и восстанавливать store до базового состояния в `beforeEach`. Каждый тест задаёт все входные поля, от которых зависит ожидаемый результат.

## P2 — расширить контракты API и UX

### 10. Управление словарями тестируется главным образом по happy path

Проблема: [`dictionaries.test.ts`](base/src/features/dictionaries/dictionaries.test.ts:31) покрывает list/create/select/delete/rename владельца, но не содержит явных 401, 403 для чужого dictionary, невалидного id и тела, а [`dictionary.route.test.ts`](base/src/features/dictionary/dictionary.route.test.ts:21) не проверяет чужой `dictionaryId` и невалидный query. Для ресурса с id в URL это важная граница безопасности.

Решение: добавить параметризованные негативные API-тесты на каждый mutation и реальный DB-интеграционный сценарий с двумя пользователями. Проверять, что статус 403/404 не меняет dictionary/userState и не публикует Mercure событие.

### 11. Browser E2E не проверяет ошибки и отмену действий

Проблема: большинство frontend-сценариев проверяет счастливый путь. Например, создание словаря и preset не покрывают server error, отмену модалки, duplicate/invalid word, пустой список presets и отсутствие dictionary после удаления.

Решение: добавить короткие targeted E2E или component integration tests с перехватом ответа API: ошибка остаётся доступной пользователю, форма не теряет введённые данные, cancel не меняет URL/данные, а удаление активного словаря приводит к определённому безопасному состоянию.

### 12. Конфигурация Playwright не проверяет критичные поверхности

Проблема: [`playwright.config.ts`](frontend/playwright.config.ts:20) запускает только Desktop Chromium и один worker. Это нормально для первичного smoke, но mobile sidebar и locale-sensitive responsive UI не имеют browser contract.

Решение: после стабилизации P0 добавить минимальный mobile Chromium project для sidebar/create modal/quiz navigation. Firefox/WebKit добавлять только если они входят в поддерживаемый продуктовый контракт; не раздувать матрицу без такой договорённости.

## Что уже покрыто удачно

- Серверные route-тесты последовательно проверяют auth, Zod-ошибки и основные эффекты для слов, определений, quiz и presets.
- [`dashboard.service.test.ts`](base/src/features/dashboard/dashboard.service.test.ts:25) содержит полезные граничные случаи расчёта streak/cache, а [`evaluation.service.test.ts`](base/src/features/quiz/evaluation.service.test.ts:6) фиксирует правило typo matching.
- Реальная PostgreSQL и Mercure задействованы в backend-сценариях, а [`presets.e2e.test.ts`](base/src/e2e/presets.e2e.test.ts:108) правильно проверяет связки preset–word–definition в БД.
- Гостевой режим, migration и offline queue уже имеют отдельные точки покрытия; их нужно сделать компактнее и детерминированнее, а не переписывать с нуля.
