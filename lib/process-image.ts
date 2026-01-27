import type { BunFile } from "bun";
import { $ } from "bun";

export async function processImage(inputFile: BunFile, outputFile: BunFile) {


    const identify = (await $`magick identify ${inputFile.name} -format '%m'`).stdout.toString('utf-8');

    const [_, type] = identify.split(' ');
    if (
        ['jpg', 'jpeg'].includes(type?.toLowerCase() || "")
    ) {
        await $`magick ${inputFile.name} -strip -define jpeg:extent=300kb ${outputFile.name}`;
    } else {
        throw new Error("image is not a jpg");
    }
}