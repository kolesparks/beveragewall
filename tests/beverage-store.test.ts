import { describe, test, expect, beforeAll } from "bun:test";
import { getBeverage, setupBeverageStore, storeBeverage } from "../lib/beverage-store";


describe("beverage store", () => {
    test("store beverage", async () => {
        const file = Bun.file('./tests/images/processed-image.jpg')
        const blob = new Blob([await file.bytes()]);

        const ctx = setupBeverageStore(':memory:');

        const id = await storeBeverage(ctx, blob);

        const retrieved = await getBeverage(ctx, id);

        expect(retrieved.file.size).toEqual(file.size);
    });
})