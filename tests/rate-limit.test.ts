import { test, expect } from "bun:test";
import { createRateLimit } from "../lib/rate-limit";



test("rate limit", async () => {
    const rateLimit = createRateLimit({ limit: 10, windowSeconds: 1 });
    for (let i = 0; i < 10; i++) {
        const hit = rateLimit();

        if (i === 9) {
            const hit = rateLimit();
            expect(hit).toBeTrue();
        } else {
            expect(hit).toBeFalse();
        }
    }

    await new Promise((res) => setTimeout(res, 1000));

    const hit = rateLimit();

    expect(hit).toBeFalse();
});