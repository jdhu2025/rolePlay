# Creem Dashboard Review Checklist

> Date: 2026-06-16 Asia/Shanghai
>
> Product name for review: Keepsay
>
> Purpose: external Creem dashboard verification before requesting re-review. The codebase sends Keepsay product names to local order records and uses `creem_product_ids` to map local pricing ids to Creem product ids, but the hosted Creem checkout display depends on the product records configured in Creem.

## Required Store Settings

```text
Store / project display name: Keepsay
Support email: support@keepsay.dpdns.org
Public product description: Fictional character creation and interactive storytelling.
Must not describe the store as: dating, adult chatbot, NSFW chatbot, AI girlfriend/boyfriend, escort, deepfake, or face-swap.
```

## Required Product Names

Verify every active Creem product used by `creem_product_ids` has a Keepsay display name:

| Local pricing `product_id` | Required Creem product display name |
| --- | --- |
| `roleplay-first-spark` | Keepsay First Spark |
| `roleplay-spark` | Keepsay Spark Credits |
| `roleplay-glow` | Keepsay Glow Credits |
| `roleplay-lite-monthly` | Keepsay Lite Monthly |
| `roleplay-plus-monthly` | Keepsay Plus Monthly |
| `roleplay-pro-monthly` | Keepsay Pro Monthly |
| `roleplay-lite-yearly` | Keepsay Lite Yearly |
| `roleplay-plus-yearly` | Keepsay Plus Yearly |
| `roleplay-pro-yearly` | Keepsay Pro Yearly |

If a product is inactive or not offered during review, remove it from `creem_product_ids` or keep it disabled in Creem.

## Required Mapping

In Admin -> Settings -> Payment -> Creem Product IDs Mapping, use the active Creem product ids:

```json
{
  "roleplay-first-spark": "prod_xxx",
  "roleplay-spark": "prod_xxx",
  "roleplay-glow": "prod_xxx",
  "roleplay-lite-monthly": "prod_xxx",
  "roleplay-plus-monthly": "prod_xxx",
  "roleplay-pro-monthly": "prod_xxx",
  "roleplay-lite-yearly": "prod_xxx",
  "roleplay-plus-yearly": "prod_xxx",
  "roleplay-pro-yearly": "prod_xxx"
}
```

## Hosted Checkout Spot Check

Before re-review, create one sandbox checkout for each active product and confirm:

- Checkout page shows Keepsay product naming.
- Checkout page does not show RolePlay, Talkie, Crushly, dating, adult, NSFW, girlfriend, boyfriend, or unfiltered wording.
- Success/cancel paths return to Keepsay pages.
- Order records in `/settings/payments` show Keepsay product names.

## Re-Review Links

- Homepage: `/`
- Pricing: `/pricing`
- Safety: `/safety`
- Terms of Service: `/terms-of-service`
- Privacy Policy: `/privacy-policy`
- Acceptable Use Policy: `/acceptable-use-policy`
- Support: `support@keepsay.dpdns.org`
