// src/lib/server/services/hirRepository.ts
import type { PrismaClient } from "@prisma/client";

export function createHirRepository(prisma: PrismaClient) {
    return {
        getAktivForrasok: async () => {
            return await prisma.hirForrasok.findMany({
                where: { aktiv: true }
            });
        },

        getFelhasznaloKulcsok: async (userId: number) => {
            return await prisma.felhasznalok.findUnique({
                where: { id: userId },
                select: { 
                    youtube_api_key: true, 
                    api_key: true 
                }
            });
        },

        updateUtolsoFrissites: async (id: number) => {
            return await prisma.hirForrasok.update({
                where: { id: id },
                data: { utolso_frissites: new Date() }
            });
        },

        hirMenteseHaUj: async (hirAdat: any) => {

            const letezoHir = await prisma.hirek.findFirst({
                where: {
                    url: hirAdat.url,
                    felhasznalo_id: hirAdat.felhasznalo_id 
                }
            });

            if (letezoHir) {
                return await prisma.hirek.update({
                    where: { id: letezoHir.id },
                    data: {
                        cim: hirAdat.cim,           
                        jelentoz: hirAdat.jelentoz  
                    }
                });
            } else {
                return await prisma.hirek.create({
                    data: {
                        cim: hirAdat.cim,
                        url: hirAdat.url,
                        tartalom: hirAdat.tartalom,
                        datum: hirAdat.datum,
                        forras_id: hirAdat.forras_id,
                        felhasznalo_id: hirAdat.felhasznalo_id, 
                        is_private: hirAdat.is_private,
                        jelentoz: hirAdat.jelentoz
                    }
                });
            }
        },

        getFeldolgozatlanHirek: async (limit: number = 3) => {
            return await prisma.hirek.findMany({
                where: { ai_elemzesek: { none: {} } }, 
                take: limit,
                orderBy: { datum: 'desc' }
            });
        },

        saveAiElemzes: async (hirId: number, osszefoglalo: string, hangulat: string, modellNeve: string) => {
            return await prisma.aiElemzesek.create({
                data: {
                    hir_id: hirId,
                    osszefoglalo: osszefoglalo,
                    hangulat: hangulat,
                    hasznalt_modell: modellNeve 
                }
            });
        }
    };
}