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
});