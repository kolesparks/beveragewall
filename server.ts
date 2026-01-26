import { mkdir } from "node:fs/promises";
import { setupBeverageStore, storeBeverage } from "./lib/beverage-store";

const dataFolder = Bun.file('./data');

if (!(await dataFolder.exists())) {
    await mkdir("./data");
}

const beverageStoreCtx = setupBeverageStore('./data/beverages.db');

const host = process.env.PORT ? "0.0.0.0" : "localhost";
const port = Number(process.env.PORT || 3000);

const indexPageHtml = await Bun.file("./html/index.html").text();

function renderIndexPage({ }: {}) {

    return indexPageHtml.replace("$PAGE_LINKS", [].join("\n")).replace("$BEVERAGES", [].join("\n"));
}

const MAX_IMAGE_SIZE_BYTES = (1024 * 1024);

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

                await storeBeverage(beverageStoreCtx, image);

                return new Response(renderIndexPage({}), { headers: { "Content-Type": "text/html" } });
            }

            return new Response(renderIndexPage({}), { headers: { "Content-Type": "text/html" } });
        },
    }
})


console.log(`Server listening on http://${host}:${port}`);