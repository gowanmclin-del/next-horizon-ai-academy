#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const rawLine of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

loadEnvFile(path.resolve(".env.local"));
loadEnvFile(path.resolve(".env"));

const production = process.argv.includes("--production") || process.env.NODE_ENV === "production";
const errors = [];
const warnings = [];

function present(name) {
  return Boolean(process.env[name]?.trim());
}

function requireValue(name, description) {
  if (!present(name)) errors.push(`${name}: missing (${description})`);
}

for (const [name, description] of [
  ["NEXT_PUBLIC_SUPABASE_URL", "Supabase project URL"],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "Supabase public anon key"],
  ["SUPABASE_SERVICE_ROLE_KEY", "server-only webhook database key"],
  ["NEXT_PUBLIC_SITE_URL", "canonical site and checkout redirect URL"],
  ["STRIPE_SECRET_KEY", "Stripe Checkout server key"],
  ["STRIPE_WEBHOOK_SECRET", "Stripe webhook signature secret"],
]) requireValue(name, description);

if (present("NEXT_PUBLIC_SUPABASE_URL")) {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
    if (url.protocol !== "https:") errors.push("NEXT_PUBLIC_SUPABASE_URL: must use https://");
  } catch {
    errors.push("NEXT_PUBLIC_SUPABASE_URL: must be a valid absolute URL");
  }
}

if (present("NEXT_PUBLIC_SITE_URL")) {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SITE_URL);
    if (production && url.protocol !== "https:") errors.push("NEXT_PUBLIC_SITE_URL: production must use https://");
    if (production && ["localhost", "127.0.0.1"].includes(url.hostname)) {
      errors.push("NEXT_PUBLIC_SITE_URL: production cannot use localhost");
    }
  } catch {
    errors.push("NEXT_PUBLIC_SITE_URL: must be a valid absolute URL");
  }
}

if (present("STRIPE_SECRET_KEY") && !/^sk_(test|live)_/.test(process.env.STRIPE_SECRET_KEY)) {
  errors.push("STRIPE_SECRET_KEY: expected an sk_test_ or sk_live_ key");
}
if (present("STRIPE_WEBHOOK_SECRET") && !process.env.STRIPE_WEBHOOK_SECRET.startsWith("whsec_")) {
  errors.push("STRIPE_WEBHOOK_SECRET: expected a whsec_ secret");
}
if (present("STRIPE_SECRET_KEY") && production && process.env.STRIPE_SECRET_KEY.startsWith("sk_test_")) {
  warnings.push("Stripe is still in test mode. This is correct for acceptance testing, but not for paid launch.");
}

if (!present("RESEND_API_KEY") || !present("EMAIL_FROM")) {
  warnings.push("Resend email is incomplete; transactional emails will be skipped.");
}
if (!present("NEXT_PUBLIC_CONTACT_EMAIL")) warnings.push("Public contact email is not configured.");
if (!present("ERROR_MONITORING_DSN")) warnings.push("External error monitoring is not configured.");

console.log(`Environment check: ${production ? "production" : "development"}`);
console.log(`Required checks: ${errors.length === 0 ? "PASS" : "FAIL"}`);
for (const message of errors) console.error(`ERROR: ${message}`);
for (const message of warnings) console.warn(`WARNING: ${message}`);
console.log("Secret values were not printed.");

process.exitCode = errors.length === 0 ? 0 : 1;

