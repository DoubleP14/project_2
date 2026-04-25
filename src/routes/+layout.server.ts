// src/routes/+layout.server.ts
export const load = async ({ locals }) => {
    // Ezzel éri el, hogy a Layout (és a felső menü) tudja, ki van bejelentkezve!
    return {
        user: locals.user
    };
};