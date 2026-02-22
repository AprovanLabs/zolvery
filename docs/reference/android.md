# Android Release Setup

This workflow needs release signing values stored in GitHub Actions. Add them as repository secrets so the release bundle can be produced.

## Create a keystore

1. Generate a keystore and key:

```bash
keytool -genkeypair -v \
	-keystore release.jks \
	-alias aprovan \
	-keyalg RSA -keysize 2048 -validity 10000
```

- **Organizational Unit**: Engineering
- **Organization**: Aprovan
- **Country Code**: US

2. Base64-encode the keystore for storage in Actions:

```bash
base64 -i release.jks | pbcopy
```

## Add GitHub Actions secrets

In the repo: Settings -> Secrets and variables -> Actions -> New repository secret.

Add the following secrets:

- `RELEASE_KEYSTORE`: Base64-encoded contents of `release.jks` from step 2.
- `RELEASE_KEYSTORE_ALIAS`: The `-alias` value from step 1 (example: `aprovan`).
- `RELEASE_KEYSTORE_PASSWORD`: The "Enter keystore password" value from step 1.
- `RELEASE_KEYSTORE_ALIAS_PASSWORD`: The "Enter key password" value from step 1. If you left it blank, use the same value as `RELEASE_KEYSTORE_PASSWORD`.
- `RELEASE_KEYSTORE_PASSPHRASE`: Use the same value as `RELEASE_KEYSTORE_PASSWORD` unless you set a distinct keystore passphrase in step 1.

## Build a release bundle

Run the Build Android workflow with `build_type` set to `release`.
