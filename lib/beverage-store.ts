
import type { BunFile } from "bun";
import { Database } from "bun:sqlite";
import { rename } from "node:fs/promises";

export function setupBeverageStore(path: string) {

    const db = new Database(path);

    db.run(`
        CREATE TABLE IF NOT EXISTS beverages  (
            created_at TEXT NOT NULL
        )
    `);


    const insertBeverage = db.query('insert into beverages (created_at) VALUES (?) RETURNING rowid');
    const selectBeverage = db.query('select created_at from beverages where rowid = ?');
    const selectBeverages = db.query<{ rowid: number, created_at: string }, [number, number]>('select rowid,created_at from beverages where rowid < ? order by rowid desc limit ?');
    const countBeverages = db.query<{ count: number }, []>('select count(1) as count from beverages');

    return {
        db,
        queries: {
            insertBeverage,
            selectBeverage,
            selectBeverages,
            countBeverages
        }
    }
}

export type BeverageStoreCtx = ReturnType<typeof setupBeverageStore>;


export async function storeBeverage(ctx: BeverageStoreCtx, tmpImagefile: BunFile) {
    const res = ctx.queries.insertBeverage.get(new Date().toISOString()) as { rowid: number };


    if (!tmpImagefile.name) {
        throw new Error('storeBeverage failed because tmpImageFile has no name');
    }

    await rename(tmpImagefile.name!, `./data/images/${res.rowid}.jpg`);


    return res.rowid;
}

export async function getBeverage(ctx: BeverageStoreCtx, rowid: number) {
    return {
        file: Bun.file(`./data/images/${rowid}.jpg`),
        meta: ctx.queries.selectBeverage.get(rowid)
    }
}



export function listBeverages(ctx: BeverageStoreCtx, beforeRowId: number, limit: number) {

    const rows = ctx.queries.selectBeverages.all(beforeRowId, limit);


    return rows.map((r) => ({
        file: Bun.file(`./data/images/${r.rowid}.jpg`),
        meta: r,
    }))
}

export function countBeverages(ctx: BeverageStoreCtx) {
    return ctx.queries.countBeverages.get()?.count || 0;
}