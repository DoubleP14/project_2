// src/routes/api/export/elemzesek/+server.ts
// A felhasználó saját híreinek és elemzéseinek letöltése CSV-ben (Enterprise csomag).
import { error, redirect } from '@sveltejs/kit';
import { services } from '$lib/server';
import { csvExportEngedelyezett } from '$lib/csomagok';
import { csvDokumentum } from '$lib/server/csv';

const FEJLEC = ['Dátum', 'Cím', 'Forrás', 'URL', 'Hangulat', 'Hírérték', 'Clickbait', 'Kulcsszavak', 'Összefoglaló', 'Modell'];

export const GET = async ({ locals }) => {
    if (!locals.user) throw redirect(303, '/login');
    if (!csvExportEngedelyezett(locals.user)) {
        throw error(403, 'A CSV export az Enterprise csomag része.');
    }

    const elemzesek = await services.db.aiElemzesek.findMany({
        where: { hir: { forras: { felhasznalo_id: locals.user.id } } },
        orderBy: { elemzes_datuma: 'desc' },
        include: { hir: { include: { forras: { select: { forras_nev: true } } } } }
    });

    const sorok = elemzesek.map((e: (typeof elemzesek)[number]) => [
        e.hir.datum?.toISOString() ?? '',
        e.hir.cim,
        e.hir.forras?.forras_nev ?? '',
        e.hir.url ?? '',
        e.hangulat ?? '',
        e.pontszam,
        e.clickbait,
        e.kulcsszavak.join(', '),
        e.osszefoglalo ?? '',
        e.hasznalt_modell ?? ''
    ]);

    const datum = new Date().toISOString().slice(0, 10);
    return new Response(csvDokumentum([FEJLEC, ...sorok]), {
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="news-trends-elemzesek-${datum}.csv"`,
            'Cache-Control': 'no-store'
        }
    });
};
