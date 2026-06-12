from docx import Document
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


OUTPUT = "Nivaana_Homepage_Image_Aspect_Ratio_Guide.docx"


def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_margins(cell, top=90, start=130, bottom=90, end=130):
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for margin, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{margin}"))
        if node is None:
            node = OxmlElement(f"w:{margin}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_table_width(table, widths_dxa):
    table.alignment = WD_TABLE_ALIGNMENT.LEFT
    tbl = table._tbl
    tbl_pr = tbl.tblPr
    tbl_w = tbl_pr.find(qn("w:tblW"))
    if tbl_w is None:
        tbl_w = OxmlElement("w:tblW")
        tbl_pr.append(tbl_w)
    tbl_w.set(qn("w:type"), "dxa")
    tbl_w.set(qn("w:w"), str(sum(widths_dxa)))

    tbl_ind = tbl_pr.find(qn("w:tblInd"))
    if tbl_ind is None:
        tbl_ind = OxmlElement("w:tblInd")
        tbl_pr.append(tbl_ind)
    tbl_ind.set(qn("w:w"), "120")
    tbl_ind.set(qn("w:type"), "dxa")

    tbl_grid = tbl.tblGrid
    if tbl_grid is None:
        tbl_grid = OxmlElement("w:tblGrid")
        tbl.insert(0, tbl_grid)
    for child in list(tbl_grid):
        tbl_grid.remove(child)
    for width in widths_dxa:
        grid_col = OxmlElement("w:gridCol")
        grid_col.set(qn("w:w"), str(width))
        tbl_grid.append(grid_col)

    for row in table.rows:
        for idx, cell in enumerate(row.cells):
            tc_pr = cell._tc.get_or_add_tcPr()
            tc_w = tc_pr.find(qn("w:tcW"))
            if tc_w is None:
                tc_w = OxmlElement("w:tcW")
                tc_pr.append(tc_w)
            tc_w.set(qn("w:type"), "dxa")
            tc_w.set(qn("w:w"), str(widths_dxa[idx]))


def set_table_borders(table, color="D8DEE8"):
    tbl_pr = table._tbl.tblPr
    borders = tbl_pr.find(qn("w:tblBorders"))
    if borders is None:
        borders = OxmlElement("w:tblBorders")
        tbl_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        tag = qn(f"w:{edge}")
        element = borders.find(tag)
        if element is None:
            element = OxmlElement(f"w:{edge}")
            borders.append(element)
        element.set(qn("w:val"), "single")
        element.set(qn("w:sz"), "4")
        element.set(qn("w:space"), "0")
        element.set(qn("w:color"), color)


def style_paragraph(paragraph, size=10.5, bold=False, color="1F2937", after=0):
    paragraph.paragraph_format.space_after = Pt(after)
    paragraph.paragraph_format.line_spacing = 1.25
    for run in paragraph.runs:
        run.font.name = "Calibri"
        run.font.size = Pt(size)
        run.font.bold = bold
        run.font.color.rgb = RGBColor.from_string(color)


def add_table(document, headers, rows, widths_dxa):
    table = document.add_table(rows=1, cols=len(headers))
    table.style = "Table Grid"
    set_table_borders(table)
    header_cells = table.rows[0].cells
    for idx, header in enumerate(headers):
        header_cells[idx].text = header
        set_cell_shading(header_cells[idx], "E8EEF5")
        set_cell_margins(header_cells[idx])
        header_cells[idx].vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        style_paragraph(header_cells[idx].paragraphs[0], size=8.8, bold=True, color="1F4D78")

    for row in rows:
        cells = table.add_row().cells
        for idx, value in enumerate(row):
            cells[idx].text = value
            set_cell_margins(cells[idx])
            cells[idx].vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            style_paragraph(cells[idx].paragraphs[0], size=8.6, color="111827")

    set_table_width(table, widths_dxa)
    return table


def add_bullet(document, text):
    paragraph = document.add_paragraph(style="List Bullet")
    paragraph.paragraph_format.left_indent = Inches(0.375)
    paragraph.paragraph_format.first_line_indent = Inches(-0.188)
    paragraph.paragraph_format.space_after = Pt(4)
    paragraph.paragraph_format.line_spacing = 1.25
    run = paragraph.add_run(text)
    run.font.name = "Calibri"
    run.font.size = Pt(10.5)
    run.font.color.rgb = RGBColor(31, 41, 55)


def add_heading(document, text, level=1):
    paragraph = document.add_paragraph()
    paragraph.style = f"Heading {level}"
    paragraph.add_run(text)
    return paragraph


def main():
    doc = Document()
    section = doc.sections[0]
    section.page_width = Inches(8.5)
    section.page_height = Inches(11)
    section.top_margin = Inches(1)
    section.bottom_margin = Inches(1)
    section.left_margin = Inches(1)
    section.right_margin = Inches(1)
    section.header_distance = Inches(0.492)
    section.footer_distance = Inches(0.492)

    styles = doc.styles
    styles["Normal"].font.name = "Calibri"
    styles["Normal"].font.size = Pt(11)
    styles["Normal"].paragraph_format.space_after = Pt(6)
    styles["Normal"].paragraph_format.line_spacing = 1.25

    for name, size, color, before, after in (
        ("Heading 1", 16, "2E74B5", 18, 10),
        ("Heading 2", 13, "2E74B5", 14, 7),
        ("Heading 3", 12, "1F4D78", 10, 5),
    ):
        style = styles[name]
        style.font.name = "Calibri"
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = RGBColor.from_string(color)
        style.paragraph_format.space_before = Pt(before)
        style.paragraph_format.space_after = Pt(after)
        style.paragraph_format.line_spacing = 1.25

    header = section.header.paragraphs[0]
    header.text = "Nivaana E-Com Web"
    header.runs[0].font.name = "Calibri"
    header.runs[0].font.size = Pt(8.5)
    header.runs[0].font.color.rgb = RGBColor(107, 114, 128)

    footer = section.footer.paragraphs[0]
    footer.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    footer.text = "Homepage image aspect ratio guide"
    footer.runs[0].font.name = "Calibri"
    footer.runs[0].font.size = Pt(8.5)
    footer.runs[0].font.color.rgb = RGBColor(107, 114, 128)

    title = doc.add_paragraph()
    title.paragraph_format.space_after = Pt(4)
    title_run = title.add_run("Nivaana Homepage Image Aspect Ratio Guide")
    title_run.font.name = "Calibri"
    title_run.font.size = Pt(22)
    title_run.font.bold = True
    title_run.font.color.rgb = RGBColor(31, 58, 95)

    subtitle = doc.add_paragraph()
    subtitle.paragraph_format.space_after = Pt(10)
    subtitle_run = subtitle.add_run(
        "Upload and export ratios for hero carousel media, deal cards, flavour cards, category cards, and product card images in the current Nivaana E-Com Web homepage."
    )
    subtitle_run.font.name = "Calibri"
    subtitle_run.font.size = Pt(10.5)
    subtitle_run.font.italic = True
    subtitle_run.font.color.rgb = RGBColor(75, 85, 99)

    add_heading(doc, "Executive Recommendation", 1)
    p = doc.add_paragraph()
    p.add_run("Use separate asset masters by placement. ").bold = True
    p.add_run(
        "The current homepage uses wide hero media, near-square promotional cards, and slightly wide product-card image frames. Most images use object-cover, so tight product crops or baked-in text can be clipped."
    )
    style_paragraph(p, size=10.5, after=4)

    add_bullet(doc, "Hero carousel: desktop 21:9 or 12:5; mobile 1:1 or 4:5 if mobile-specific assets are wired in.")
    add_bullet(doc, "Deals and flavours: 1:1 square images work best because the cards are near-square and use object-cover.")
    add_bullet(doc, "Product images: use a near-square master, ideally 9:8 or 16:15, with the product inside the center 80% safe area.")
    add_bullet(doc, "Category carousel: use 16:9-ish imagery but keep the subject centered because mobile crops differently.")

    add_heading(doc, "Current App Behavior", 1)
    add_table(
        doc,
        ["Placement", "Current UI Ratio", "Fit Mode", "Recommended Upload"],
        [
            ["Hero carousel desktop", "Variable, approx 2.0:1 to 2.4:1", "object-cover or object-contain by slide/config", "12:5 or 21:9, e.g. 2400 x 1000, 2560 x 1080, 2560 x 1160"],
            ["Hero carousel mobile", "Approx 1:1 on common phones", "Same desktop asset currently used", "1:1 or 4:5, e.g. 1200 x 1200 or 1080 x 1350"],
            ["Deal of the Day cards", "Near square, approx 0.9:1 to 1:1", "object-cover", "1:1, e.g. 1200 x 1200 or 1600 x 1600"],
            ["Flavours cards", "Same as deal cards", "object-cover", "1:1, e.g. 1200 x 1200"],
            ["Homepage compact product cards", "4:3.55, approx 1.13:1", "object-cover", "9:8 or lightly wide square, e.g. 1440 x 1280"],
            ["General product cards", "4:3.75, approx 1.07:1", "object-cover", "Near-square, e.g. 1280 x 1200 or 1600 x 1500"],
            ["Category/fragrance carousel", "Mobile approx 1.16:1; desktop up to 1.83:1", "object-cover", "16:9, with subject centered for responsive crop"],
        ],
        [1890, 1770, 1890, 3810],
    )

    add_heading(doc, "Recommended Production Specs", 1)
    add_table(
        doc,
        ["Asset Type", "Master Ratio", "Export Size", "Safe-Area Guidance"],
        [
            ["Hero desktop image/video", "21:9 or 12:5", "2560 x 1080 or 2400 x 1000", "Keep key product or scene center-left/center. Avoid text inside media."],
            ["Hero mobile image/video", "1:1 or 4:5", "1200 x 1200 or 1080 x 1350", "Use a separate crop when available. Keep subject readable in narrow viewports."],
            ["Deal image", "1:1", "1200 x 1200 minimum; 1600 x 1600 ideal", "Compose as a promotional tile. Leave room at bottom for gradient/title overlay."],
            ["Flavour image", "1:1", "1200 x 1200", "Use mood/category imagery. Avoid tall product close-ups unless centered."],
            ["Product catalog image", "9:8 or 16:15", "1440 x 1280 or 1600 x 1500", "Keep product inside center 80%; leave background padding on all sides."],
            ["Category carousel image", "16:9", "1920 x 1080", "Center the subject so mobile and desktop crops both look intentional."],
        ],
        [1840, 1180, 2060, 4280],
    )

    add_heading(doc, "Implementation Notes", 1)
    p = doc.add_paragraph()
    p.add_run("Why images can look cropped: ").bold = True
    p.add_run(
        "Deal cards, flavour cards, category cards, and product cards all use object-cover. The image fills the frame and any extra width or height is cropped. Hero slides can use object-cover or object-contain depending on each slide's fit setting."
    )
    style_paragraph(p, size=10.5, after=4)

    add_bullet(doc, "Do not put important text inside images or videos; keep text in the website layer.")
    add_bullet(doc, "For product images, avoid edge-to-edge packaging crops. Leave clean negative space around the product.")
    add_bullet(doc, "If one product image must be reused everywhere, near-square with generous padding is the safest compromise.")
    add_bullet(doc, "If the admin panel supports mobile hero URLs later, upload mobile-specific hero crops instead of relying on desktop media.")

    doc.save(OUTPUT)


if __name__ == "__main__":
    main()
