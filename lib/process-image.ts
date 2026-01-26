import type { BunFile } from "bun";
import { $ } from "bun";

export async function processImage(inputFile: BunFile, outputFile: BunFile) {
    await $`magick ${inputFile.name} -strip -define jpeg:extent=300kb ${outputFile.name}`;
}