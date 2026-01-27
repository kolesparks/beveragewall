import { describe, test, expect, beforeAll } from "bun:test";
import { getBeverage, listBeverages, setupBeverageStore, storeBeverage } from "../lib/beverage-store";


describe("beverage store", () => {
    test("store beverage", async () => {
        const srcFile = Bun.file('./tests/images/processed-image.jpg');
        const tmpFile = Bun.file('./tests/images/processed-image-tmp.jpg');

        await tmpFile.write(await srcFile.bytes());


        const ctx = setupBeverageStore(':memory:');

        const id = await storeBeverage(ctx, tmpFile);

        const retrieved = await getBeverage(ctx, id);

        expect(retrieved.file.size).toEqual(srcFile.size);
    });


    test("list beverages", async () => {
        const srcFile = Bun.file('./tests/images/processed-image.jpg');
        const tmpFile = Bun.file('./tests/images/processed-image-tmp.jpg');
        await tmpFile.write(await srcFile.bytes());

        const ctx = setupBeverageStore(":memory:");

        await storeBeverage(ctx, tmpFile);


        const beverages = await listBeverages(ctx, 0, 10);


        expect(beverages).toHaveLength(1);
        expect(beverages[0]?.file.size).toEqual(srcFile.size);
        expect(beverages[0]?.meta.rowid).toEqual(1);

    });
})