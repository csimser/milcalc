#!/bin/bash
# scripts/generate-keystore.sh
# Run this ONCE on your Windows machine to create your Android signing keystore.
# Store the keystore and passwords somewhere safe — you cannot change them later
# without re-registering on the Play Store.

set -e

echo "=== Android Keystore Generator ==="
echo ""
echo "You'll need to fill in some details. Use real information — this is legally"
echo "associated with your developer identity on Google Play."
echo ""

read -p "Your full name (e.g. John Smith): " FULL_NAME
read -p "Organization (or your name again): " ORG
read -p "City: " CITY
read -p "State (full name, e.g. Texas): " STATE
read -p "Country code (e.g. US): " COUNTRY
read -p "Keystore filename (default: release.keystore): " KEYSTORE_FILE
KEYSTORE_FILE=${KEYSTORE_FILE:-release.keystore}

echo ""
echo "You'll now be prompted to create TWO passwords:"
echo "  1. The keystore password (protects the whole file)"
echo "  2. The key password (protects the signing key inside)"
echo "Use the same password for both to keep things simple."
echo ""

keytool -genkey -v \
  -keystore "$KEYSTORE_FILE" \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias key0 \
  -dname "CN=$FULL_NAME, OU=$ORG, O=$ORG, L=$CITY, ST=$STATE, C=$COUNTRY"

echo ""
echo "✅ Keystore created: $KEYSTORE_FILE"
echo ""
echo "Next steps:"
echo "  1. Copy this file somewhere SAFE (not in git — it's in .gitignore)"
echo "  2. Base64 encode it for GitHub:"
echo "     On Windows (PowerShell):  [Convert]::ToBase64String([IO.File]::ReadAllBytes('$KEYSTORE_FILE')) | clip"
echo "     On Linux/Mac:             cat $KEYSTORE_FILE | base64 | xclip"
echo "  3. Add the result as GitHub Secret: ANDROID_KEYSTORE_BASE64"
echo "  4. Add your passwords as: ANDROID_KEYSTORE_PASSWORD and ANDROID_KEY_PASSWORD"
echo "  5. Add ANDROID_KEY_ALIAS = key0"
