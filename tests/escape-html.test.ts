import { escapeHTML } from "bun";
import { describe, test, expect } from "bun:test";

describe("escape html", () => {
    test("escapes html characters", () => {
        const escaped = escapeHTML(`<span>hello</span>`);

        expect(escaped).toMatchInlineSnapshot(`"&lt;span&gt;hello&lt;/span&gt;"`);
    });

    test("escapes &", () => {
        const escaped = escapeHTML(`&`);

        expect(escaped).toMatchInlineSnapshot(`"&amp;"`);
    });

    test("escapes quotes", () => {
        const escaped = escapeHTML(`"hello"`);

        expect(escaped).toMatchInlineSnapshot(`"&quot;hello&quot;"`);
    });
});