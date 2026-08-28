#!/usr/bin/env node

const rawBaseUrl = process.env.BASE_URL || process.argv.find((arg) => arg.startsWith("http"));
if (!rawBaseUrl) {
  console.error("Usage: BASE_URL=https://your-domain.com npm run smoke:production");
  process.exit(1);
}

let baseUrl;
try {
  baseUrl = new URL(rawBaseUrl);
} catch {
  console.error("BASE_URL must be a valid absolute http:// or https:// URL.");
  process.exit(1);
}

const tests = [
  ["Homepage", "/", [200]],
  ["Course catalog", "/courses", [200]],
  ["Login", "/login", [200]],
  ["Signup", "/signup", [200]],
  ["Certificate verification", "/verify", [200]],
  ["Contact", "/contact", [200]],
  ["Privacy", "/privacy", [200]],
  ["Terms", "/terms", [200]],
  // Dashboard auth is enforced by RequireAuth after the client page shell
  // loads, so an HTTP-only probe may correctly receive 200 here.
  ["Dashboard route shell", "/dashboard", [200, 301, 302, 303, 307, 308]],
  ["Admin protection", "/admin", [301, 302, 303, 307, 308]],
  ["Branded not-found route", "/phase21-smoke-test-not-found", [404]],
];

let failures = 0;
console.log(`Smoke testing ${baseUrl.origin}`);

for (const [name, route, expected] of tests) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(new URL(route, baseUrl), {
      redirect: "manual",
      signal: controller.signal,
      headers: { "user-agent": "Next-Horizon-Launch-Smoke-Test/1.0" },
    });
    const redirectLocation = response.headers.get("location") || "";
    const statusOk = expected.includes(response.status);
    const redirectOk = name === "Admin protection"
      ? redirectLocation === "/" || redirectLocation.includes("/login")
      : true;
    if (statusOk && redirectOk) {
      console.log(`PASS ${name}: ${response.status}`);
    } else {
      failures += 1;
      console.error(`FAIL ${name}: received ${response.status}${redirectLocation ? ` -> ${redirectLocation}` : ""}; expected ${expected.join("/")}`);
    }
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${name}: ${error.name === "AbortError" ? "timed out" : error.message}`);
  } finally {
    clearTimeout(timeout);
  }
}

console.log(`${tests.length - failures}/${tests.length} smoke tests passed.`);
process.exitCode = failures === 0 ? 0 : 1;
