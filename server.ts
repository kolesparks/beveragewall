import { mkdir } from "node:fs/promises";
import { listBeverages, setupBeverageStore, storeBeverage } from "./lib/beverage-store";
import { processImage } from "./lib/process-image";
import { escapeHTML, randomUUIDv7 } from "bun";
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
const beverageHtml = await Bun.file("./html/beverage.html").text();


function renderBeverage({ src }: { src: string }) {
    return beverageHtml.replace("$BEVERAGE_SRC", src);
}


function renderIndexPage({ uploadError, beverages }: {
    uploadError?: string;
    beverages?: { src: string }[]
}) {

    return indexPageHtml
        .replace("$PAGE_LINKS", [].join("\n"))
        .replace("$BEVERAGES", beverages?.map((b) => renderBeverage(b)).join("\n") || "")
        .replace("$UPLOAD_ERROR", escapeHTML(uploadError || ""));
}


function streamIndexPageWithBeverageList(pageProps: Partial<Parameters<typeof renderIndexPage>[0]>) {


    const beverages = listBeverages(beverageStoreCtx, 0, 10);


    const stream = new ReadableStream({
        start: async function (controller) {

            const renderedPageHtml = renderIndexPage({ beverages: [], ...pageProps });
            const initialHtml = renderedPageHtml.slice(0, renderedPageHtml.indexOf("</ol>"));
            controller.enqueue(initialHtml);

            for (const beverage of beverages) {
                const fileStream = beverage.file.stream();
                controller.enqueue(beverageHtml.slice(0, beverageHtml.indexOf("$BEVERAGE_SRC")));
                controller.enqueue(`data:image/jpeg;base64,`);

                let carryover = new Uint8Array(0);
                for await (const chunk of fileStream) {
                    const combined = new Uint8Array(carryover.byteLength + chunk.byteLength);

                    combined.set(carryover);
                    combined.set(chunk, carryover.length);

                    const encodableLength = Math.floor(combined.byteLength / 3) * 3;

                    controller.enqueue(combined.slice(0, encodableLength).toBase64());


                    carryover = combined.slice(encodableLength);
                }

                if (carryover.byteLength > 0) {
                    controller.enqueue(carryover.toBase64());
                }

                controller.enqueue(beverageHtml.slice(beverageHtml.indexOf("$BEVERAGE_SRC") + "$BEVERAGE_SRC".length));
            }

            controller.close();
        }
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/html"
        }
    });
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

                const isBeverageImage = await classifyIsBeverageImage(tmpOut);

                if (!isBeverageImage) {
                    return streamIndexPageWithBeverageList({
                        uploadError: "Picture must be of a beverage in hand or on a surface with a generic background.",
                    });
                }

                await storeBeverage(beverageStoreCtx, tmpOut);

                return Response.redirect("/");
            }

            return streamIndexPageWithBeverageList({});

        },
    },
    maxRequestBodySize: MAX_IMAGE_SIZE_BYTES * 1.5
})


console.log(`Server listening on http://${host}:${port}`);