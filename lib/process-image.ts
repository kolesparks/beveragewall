import type { BunFile } from "bun";
import { $ } from "bun";

export async function processImage(inputFile: BunFile, outputFile: BunFile) {


    const identify = (await $`magick identify ${inputFile.name} -format '%m\n'`).stdout.toString('utf-8');

    if (
        identify.includes("JPEG")
    ) {
        await $`magick ${inputFile.name} -strip -define jpeg:extent=300kb ${outputFile.name}`;

        return true;
    } else {
        return false;
    }
}