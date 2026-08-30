import json, re

BRANDS = {"NR", "NISMU", "SGP", "GENIUNE"}

with open("raw_catalog.txt", "r", encoding="utf-8") as f:
    lines = [l.rstrip("\n") for l in f if l.strip()]

items = []
category = ""
make = ""
seen = set()
idx = 0
skipped = []

for line in lines:
    if line.startswith("##"):
        category = line[2:].strip()
        raw_make = category.split()[0].rstrip("/")
        ACRONYMS = {"MG", "FAW", "JAC"}
        make = raw_make if raw_make in ACRONYMS else raw_make.title()
        continue
    tokens = line.split()
    if len(tokens) < 3:
        skipped.append(line)
        continue
    rate_tok = tokens[-1]
    brand_tok = tokens[-2]
    if brand_tok not in BRANDS:
        skipped.append(line)
        continue
    rate_clean = rate_tok.replace(",", "")
    try:
        rate = int(rate_clean)
    except ValueError:
        skipped.append(line)
        continue
    item_id = tokens[0]
    desc = " ".join(tokens[1:-2]).strip()
    if not desc:
        skipped.append(line)
        continue
    key = (item_id, desc, brand_tok, rate, category)
    if key in seen:
        continue
    seen.add(key)
    idx += 1
    items.append({
        "id": idx,
        "itemId": item_id,
        "description": desc,
        "brand": brand_tok,
        "rate": rate,
        "category": category,
        "make": make
    })

print(f"Parsed {len(items)} items, skipped {len(skipped)} lines")
if skipped:
    print("Sample skipped lines:")
    for s in skipped[:20]:
        print("  ", s)

with open("catalog.json", "w", encoding="utf-8") as f:
    json.dump(items, f, indent=0)

makes = sorted(set(i["make"] for i in items))
categories = sorted(set(i["category"] for i in items))
print("Makes:", makes)
print("Num categories:", len(categories))
