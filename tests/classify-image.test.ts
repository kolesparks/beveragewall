import { describe, test, expect } from "bun:test";
import { classifyIsBeverageImage } from "../lib/classify-image";

const beverageYes = new Bun.Glob('./tests/images/beverage-yes/*.jpg');
const beverageNo = new Bun.Glob('./tests/images/beverage-no/*.jpg');

const nsfw = new Bun.Glob('./tests/images/nsfw/*.jpg');

describe("classify image", () => {

  test("yes beverage images", async () => {


    for await (const yesImagePath of beverageYes.scan()) {
      const yesImageFile = Bun.file(yesImagePath);
      const yesImageBytes = await yesImageFile.bytes();
      const yesImageBase64Url = `data:image/jpeg;base64,${yesImageBytes.toBase64()}`;
      const isBeverageImage = await classifyIsBeverageImage(yesImageBase64Url);

      expect(isBeverageImage, `Expected ${yesImagePath} to be classified as a beverage image`).toBeTrue()
    }
  }, {
    timeout: 120_0000
  });

  test("not beverage images", async () => {
    for await (const noImagePath of beverageNo.scan()) {
      const noImageFile = Bun.file(noImagePath);
      const noImageBytes = await noImageFile.bytes();
      const noImageBase64Url = `data:image/jpeg;base64,${noImageBytes.toBase64()}`;
      const isBeverageImage = await classifyIsBeverageImage(noImageBase64Url);

      expect(isBeverageImage, `Expected ${noImagePath} to NOT be classified as a beverage image`).toBeFalse()
    }
  }, {
    timeout: 120_000
  });

  test("nsfw images", async () => {
    for await (const nsfwImagePath of nsfw.scan()) {
      const nsfwImageFile = Bun.file(nsfwImagePath);
      const nsfwImageBytes = await nsfwImageFile.bytes();
      const nsfwImageBase64Url = `data:image/jpeg;base64,${nsfwImageBytes.toBase64()}`;
      const isBeverageImage = await classifyIsBeverageImage(nsfwImageBase64Url);

      expect(isBeverageImage, `Expected ${nsfwImagePath} to NOT be classified as a beverage image`).toBeFalse()
    }
  }, {
    timeout: 120_000
  });
});







