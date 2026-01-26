
import { Database } from "bun:sqlite";


export function setupBeverageStore(path: string) {

    const db = new Database(path);

    db.run(`
        CREATE TABLE IF NOT EXISTS beverages  (
            created_at TEXT NOT NULL
        )
    `);


    const insertBeverage = db.query('insert into beverages (created_at) VALUES (?) RETURNING rowid');
    const selectBeverage = db.query('select created_at from beverages where rowid = ?');

    return {
        db,
        queries: {
            insertBeverage,
            selectBeverage
        }
    }
}

export type BeverageStoreCtx = ReturnType<typeof setupBeverageStore>;


export async function storeBeverage(ctx: BeverageStoreCtx, image: Blob) {
    const res = ctx.queries.insertBeverage.get(new Date().toISOString()) as { rowid: number };

    const imageBytes = await image.bytes();
    const imageFile = Bun.file(`./data/images/${res.rowid}.jpg`);

    await imageFile.write(imageBytes);


    return res.rowid;
}

export async function getBeverage(ctx: BeverageStoreCtx, rowid: number) {
    return {
        file: Bun.file(`./data/images/${rowid}.jpg`),
        meta: ctx.queries.selectBeverage.get(rowid)
    }
}