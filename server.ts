import { mkdir } from "node:fs/promises";
import { countBeverages, listBeverages, removeBeverage, setupBeverageStore, storeBeverage } from "./lib/beverage-store";
import { processImage } from "./lib/process-image";
import { escapeHTML, randomUUIDv7 } from "bun";
import { rm } from "node:fs/promises";
import { classifyIsBeverageImage } from "./lib/classify-image";
import { createRateLimit } from "./lib/rate-limit";
import { timingSafeEqual } from "node:crypto";

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
const pageLinkHtml = await Bun.file("./html/page-link.html").text();
const errorHtml = await Bun.file("./html/error.html").text();
const beverageDeleteFormHtml = await Bun.file("./html/beverage-delete-form.html").text();

const writeLimit = createRateLimit({ limit: 10, windowSeconds: 60 });
const readLimit = createRateLimit({ limit: 240, windowSeconds: 60 });


function renderBeverage({ src, deleteForm, stars }: { src: string, deleteForm?: string, stars?: string }) {
    return beverageHtml.replace("$BEVERAGE_SRC", src).replace("$BEVERAGE_DELETE_FORM", deleteForm || "").replace("$BEVERAGE_STARS", stars || "");
}

function renderStars(count: number) {
    if (count === 0) {
        return "";
    }
    if (count === 1) {
        return "⭐️";
    }
    if (count === 2) {
        return "⭐️⭐️";
    }
    if (count === 3) {
        return "⭐️⭐️⭐️";
    }
    if (count === 4) {
        return "⭐️⭐️⭐️⭐️";
    }
    if (count === 5) {
        return "⭐️⭐️⭐️⭐️⭐️";
    }

    return "";

}

function renderBeverageDeleteForm({ beverageId }: { beverageId: number }) {
    return beverageDeleteFormHtml.replace("$BEVERAGE_ID", beverageId.toString());
}

function renderPageLink({ url, number, current }: { url: string; number: number, current: boolean }) {
    return pageLinkHtml.replace("$PAGE_URL", url).replace("$PAGE_NUMBER", escapeHTML(number)).replace("$PAGE_CURRENT", current ? "true" : "")
}

function renderError({ message }: { message: string }) {
    return errorHtml.replace("$ERROR_MESSAGE", escapeHTML(message));
}

function renderIndexPage({ uploadError, beverages, pageLinks }: {
    uploadError?: string;
    beverages?: { src: string; }[],
    pageLinks: { url: string; number: number; current: boolean }[]
}) {

    return indexPageHtml
        .replace("$PAGE_LINKS", pageLinks.map((p) => renderPageLink(p)).join("\n"))
        .replace("$BEVERAGES", beverages?.map((b) => renderBeverage(b)).join("\n") || "")
        .replace("$UPLOAD_ERROR", uploadError ? renderError({ message: uploadError }) : "");
}


function streamIndexPageWithBeverageList({ uploadError, currentPage: currentPageInput, showBeverageDeleteForm }: { uploadError?: string, currentPage: number, showBeverageDeleteForm: boolean }) {

    const pageSize = 10;
    const count = countBeverages(beverageStoreCtx);
    const pageCount = Math.ceil(count / pageSize);
    const currentPage = Math.max(1, Math.min(pageCount, currentPageInput));
    const beverages = listBeverages(beverageStoreCtx, (count + 1) - ((currentPage - 1) * pageSize), pageSize);
    const pageLinks = Array.from({ length: pageCount }).map((_, i) => ({ url: `/?page=${i + 1}`, number: i + 1, current: currentPage === i + 1 }));

    const stream = new ReadableStream({
        start: async function (controller) {

            const renderedPageHtml = renderIndexPage({ beverages: [], pageLinks: pageLinks, uploadError });
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

                controller.enqueue(
                    beverageHtml.slice(
                        beverageHtml.indexOf("$BEVERAGE_SRC") + "$BEVERAGE_SRC".length)
                        .replace("$BEVERAGE_DELETE_FORM", showBeverageDeleteForm ? renderBeverageDeleteForm({ beverageId: beverage.meta.rowid }) : "")
                        .replace("$BEVERAGE_STARS", renderStars(beverage.meta.stars || 0))
                )
            }

            controller.enqueue(
                renderedPageHtml.slice(renderedPageHtml.indexOf("</ol>"))
            );

            controller.close();
        }
    });

    return new Response(stream, {
        status: uploadError ? 400 : 200,
        headers: {
            "Content-Type": "text/html"
        }
    });
}



Bun.serve({
    hostname: host,
    port: port,
    routes: {
        "/beverages/delete": async function handler(req, res) {

            if (writeLimit()) {
                return new Response("Too many attempts", {
                    status: 429
                });
            }

            const formData = await req.formData();

            const password = formData.get("password")?.valueOf();
            const beverageId = formData.get("beverageId");

            if (!password || typeof password !== 'string' || !beverageId || Number.isNaN(Number(beverageId))) {
                return new Response("Invalid inputs", {
                    status: 401,
                });
            }


            try {
                if (!process.env.ADMIN_PASSWORD) {
                    throw new Error("ADMIN_PASSWORD not defined");
                }
                if (!timingSafeEqual(Buffer.from(process.env.ADMIN_PASSWORD, "utf-8"), Buffer.from(password, "utf-8"))) {
                    return new Response("Uauthorized", {
                        status: 400,
                    });
                }


                await removeBeverage(beverageStoreCtx, Number(beverageId));


                return Response.redirect("/");

            } catch (e) {
                console.error(e);
                return new Response("Server Error", {
                    status: 500,
                });
            }
        },
        "/": async function handler(req) {

            try {
                const searchParams = new URL(req.url).searchParams;
                const pageParam = searchParams.get("page");

                const currentPage = Number(Number.isNaN(pageParam) ? 1 : pageParam);

                if (req.method === 'POST') {

                    if (writeLimit()) {
                        return new Response("Too many uploads", {
                            status: 429
                        });
                    }

                    const formData = await req.formData();

                    const image = formData.get("image");
                    let stars = Math.max(0, Math.min(5, Number(formData.get("stars"))));

                    if (Number.isNaN(stars)) {
                        stars = 0;
                    }

                    if (!(image instanceof Blob)) {
                        return new Response("expected an image file", { status: 400 });
                    } else if (image.size > MAX_IMAGE_SIZE_BYTES) {
                        return new Response("image cannot be larger than 1mb", { status: 400 });
                    }

                    const tmpId = randomUUIDv7();
                    const tmpIn = Bun.file(`./data/tmp/image-in-${tmpId}.jpg`);
                    const tmpOut = Bun.file(`./data/tmp/image-out-${tmpId}.jpg`);

                    tmpIn.write(await image.bytes());

                    const successfullyProcessed = await processImage(tmpIn, tmpOut);

                    if (!successfullyProcessed) {
                        return streamIndexPageWithBeverageList({
                            uploadError: "Failed to process image. Image must be a valid jpg",
                            currentPage,
                            showBeverageDeleteForm: false,
                        })
                    }

                    await rm(tmpIn.name as string);
                    // tmpOut is moved by beverage store

                    const isBeverageImage = await classifyIsBeverageImage(tmpOut);

                    if (!isBeverageImage) {
                        return streamIndexPageWithBeverageList({
                            uploadError: "Picture must be of a beverage in hand or on a surface with a generic background.",
                            currentPage,
                            showBeverageDeleteForm: false,
                        });
                    }

                    await storeBeverage(beverageStoreCtx, tmpOut, stars);

                    return Response.redirect("/");
                } else {

                    if (readLimit()) {
                        return new Response("Too mutch traffic", {
                            status: 429
                        });
                    }
                }


                return streamIndexPageWithBeverageList({
                    currentPage,
                    showBeverageDeleteForm: searchParams.has("admin")
                });
            } catch (e) {
                console.error(e);

                return new Response("Server error 😭", {
                    status: 500,
                });
            }

        },
    },
    maxRequestBodySize: MAX_IMAGE_SIZE_BYTES * 2
})


console.log(`Server listening on http://${host}:${port}`);