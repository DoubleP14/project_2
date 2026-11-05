// src/lib/server/csv.ts
// CSV előállítás magyar Excelhez: pontosvessző elválasztó, a fájl elején UTF-8 BOM.

const ELVALASZTO = ';';
export const CSV_BOM = '﻿';

// A cikkek címe és szövege külső forrásból jön. Az Excel az =, +, -, @ jellel kezdődő cellát képletként
// futtatná (CSV injection), ezért az ilyen szöveg elé aposztróf kerül.
export function csvCella(ertek: string | number | null | undefined): string {
    if (ertek === null || ertek === undefined) return '';
    if (typeof ertek === 'number') return String(ertek);

    const biztonsagos = /^[=+\-@\t\r]/.test(ertek) ? `'${ertek}` : ertek;
    return /[;"\r\n]/.test(biztonsagos) ? `"${biztonsagos.replaceAll('"', '""')}"` : biztonsagos;
}

export const csvSor = (cellak: (string | number | null | undefined)[]): string =>
    cellak.map(csvCella).join(ELVALASZTO);

export const csvDokumentum = (sorok: (string | number | null | undefined)[][]): string =>
    CSV_BOM + sorok.map(csvSor).join('\r\n') + '\r\n';
