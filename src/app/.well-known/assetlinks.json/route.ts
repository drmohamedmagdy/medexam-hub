// Digital Asset Links file required by Android Trusted Web Activities.
// Served at https://medexamhub.org/.well-known/assetlinks.json and read
// by Chrome on Android to verify that the package_name + signing
// fingerprint below is allowed to render this website without a URL bar.
//
// HOW TO FILL THE FINGERPRINT
//   1. Build the TWA AAB on PWABuilder.com (or via Bubblewrap CLI).
//   2. The build output reports the SHA256 cert fingerprint of the signing
//      key — looks like "12:34:AB:CD:..." (32 hex pairs, colon-separated).
//   3. Paste that value into the PLAY_STORE_SIGNING_FINGERPRINT env var
//      in Vercel. After Google enrolls our app in Play App Signing, also
//      add the "App signing key" fingerprint from Play Console →
//      Setup → App integrity. Both fingerprints can coexist here.
//
// The env var is read at request time so we can update it without a code
// change once we have the real fingerprint. Until then we serve an empty
// array which is valid JSON — TWA won't verify, but the route exists so
// PWABuilder's pre-checks won't fail with a 404.

export const dynamic = "force-dynamic";

const PACKAGE_NAME = "org.medexamhub.twa";

function fingerprintsFromEnv(): string[] {
  const raw = process.env.PLAY_STORE_SIGNING_FINGERPRINT;
  if (!raw) return [];
  // Comma-separated so we can list both the upload key and the Play App
  // Signing key. Strip whitespace; preserve the colon-separated hex format.
  return raw
    .split(",")
    .map((f) => f.trim())
    .filter((f) => /^[0-9A-Fa-f:]{60,}$/.test(f));
}

export function GET() {
  const fingerprints = fingerprintsFromEnv();
  const body = [
    {
      relation: [
        "delegate_permission/common.handle_all_urls",
        "delegate_permission/common.use_as_origin",
      ],
      target: {
        namespace: "android_app",
        package_name: PACKAGE_NAME,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];
  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json",
      // Browsers + the Android verifier respect this; short cache so
      // adding a second fingerprint propagates quickly.
      "cache-control": "public, max-age=300",
    },
  });
}
