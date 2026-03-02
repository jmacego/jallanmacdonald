#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOSTED_ZONE_ID="${HOSTED_ZONE_ID:-}"
RECORDS_FILE="${RECORDS_FILE:-$ROOT_DIR/infra/dns/required-records.json}"

if [[ -z "$HOSTED_ZONE_ID" ]]; then
  echo "HOSTED_ZONE_ID is required." >&2
  exit 1
fi

if [[ ! -f "$RECORDS_FILE" ]]; then
  echo "Records file not found: $RECORDS_FILE" >&2
  exit 1
fi

if ! command -v aws >/dev/null 2>&1; then
  echo "aws CLI is required." >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required." >&2
  exit 1
fi

manifest_zone_id="$(jq -r '.hosted_zone_id // ""' "$RECORDS_FILE")"
if [[ -n "$manifest_zone_id" && "$HOSTED_ZONE_ID" != "$manifest_zone_id" ]]; then
  echo "HOSTED_ZONE_ID mismatch. Env: $HOSTED_ZONE_ID, manifest: $manifest_zone_id" >&2
  exit 1
fi

echo "Applying required DNS records from $RECORDS_FILE to zone $HOSTED_ZONE_ID..."

while IFS= read -r record; do
  name="$(jq -r '.name' <<<"$record")"
  type="$(jq -r '.type' <<<"$record")"
  has_alias="$(jq -r 'has("alias_target")' <<<"$record")"

  if [[ "$has_alias" == "true" ]]; then
    alias_dns_name="$(jq -r '.alias_target.dns_name' <<<"$record")"
    alias_zone_id="$(jq -r '.alias_target.hosted_zone_id' <<<"$record")"
    alias_health="$(
      jq -r '.alias_target.evaluate_target_health // false' <<<"$record"
    )"
    batch="$(
      jq -cn \
        --arg name "$name" \
        --arg type "$type" \
        --arg alias_dns_name "$alias_dns_name" \
        --arg alias_zone_id "$alias_zone_id" \
        --argjson alias_health "$alias_health" \
        '{
          Changes: [
            {
              Action: "UPSERT",
              ResourceRecordSet: {
                Name: $name,
                Type: $type,
                AliasTarget: {
                  DNSName: $alias_dns_name,
                  HostedZoneId: $alias_zone_id,
                  EvaluateTargetHealth: $alias_health
                }
              }
            }
          ]
        }'
    )"
  else
    ttl="$(jq -r '.ttl' <<<"$record")"
    values="$(jq -c '.values' <<<"$record")"
    batch="$(
      jq -cn \
        --arg name "$name" \
        --arg type "$type" \
        --argjson ttl "$ttl" \
        --argjson values "$values" \
        '{
          Changes: [
            {
              Action: "UPSERT",
              ResourceRecordSet: {
                Name: $name,
                Type: $type,
                TTL: $ttl,
                ResourceRecords: ($values | map({ Value: . }))
              }
            }
          ]
        }'
    )"
  fi

  aws route53 change-resource-record-sets \
    --hosted-zone-id "$HOSTED_ZONE_ID" \
    --change-batch "$batch" >/dev/null
  echo "Ensured ${type} ${name}"
done < <(jq -c '.records[]' "$RECORDS_FILE")

echo "Verifying DNS records match source-of-truth..."
zone_records_json="$(
  aws route53 list-resource-record-sets \
    --hosted-zone-id "$HOSTED_ZONE_ID" \
    --output json
)"

errors=0
while IFS= read -r record; do
  name="$(jq -r '.name' <<<"$record")"
  type="$(jq -r '.type' <<<"$record")"

  actual_record="$(
    jq -c --arg name "$name" --arg type "$type" '
      .ResourceRecordSets[]
      | select(.Name == $name and .Type == $type)
    ' <<<"$zone_records_json" | head -n1
  )"

  if [[ -z "$actual_record" ]]; then
    echo "ERROR: Missing ${type} ${name}" >&2
    errors=$((errors + 1))
    continue
  fi

  has_alias="$(jq -r 'has("alias_target")' <<<"$record")"
  if [[ "$has_alias" == "true" ]]; then
    expected_dns="$(jq -r '.alias_target.dns_name' <<<"$record")"
    expected_zone_id="$(jq -r '.alias_target.hosted_zone_id' <<<"$record")"
    expected_health="$(jq -r '.alias_target.evaluate_target_health // false' <<<"$record")"
    actual_dns="$(jq -r '.AliasTarget.DNSName // ""' <<<"$actual_record")"
    actual_zone_id="$(jq -r '.AliasTarget.HostedZoneId // ""' <<<"$actual_record")"
    actual_health="$(jq -r '.AliasTarget.EvaluateTargetHealth // false' <<<"$actual_record")"

    if [[ "$expected_dns" != "$actual_dns" || "$expected_zone_id" != "$actual_zone_id" || "$expected_health" != "$actual_health" ]]; then
      echo "ERROR: Alias mismatch for ${type} ${name}" >&2
      echo "  expected: dns=${expected_dns} zone=${expected_zone_id} health=${expected_health}" >&2
      echo "  actual:   dns=${actual_dns} zone=${actual_zone_id} health=${actual_health}" >&2
      errors=$((errors + 1))
    fi
  else
    expected_ttl="$(jq -r '.ttl' <<<"$record")"
    actual_ttl="$(jq -r '.TTL // ""' <<<"$actual_record")"
    expected_values="$(jq -c '.values | sort' <<<"$record")"
    actual_values="$(jq -c '((.ResourceRecords // []) | map(.Value) | sort)' <<<"$actual_record")"

    if [[ "$expected_ttl" != "$actual_ttl" || "$expected_values" != "$actual_values" ]]; then
      echo "ERROR: Value mismatch for ${type} ${name}" >&2
      echo "  expected ttl=${expected_ttl} values=${expected_values}" >&2
      echo "  actual   ttl=${actual_ttl} values=${actual_values}" >&2
      errors=$((errors + 1))
    fi
  fi
done < <(jq -c '.records[]' "$RECORDS_FILE")

if [[ "$errors" -gt 0 ]]; then
  echo "DNS verification failed with $errors mismatch(es)." >&2
  exit 1
fi

echo "DNS records match source-of-truth."
