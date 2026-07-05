# Google Sheets RSVP

## Configuración de Google Sheets

1. Crea una hoja de Google Sheets.
2. Agrega encabezados en la primera fila:

```
CreatedAt | Event | Name | Attendance | Guests | Prediction | Phone | Message
```

3. Ve a Extensiones > Apps Script.
4. Pega este script:

```js
const SHEET_NAME = 'RSVP';

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet =
      spreadsheet.getSheetByName(SHEET_NAME) ||
      spreadsheet.insertSheet(SHEET_NAME);

    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'CreatedAt',
        'Event',
        'Name',
        'Attendance',
        'Guests',
        'Prediction',
        'Phone',
        'Message',
      ]);
    }

    const data = e.parameter;

    sheet.appendRow([
      new Date(),
      data.event || '',
      data.name || '',
      data.attendance || '',
      data.guests || '',
      data.prediction || '',
      data.phone || '',
      data.message || '',
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(error) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
```

5. Guarda el proyecto (Ctrl+S / Cmd+S).
6. Haz click en **Implementar** > **Nueva implementación**.
7. Selecciona tipo: **Web App**.
8. Configura:
   - Descripción: "RSVP Gender Reveal"
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier persona**
9. Click en **Implementar**.
10. Copia la URL de la Web App.
11. Pégala en `invitation.data.ts` como valor de `googleScriptUrl`.

## Datos que se guardan

| Campo | Descripción |
|---|---|
| CreatedAt | Fecha y hora del registro |
| Event | Nombre del evento |
| Name | Nombre del invitado |
| Attendance | "Sí asistiré" o "No podré asistir" |
| Guests | Número de personas |
| Prediction | "Niña" o "Niño" |
| Phone | Teléfono opcional |
| Message | Mensaje opcional |
