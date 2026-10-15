import { describe, expect, it } from "vitest";
import { cleanRichValue, isEmptyRich, isRichHtml, plainToRichHtml, richToText, sanitizeRichHtml } from "./richText";

describe("isRichHtml", () => {
  it("tells editor HTML from plain text", () => {
    expect(isRichHtml("<p>Hello</p>")).toBe(true);
    expect(isRichHtml('<h2 style="text-align:center">x</h2>')).toBe(true);
    expect(isRichHtml("Plain text\n\nSecond [link](/pricing)")).toBe(false);
    expect(isRichHtml("I <3 AC")).toBe(false);
    expect(isRichHtml("")).toBe(false);
  });
});

describe("sanitizeRichHtml", () => {
  it("keeps the supported formatting", () => {
    const html = '<h2>Title</h2><p style="text-align:center"><strong>Bold</strong> <em>it</em> <u>u</u> <s>s</s> <span style="color:#ff0000;font-size:20px">red</span> <mark style="background-color:#ffff00">hi</mark></p><ul><li>a</li></ul><blockquote>q</blockquote><hr>';
    expect(sanitizeRichHtml(html)).toBe(html);
  });
  it("removes scripts, handlers and dangerous links", () => {
    const out = sanitizeRichHtml('<p onclick="x()">a<script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">b</a><a href=" JaVaScRiPt:alert(1)">c</a><iframe src="https://e.com"></iframe></p>');
    expect(out).toBe("<p>abc</p>");
  });
  it("only allows safe link addresses and adds rel for new tabs", () => {
    expect(sanitizeRichHtml('<a href="/pricing">p</a>')).toBe('<a href="/pricing">p</a>');
    expect(sanitizeRichHtml('<a href="https://x.com" target="_blank" rel="opener">p</a>')).toBe('<a href="https://x.com" target="_blank" rel="noopener noreferrer">p</a>');
    expect(sanitizeRichHtml('<a href="//evil.com">p</a>')).toBe("p");
    expect(sanitizeRichHtml('<a href="http://x.com">p</a>')).toBe("p");
    expect(sanitizeRichHtml('<a href="tel:+971500000000">p</a>')).toBe('<a href="tel:+971500000000">p</a>');
    expect(sanitizeRichHtml('<a href="data:text/html,x">p</a>')).toBe("p");
  });
  it("filters styles to a short allow-list", () => {
    expect(sanitizeRichHtml('<p style="color:red;background:url(javascript:x);position:fixed;text-align:end">x</p>')).toBe('<p style="text-align:end">x</p>');
    expect(sanitizeRichHtml('<span style="color:#abc;font-size:9999px;line-height:1.5">x</span>')).toBe('<span style="color:#abc;line-height:1.5">x</span>');
    expect(sanitizeRichHtml('<span style="color:expression(alert(1))">x</span>')).toBe("<span>x</span>");
  });
  it("images need a site path or https source", () => {
    expect(sanitizeRichHtml('<img src="https://a.com/x.webp" alt="Cat" width="300" height="200">')).toBe('<img src="https://a.com/x.webp" alt="Cat" loading="lazy" width="300" height="200">');
    expect(sanitizeRichHtml('<img src="javascript:alert(1)">')).toBe("");
    expect(sanitizeRichHtml('<img src="data:image/png;base64,AAAA">')).toBe("");
  });
  it("escapes stray angle brackets and closes open tags", () => {
    expect(sanitizeRichHtml("<p>1 < 2 and <b>bold")).toBe("<p>1 &lt; 2 and <strong>bold</strong></p>");
    expect(sanitizeRichHtml("<p>a &amp; b &lt;script&gt;</p>")).toBe("<p>a &amp; b &lt;script&gt;</p>");
  });
  it("is idempotent", () => {
    const once = sanitizeRichHtml('<p dir="rtl" style="text-align:end">أهلاً <a href="/x" target="_blank">رابط</a></p><p>1 &lt; 2</p>');
    expect(sanitizeRichHtml(once)).toBe(once);
  });
  it("leaves plain text alone in cleanRichValue", () => {
    expect(cleanRichValue("Hello <b>there</b> [a](/b)")).toBe("Hello <b>there</b> [a](/b)");
    expect(cleanRichValue('<p onclick="x">a</p>')).toBe("<p>a</p>");
  });
});

describe("conversions", () => {
  it("turns plain text with link markup into editor HTML", () => {
    expect(plainToRichHtml("Line one\nline two\n\nSee [pricing](/pricing){b,u,n} & more")).toBe(
      '<p>Line one<br>line two</p><p>See <a href="/pricing" target="_blank" rel="noopener noreferrer"><u><strong>pricing</strong></u></a> &amp; more</p>',
    );
  });
  it("never links an unsafe address", () => {
    expect(plainToRichHtml("[x](javascript:alert(1))")).toBe("<p>[x](javascript:alert(1))</p>");
  });
  it("reads the visible words of HTML", () => {
    expect(richToText("<h2>Title</h2><p>One &amp; <strong>two</strong></p><ul><li>a</li><li>b</li></ul>")).toBe("Title One & two a b");
  });
  it("knows an empty editor", () => {
    expect(isEmptyRich("<p></p>")).toBe(true);
    expect(isEmptyRich('<p><img src="https://a.com/x.png" alt=""></p>')).toBe(false);
    expect(isEmptyRich("<p>x</p>")).toBe(false);
  });
});
