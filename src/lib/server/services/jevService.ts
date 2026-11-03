// src/lib/server/services/jevService.ts
// Opcionális AI előszűrés a TypeSafe AI Jev modelljével (a felhasználó saját kulcsával – BYOK).
// A Jev típusos kérdésekre ad gyors, olcsó választ, így a nyilvánvalóan alacsony értékű cikkekre
// nem kell a drágább szöveges modellt (LLM) hívni.
import { score, TypeSafeClient } from '@typesafe-ai/sdk';

// Szűrési küszöbök (0-100-as skálán, a Hírérték és a Clickbait Radar kategóriáival összhangban)
const ALACSONY_HIRERTEK = 30;
const KIEMELT_HIRERTEK = 70;
const EROS_CLICKBAIT = 71;
// Bizonytalan értékelésnél nem szűrünk: inkább menjen az LLM-hez, mint hogy fontos hír vesszen el
const MIN_MEGBIZHATOSAG = 0.6;

export type JevEredmeny = {
    hirertek: number;   // 0-100
    clickbait: number;  // 0-100
    szurendo: boolean;
    tokenek: number;
};

export function createJevEloszuro(apiKey: string) {
    // Egy gyors szűrő ne akassza meg a feldolgozást: rövid időkorlát, egy újrapróbálkozás
    const client = new TypeSafeClient({ apiKey, timeout: 8000, retry: { maxRetries: 1 } });

    return async (cim: string, szoveg: string): Promise<JevEredmeny> => {
        const { answers, usage } = await client.systemOne({
            state: { cim, szoveg },
            questions: {
                hirertek: score('Mekkora a hír társadalmi, gazdasági vagy üzleti jelentősége?', [
                    'Jelentéktelen: bulvár, pletyka, horoszkóp, lottószámok, időjárás, állatos vagy cuki történet',
                    'Csekély: kis helyi esemény, baleset, dugó, sporteredmény, kevés embert érint',
                    'Közepes: napi szintű, normál hír',
                    'Jelentős: országos horderejű döntés, nagyobb cég vagy piac fontos eseménye',
                    'Kiemelkedő: nagy nemzetközi konfliktus, makrogazdasági fordulat, történelmi jelentőségű esemény'
                ]),
                clickbait: score('Mennyire hatásvadász vagy félrevezető a cím a szöveghez képest?', [
                    'Tényszerű, objektív cím',
                    'Kicsit hatásvadász, de fedi a valóságot',
                    'Durva clickbait: túlzó, félrevezető vagy információt visszatartó cím'
                ])
            }
        });

        // A pontszám a szintek közötti (akár tört) érték: 0-tól a legmagasabb szint indexéig
        const hirertek = Math.round((answers.hirertek.score / 4) * 100);
        const clickbait = Math.round((answers.clickbait.score / 2) * 100);

        const biztos = answers.hirertek.confidence >= MIN_MEGBIZHATOSAG && answers.clickbait.confidence >= MIN_MEGBIZHATOSAG;
        const szurendo = biztos && (hirertek <= ALACSONY_HIRERTEK || (clickbait >= EROS_CLICKBAIT && hirertek <= KIEMELT_HIRERTEK));

        return { hirertek, clickbait, szurendo, tokenek: usage.input_tokens ?? 0 };
    };
}
