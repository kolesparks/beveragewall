import { describe, expect, test } from "bun:test";
import { processImage } from "../lib/process-image";


const unprocessedImage = Bun.file('./tests/images/unprocessed-image.jpg');

describe("process image", () => {
    test("reduce size and strip metadata", async () => {
        const expectedProcessedImage = Bun.file('./tests/images/processed-image.jpg');
        const processedImage = Bun.file('./tests/images/processed-image-tmp.jpg');
        await processImage(unprocessedImage, processedImage);
        expect(processedImage.size).toBeGreaterThan(0);
        expect(processedImage.size).toEqual(expectedProcessedImage.size);
    });

    test("check if jpg", async () => {
        const notAJpg = Bun.file('./tests/images/not-a-jpg.png');
        const processedImage = Bun.file('./tests/images/processed-image-tmp.jpg');
        await expect(processImage(notAJpg, processedImage)).rejects.toThrowError('image is not a jpg');
    })
});