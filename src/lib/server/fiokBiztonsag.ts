// src/lib/server/fiokBiztonsag.ts
// A jelszavak és az e-mail megerősítés közös biztonsági beállításai.

// A bcrypt költsége minden új hash-re érvényes; a régebbi hash-ek belépéskor frissülnek
export const BCRYPT_KOLTSEG = 12;

// A regisztrációkor küldött megerősítő link ennyi ideig használható
export const MEGEROSITES_ERVENYESSEG_MS = 24 * 60 * 60 * 1000;

export const megerositesLejarata = (most: Date = new Date()): Date =>
    new Date(most.getTime() + MEGEROSITES_ERVENYESSEG_MS);

// Lejárati idő nélküli token (a mező bevezetése előtt kiküldött link) már nem érvényes: új levél kérhető
export const megerositesErvenyes = (lejarat: Date | null | undefined, most: Date = new Date()): boolean =>
    !!lejarat && lejarat.getTime() > most.getTime();
