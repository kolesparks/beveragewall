import { describe, test, expect, beforeAll } from "bun:test";
import { getBeverage, setupBeverageStore, storeBeverage } from "../lib/beverage-store";


describe("beverage store", () => {
    test("store beverage", async () => {
        const srcFile = Bun.file('./tests/images/processed-image.jpg');
        const tmpFile = Bun.file('./tests/images/processed-image-tmp.jpg');

        await tmpFile.write(await srcFile.bytes());


        const ctx = setupBeverageStore(':memory:');

        const id = await storeBeverage(ctx, tmpFile);

        const retrieved = await getBeverage(ctx, id);


        console.log(retrieved.file.name)

        expect(retrieved.file.size).toEqual(srcFile.size);
    });
})