
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

    try {
        db.run(`ALTER TABLE beverages ADD COLUMN stars INT`);
    } catch (e: unknown) {
        if (e instanceof Error && e?.message.includes("duplicate column name")) {
            //ignore
        } else {
            throw e;
        }

    }


    const insertBeverage = db.query('insert into beverages (created_at,stars) VALUES (?, ?) RETURNING rowid');
    const selectBeverage = db.query('select created_at,stars from beverages where rowid = ?');
    const selectBeverages = db.query<{ rowid: number, created_at: string, stars: number | null }, [number, number]>('select rowid,created_at,stars from beverages where rowid < ? order by rowid desc limit ?');
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


export async function storeBeverage(ctx: BeverageStoreCtx, tmpImagefile: BunFile, stars: number) {
    const res = ctx.queries.insertBeverage.get(new Date().toISOString(), stars) as { rowid: number };


    if (!tmpImagefile.name) {
        throw new Error('storeBeverage failed because tmpImageFile has no name');
    }

    await rename(tmpImagefile.name!, `./data/images/${res.rowid}.jpg`);


    return res.rowid;
}

export async function getBeverage(ctx: BeverageStoreCtx, rowid: number) {
    return {
        file: getFile(rowid),
        meta: ctx.queries.selectBeverage.get(rowid)
    }
}



export function listBeverages(ctx: BeverageStoreCtx, beforeRowId: number, limit: number) {

    const rows = ctx.queries.selectBeverages.all(beforeRowId, limit);


    return rows.map((r) => ({
        file: getFile(r.rowid),
        meta: r,
    }))
}

export function countBeverages(ctx: BeverageStoreCtx) {
    return ctx.queries.countBeverages.get()?.count || 0;
}

export async function removeBeverage(ctx: BeverageStoreCtx, id: number) {
    ctx.db.run('DELETE FROM beverages WHERE rowid = ?', [id]);

    const file = getFile(id);

    await file.delete();
}


function getFile(rowid: number) {
    return Bun.file(`./data/images/${rowid}.jpg`);
}