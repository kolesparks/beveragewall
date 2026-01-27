import { mkdir } from "node:fs/promises";
import { setupBeverageStore, storeBeverage } from "./lib/beverage-store";
import { processImage } from "./lib/process-image";
import { randomUUIDv7 } from "bun";
import { rm } from "node:fs/promises";
import { classifyIsBeverageImage } from "./lib/classify-image";

await mkdir("./data", {
    recursive: true,
});

await rm("./data/tmp", { recursive: true }).catch(() => null);
await mkdir("./data/tmp", { recursive: true });
await mkdir("./data/images", { recursive: true });


const host = process.env.PORT ? "0.0.0.0" : "localhost";
const port = Number(process.env.PORT || 3000);
const MAX_IMAGE_SIZE_BYTES = (1024 * 1024);
const beverageStoreCtx = setupBeverageStore('./data/beverages.db');

const indexPageHtml = await Bun.file("./html/index.html").text();

function renderIndexPage({ }: {}) {

    return indexPageHtml.replace("$PAGE_LINKS", [].join("\n")).replace("$BEVERAGES", [].join("\n"));
}


Bun.serve({
    hostname: host,
    port: port,
    routes: {
        "/": async function handler(req, res) {

            if (req.method === 'POST') {
                const formData = await req.formData();

                const image = formData.get("image");

                if (!(image instanceof Blob)) {
                    return new Response("expected an image file", { status: 400 });
                } else if (image.size > MAX_IMAGE_SIZE_BYTES) {
                    return new Response("image cannot be larger than 1mb", { status: 400 });
                }

                const tmpId = randomUUIDv7();
                const tmpIn = Bun.file(`./data/tmp/image-in-${tmpId}.jpg`);
                const tmpOut = Bun.file(`./data/tmp/image-out-${tmpId}.jpg`);

                tmpIn.write(await image.bytes());

                await processImage(tmpIn, tmpOut);

                await rm(tmpIn.name as string);
                // tmpOut is moved by beverage store

                const isBeverageImage = await classifyIsBeverageImage(await image.bytes());

                if (!isBeverageImage) {
                    //@TODO proper UX
                    return new Response("this is not an image of a beverage", { status: 400 });
                }

                await storeBeverage(beverageStoreCtx, tmpOut);

                return new Response(renderIndexPage({}), { headers: { "Content-Type": "text/html" } });
            }

            return new Response(renderIndexPage({}), { headers: { "Content-Type": "text/html" } });
        },
    },
    maxRequestBodySize: MAX_IMAGE_SIZE_BYTES * 1.5
})


console.log(`Server listening on http://${host}:${port}`);