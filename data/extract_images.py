import fitz, json, re, os

SRC = r"C:\Users\AbdullahRiaz\Downloads\NR\latest catalouge.pdf"
OUT_DIR = r"C:\Users\AbdullahRiaz\Downloads\NR\site\assets\products"
os.makedirs(OUT_DIR, exist_ok=True)

def sanitize(s):
    return re.sub(r"[^A-Za-z0-9_-]", "_", s)

doc = fitz.open(SRC)

LEFT_TEXT_X = 38.4
RIGHT_TEXT_X = 290.4
LEFT_IMG_X = 211.2
RIGHT_IMG_X = 463.2
TOL = 3

records = []  # {itemId, oem, name, page, col}
skipped_rows = []

for pno in range(doc.page_count):
    page = doc[pno]
    blocks = page.get_text("blocks")
    # collect product text blocks per column, y0>60 to skip header, skip footer 'Page X of'
    cols = {"L": [], "R": []}
    for b in blocks:
        x0, y0, x1, y1, text, bno, btype = b
        if y0 < 60:
            continue
        if text.strip().lower().startswith("page "):
            continue
        if abs(x0 - LEFT_TEXT_X) < TOL:
            cols["L"].append((y0, text.strip()))
        elif abs(x0 - RIGHT_TEXT_X) < TOL:
            cols["R"].append((y0, text.strip()))

    for col, img_x in (("L", LEFT_IMG_X), ("R", RIGHT_IMG_X)):
        rows = sorted(cols[col], key=lambda t: t[0])
        # pair consecutive (id/oem, name) blocks
        pairs = []
        i = 0
        while i < len(rows) - 1:
            y_id, id_text = rows[i]
            y_name, name_text = rows[i + 1]
            lines = [l for l in id_text.split("\n") if l.strip()]
            if len(lines) >= 1:
                item_id = lines[0].strip()
                oem = lines[1].strip() if len(lines) > 1 else ""
                name = " ".join(name_text.split("\n")).strip()
                pairs.append({"y": (y_id + y_name) / 2, "itemId": item_id, "oem": oem, "name": name})
            i += 2



        # gather images in this column band, dedup by rounded rect
        img_entries = []
        seen_rects = set()
        for im in page.get_images(full=True):
            xref = im[0]
            for r in page.get_image_rects(xref):
                if abs(r.x0 - img_x) < TOL:
                    key = (round(r.x0), round(r.y0), round(r.x1), round(r.y1))
                    if key in seen_rects:
                        continue
                    seen_rects.add(key)
                    img_entries.append({"y": (r.y0 + r.y1) / 2, "xref": xref, "rect": key})
        img_entries.sort(key=lambda e: e["y"])

        used = [False] * len(img_entries)
        for pair in pairs:
            best_idx, best_dist = None, 1e9
            for idx, ie in enumerate(img_entries):
                if used[idx]:
                    continue
                dist = abs(ie["y"] - pair["y"])
                if dist < best_dist:
                    best_dist = dist
                    best_idx = idx
            if best_idx is not None and best_dist < 60:
                used[best_idx] = True
                xref = img_entries[best_idx]["xref"]
                try:
                    img_dict = doc.extract_image(xref)
                    ext = img_dict["ext"]
                    fname = f"{sanitize(pair['itemId'])}.{ext}"
                    fpath = os.path.join(OUT_DIR, fname)
                    if not os.path.exists(fpath):
                        with open(fpath, "wb") as f:
                            f.write(img_dict["image"])
                    records.append({
                        "itemId": pair["itemId"],
                        "oem": pair["oem"],
                        "name": pair["name"],
                        "file": fname,
                        "page": pno + 1,
                    })
                except Exception as e:
                    skipped_rows.append((pno + 1, pair["itemId"], str(e)))
            else:
                skipped_rows.append((pno + 1, pair["itemId"], "no image match"))

print("Extracted records:", len(records))
print("Skipped:", len(skipped_rows))
for s in skipped_rows[:30]:
    print("  skip:", s)

with open(r"C:\Users\AbdullahRiaz\Downloads\NR\site\data\image_records.json", "w", encoding="utf-8") as f:
    json.dump(records, f, indent=1)
