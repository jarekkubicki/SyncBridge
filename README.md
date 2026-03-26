# SyncBridge Vercel Backend

Minimalny backend dla `SyncBridge` pod Vercel.

Założenia:

- jeden endpoint serverless
- route: `/api/sheets`
- brak auth
- brak bazy
- brak panelu admina
- przyjmuje URL Google Sheets
- zwraca znormalizowany JSON

## Struktura

- `api/sheets.js` - jedyny endpoint
- `package.json` - minimalny package dla Vercela

`vercel.json` nie jest potrzebny.

## Jak działa endpoint

Request:

```text
GET /api/sheets?url=https://docs.google.com/spreadsheets/d/.../edit?gid=0
```

Opcjonalnie możesz podać też:

- `worksheet=Sheet1`
- `id=...`
- `gid=...`

Response:

```json
{
  "ok": true,
  "spreadsheetId": "15pu0_iVwVpYiubuNL3wbCSF_7cpshV-7degUhH41St4",
  "spreadsheetTitle": "15pu0_iVwVpYiubuNL3wbCSF_7cpshV-7degUhH41St4",
  "worksheetName": "gid:0",
  "worksheets": [
    {
      "name": "gid:0",
      "rowCount": 10,
      "columnCount": 4,
      "isDefault": true
    }
  ],
  "columns": ["Title", "Price"],
  "rows": [
    { "Title": "A", "Price": "10" },
    { "Title": "B", "Price": "20" }
  ]
}
```

## Deployment na Vercel przez GitHub

1. Utwórz nowe repo na GitHub, np. `syncbridge-vercel-backend`.
2. Wgraj zawartość folderu `vercel-backend` do tego repo.
3. Zaloguj się do Vercela.
4. Kliknij `Add New...` -> `Project`.
5. Zaimportuj repo z GitHub.
6. Nie zmieniaj nic specjalnego w konfiguracji.
7. Kliknij `Deploy`.

Po deployu dostaniesz adres w stylu:

```text
https://syncbridge-vercel-backend.vercel.app/api/sheets
```

## Test endpointu

Po wdrożeniu otwórz w przeglądarce:

```text
https://TWOJ-PROJEKT.vercel.app/api/sheets?url=https://docs.google.com/spreadsheets/d/15pu0_iVwVpYiubuNL3wbCSF_7cpshV-7degUhH41St4/edit?usp=sharing
```

Jeśli wszystko działa, zobaczysz JSON.

## Jak podpiąć do SyncBridge

W pluginie ustaw endpoint backendu w:

[fetchConfig.ts](../src/code/sheets/fetchConfig.ts)

Przykład:

```ts
export const SHEET_FETCH_ENDPOINT = 'https://twoj-projekt.vercel.app/api/sheets';
```

Następnie w:

[manifest.json](../manifest.json)

podmień domenę backendu w `networkAccess.allowedDomains`, np.:

```json
"allowedDomains": [
  "https://twoj-projekt.vercel.app"
]
```

Po zmianie manifestu usuń i dodaj plugin developerski ponownie w Figma.

## Ograniczenia tego minimalnego backendu

- zakłada publiczny arkusz Google Sheets
- nie robi OAuth
- nie pobiera prawdziwego tytułu skoroszytu z osobnego API, więc `spreadsheetTitle` to obecnie `spreadsheetId`
- przy pracy przez `gid` nazwa worksheetu może być techniczna, np. `gid:0`

To jest celowo najprostszy możliwy wariant startowy.

initial deploy trigger
