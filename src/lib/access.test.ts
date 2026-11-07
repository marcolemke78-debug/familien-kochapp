import { describe, it, expect, beforeAll } from "vitest";
import { SignJWT, generateKeyPair, exportJWK, createLocalJWKSet, type JWTVerifyGetKey } from "jose";
import { verifyAccessJwt, resolveEmail, displayNameFromEmail } from "./access";

// Erfundene Testwerte – kein echtes Team, keine echte Adresse
const TEAM = "testteam.cloudflareaccess.com";
const AUD = "test-aud-123";
const config = { teamDomain: TEAM, aud: AUD };

let privateKey: CryptoKey;
let getKey: JWTVerifyGetKey;

beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  privateKey = pair.privateKey;
  const jwk = await exportJWK(pair.publicKey);
  jwk.kid = "test-key";
  jwk.alg = "RS256";
  getKey = createLocalJWKSet({ keys: [jwk] });
});

function token(claims: Record<string, unknown> = {}, opts: { iss?: string; aud?: string; exp?: string } = {}) {
  return new SignJWT({ email: "Testperson@Example.org", ...claims })
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuer(opts.iss ?? `https://${TEAM}`)
    .setAudience(opts.aud ?? AUD)
    .setIssuedAt()
    .setExpirationTime(opts.exp ?? "1h")
    .sign(privateKey);
}

describe("verifyAccessJwt", () => {
  it("liefert die E-Mail (klein geschrieben) bei gültigem Token", async () => {
    expect(await verifyAccessJwt(await token(), config, getKey)).toEqual({ email: "testperson@example.org" });
  });
  it("lehnt falsche Audience ab", async () => {
    expect(await verifyAccessJwt(await token({}, { aud: "andere-app" }), config, getKey)).toBeNull();
  });
  it("lehnt falschen Aussteller ab", async () => {
    expect(await verifyAccessJwt(await token({}, { iss: "https://boese.cloudflareaccess.com" }), config, getKey)).toBeNull();
  });
  it("lehnt abgelaufene Tokens ab", async () => {
    expect(await verifyAccessJwt(await token({}, { exp: "-1m" }), config, getKey)).toBeNull();
  });
  it("lehnt Token ohne E-Mail ab", async () => {
    expect(await verifyAccessJwt(await token({ email: undefined }), config, getKey)).toBeNull();
  });
  it("lehnt fehlendes oder kaputtes Token ab", async () => {
    expect(await verifyAccessJwt(null, config, getKey)).toBeNull();
    expect(await verifyAccessJwt("kein.jwt.token", config, getKey)).toBeNull();
  });
  it("lehnt ab, wenn die Konfiguration fehlt oder die Team-Domain ungültig ist", async () => {
    const t = await token();
    expect(await verifyAccessJwt(t, { teamDomain: "", aud: AUD }, getKey)).toBeNull();
    expect(await verifyAccessJwt(t, { teamDomain: TEAM, aud: "" }, getKey)).toBeNull();
    expect(await verifyAccessJwt(t, { teamDomain: "evil.example.com", aud: AUD }, getKey)).toBeNull();
  });
});

describe("resolveEmail", () => {
  it("nutzt in Produktion nur ein gültiges Token", async () => {
    expect(await resolveEmail({ token: null, config, nodeEnv: "production", getKey })).toBeNull();
    expect(await resolveEmail({ token: await token(), config, nodeEnv: "production", getKey })).toBe("testperson@example.org");
  });
  it("nutzt den Test-Nutzer nur in der lokalen Entwicklung", async () => {
    expect(await resolveEmail({ token: null, config, nodeEnv: "development", getKey })).toBe("dev@familie.test");
    expect(await resolveEmail({ token: null, config, nodeEnv: "test", getKey })).toBeNull();
  });
});

describe("displayNameFromEmail", () => {
  it("macht aus dem Teil vor dem @ einen Namen", () => {
    expect(displayNameFromEmail("anna.test@example.org")).toBe("Anna");
    expect(displayNameFromEmail("x@example.org")).toBe("X");
    expect(displayNameFromEmail("testperson42@example.org")).toBe("Testperson");
    expect(displayNameFromEmail("123@example.org")).toBe("123");
  });
});
