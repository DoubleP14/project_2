import * as dotenv from 'dotenv';
dotenv.config(); 

// src/lib/server/index.ts
import * as path from "path";
import { PrismaClient } from "@prisma/client";

// Utils importok
import { Env } from "./utils/env";
import { createPrisma } from "./utils/create-prisma";

// Services és Modules importok
import { createHirRepository } from "./services/hirRepository"; 
import { createAiService } from "./services/aiService";         
import { createHirGyujtoModule } from "./modules/hirGyujtoModule"; 
import { createAiModule } from "./modules/aiModule";           

// --- 1. KONFIGURÁCIÓ ---
export type Config = {
    database: {
        connectionString: string;
    };
    ai: {
        apiKey: string; 
    };
};

const projectRoot = path.resolve(process.cwd());
const env = new Env(projectRoot);

const rawConfig: Config = {
    database: {
        connectionString: env.string("DATABASE_URL")
    },
    ai: {
        apiKey: env.string("OPENAI_API_KEY") 
    }
};

// --- 2. SERVICES RÉTEG ---
export function createServices(cfg: Config) {
    const prisma = createPrisma({ connectionString: cfg.database.connectionString }, PrismaClient);
    
    return {
        db: prisma,
        hirRepo: createHirRepository(prisma),
        ai: createAiService(cfg.ai.apiKey) 
    };
}

export type Services = ReturnType<typeof createServices>;

// --- 3. MODULES RÉTEG ---
export function createModules(services: Services) {
    return {
        hirGyujto: createHirGyujtoModule(services),
        aiElemzo: createAiModule(services) 
    };
}

export type Modules = ReturnType<typeof createModules>;

// --- 4. PÉLDÁNYOSÍTÁS (Központi export) ---
export const services = createServices(rawConfig);
export const modules = createModules(services);

console.log("Rendszer architektúra (Config -> Services -> Modules) sikeresen felállítva!");