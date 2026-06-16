# Product Category Audit

Date: 2026-06-16

## Summary

The current live product feed does not contain products under `Perfumes` or `Personal Care`.

## Current Product Taxonomy

### Categories

| Category | Product Count |
| --- | ---: |
| `home_fragrance` | 38 |
| `home_decor` | 11 |
| `aromatherapy_&_wellness` | 5 |

### Subcategories

| Subcategory | Product Count |
| --- | ---: |
| `incense` | 29 |
| `table_decor` | 11 |
| `car_&_room_fresheners` | 9 |
| `fragrance_blends` | 5 |

### Sub-subcategories

| Sub-subcategory | Product Count |
| --- | ---: |
| `premium_incense_sticks` | 29 |
| `fragrance_sachets` | 6 |
| `room_fresheners` | 3 |

## Perfumes

There are currently no products with perfume-related category or subcategory values.

Suggested action:

- Hide `Perfumes` from the navbar for now, or keep it only if perfume products will be added soon.

To make `Perfumes` work, products should use values such as:

- `category`: `perfumes`
- `subcategory`: `pocket_perfumes`
- `subcategory`: `daily_collection`
- `subcategory`: `luxury_collection`

## Personal Care

There are currently no products with personal-care-related category or subcategory values.

Suggested action:

- Hide `Personal Care` from the navbar for now, or keep it only if personal care products will be added soon.

To make `Personal Care` work, products should use values such as:

- `category`: `personal_care`
- `subcategory`: `soaps`
- `subcategory`: `facewash`
- `subcategory`: `handwash`
- `subcategory`: `floor_cleaner_concentrates`

## Recommended Navbar Groups For Current Data

Based on the products currently available, the navbar should focus on:

- `Incense`
- `Home Fragrance`
- `Car & Room Fresheners`
- `Aromatherapy & Wellness`
- `Gift Collections` / `Home Decor`

## Notes

Some display labels do not match the backend taxonomy exactly. For example:

- `Car & Room Fresheners` maps to backend value `car_&_room_fresheners`.
- `Gift Collections` can currently map to `home_decor` and `table_decor`.
- `Diffuser Oils` currently maps to available `fragrance_blends` products.

