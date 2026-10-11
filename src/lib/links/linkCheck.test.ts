import { describe, it, expect } from "vitest";
import { findLinkToSite, isPrivateAddress, normalizeTarget, parseLinks, urlProblem } from "./linkCheck";

describe("isPrivateAddress (SSRF guard)", () => {
  it("blocks loopback, private, link-local/metadata, CGNAT and reserved ranges", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "198.18.0.1"]) expect(isPrivateAddress(ip), ip).toBe(true);
    for (const ip of ["::1", "::", "fc00::1", "fd12::1", "fe80::1", "ff02::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1", "not-an-ip"]) expect(isPrivateAddress(ip), ip).toBe(true);
  });
  it("allows public addresses", () => {
    for (const ip of ["8.8.8.8", "93.184.216.34", "172.32.0.1", "172.15.0.1", "2606:4700:4700::1111", "::ffff:8.8.8.8"]) expect(isPrivateAddress(ip), ip).toBe(false);
  });
});

describe("urlProblem", () => {
  it("accepts ordinary public https/http addresses", () => {
    expect(urlProblem("https://example.com/page?x=1")).toBeNull();
    expect(urlProblem("http://example.com:80/")).toBeNull();
  });
  it("rejects internal, odd-scheme, credentialed and odd-port addresses", () => {
    for (const bad of ["http://localhost/", "http://127.0.0.1/", "http://169.254.169.254/latest/meta-data", "http://[::1]/", "http://10.0.0.5/admin", "http://intranet.local/", "ftp://example.com/", "file:///etc/passwd", "javascript:alert(1)", "https://user:pw@example.com/", "https://example.com:8080/", "not a url"]) {
      expect(urlProblem(bad), bad).not.toBeNull();
    }
  });
});

describe("parseLinks / findLinkToSite", () => {
  const html = `
    <p><a href="/relative">Rel</a> <a class="x" HREF='https://www.ostaservices.com/services/ac-repair' rel="NoFollow noopener"><b>AC</b> repair</a></p>
    <a href=https://other.com/>Other</a><a rel="sponsored" href="https://ostaservices.com/">Home</a><a name="no-href">x</a>`;
  const links = parseLinks(html, "https://blog.example.org/post/1");
  it("resolves relative links, reads rel and strips tags from anchor text", () => {
    expect(links.map((l) => l.href)).toEqual(["https://blog.example.org/relative", "https://www.ostaservices.com/services/ac-repair", "https://other.com/", "https://ostaservices.com/"]);
    expect(links[1]).toMatchObject({ rel: "nofollow noopener", text: "AC repair" });
  });
  it("finds a link to our site, ignoring www, and classifies it", () => {
    expect(findLinkToSite(links, "www.ostaservices.com")?.linkType).toBe("nofollow"); // first match is the /services one
    expect(findLinkToSite(links, "www.ostaservices.com", "/")?.linkType).toBe("sponsored");
    expect(findLinkToSite(links, "www.ostaservices.com", "/services/ac-repair/")?.link.text).toBe("AC repair");
  });
  it("returns null when there is no link to us", () => {
    expect(findLinkToSite(links, "nobody.com")).toBeNull();
    expect(findLinkToSite(links, "www.ostaservices.com", "/missing")).toBeNull();
  });
});

describe("normalizeTarget", () => {
  it("accepts site paths and full URLs on our own domain", () => {
    expect(normalizeTarget("/services/ac-repair", "www.ostaservices.com")).toBe("/services/ac-repair");
    expect(normalizeTarget("https://ostaservices.com/blog/x?y=1", "www.ostaservices.com")).toBe("/blog/x?y=1");
    expect(normalizeTarget("https://www.ostaservices.com", "www.ostaservices.com")).toBe("/");
  });
  it("rejects other domains and protocol-relative tricks", () => {
    expect(normalizeTarget("https://evil.com/services", "www.ostaservices.com")).toBeNull();
    expect(normalizeTarget("//evil.com/x", "www.ostaservices.com")).toBeNull();
    expect(normalizeTarget("services", "www.ostaservices.com")).toBeNull();
  });
});
