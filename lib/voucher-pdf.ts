import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "fs/promises";
import path from "path";

export type VoucherPDFData = {
  voucher_id: number;
  voucher_date: string;
  payee: string;
  amount: string | number;
  amount_in_words: string;
  type_of_payee: string;
  custom_payee_type?: string | null;
  mode_of_payment: string;
  towards: string;
  payee_pan?: string | null;
  tds?: string | null;
  created_by_name?: string | null;
};

const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;
const MARGIN = 38;

const BLACK = rgb(0, 0, 0);
const GREY = rgb(0.45, 0.45, 0.45);
const LIGHT_GREY = rgb(0.7, 0.7, 0.7);

function formatVoucherDate(value: string) {
  if (!value) return "";

  const s = String(value).trim();

  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (m) {
    return `${m[3]}-${m[2]}-${m[1]}`;
  }

  const d = new Date(s);

  if (!Number.isNaN(d.getTime())) {
    return `${String(d.getDate()).padStart(2, "0")}-${String(
      d.getMonth() + 1
    ).padStart(2, "0")}-${d.getFullYear()}`;
  }

  return s;
}

function wrapText(
  text: string,
  font: any,
  fontSize: number,
  maxWidth: number
) {
  if (!text) return [""];

  const words = text.trim().split(/\s+/);
  const lines: string[] = [];

  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;

    if (font.widthOfTextAtSize(test, fontSize) <= maxWidth) {
      current = test;
    } else {
      if (current) {
        lines.push(current);
      }

      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

export async function generateVoucherPDF(
  vouchers: VoucherPDFData[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  pdfDoc.registerFontkit(fontkit);

  const regularBytes = await fs.readFile(
    path.join(process.cwd(), "public", "fonts", "DejaVuSans.ttf")
  );

  const boldBytes = await fs.readFile(
    path.join(process.cwd(), "public", "fonts", "DejaVuSans-Bold.ttf")
  );

  const regularFont = await pdfDoc.embedFont(regularBytes);
  const boldFont = await pdfDoc.embedFont(boldBytes);

  for (const voucher of vouchers) {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    // Outer voucher border
    page.drawRectangle({
      x: MARGIN,
      y: MARGIN,
      width: PAGE_WIDTH - MARGIN * 2,
      height: PAGE_HEIGHT - MARGIN * 2,
      borderWidth: 1,
      borderColor: BLACK,
    });

    // ---------------------------------------------------------
    // HEADER
    // ---------------------------------------------------------

    const title = "PAYMENT VOUCHER";
    const titleSize = 26;

    const titleWidth = boldFont.widthOfTextAtSize(title, titleSize);

    page.drawText(title, {
      x: (PAGE_WIDTH - titleWidth) / 2,
      y: PAGE_HEIGHT - 67,
      size: titleSize,
      font: boldFont,
    });

    const project = "#99 SESHADRIPURA 2ND MAIN ROAD PROJECT";
    const projectSize = 16;

    const projectWidth = regularFont.widthOfTextAtSize(
      project,
      projectSize
    );

    page.drawText(project, {
      x: (PAGE_WIDTH - projectWidth) / 2,
      y: PAGE_HEIGHT - 95,
      size: projectSize,
      font: regularFont,
    });

    // ---------------------------------------------------------
    // VOUCHER NUMBER
    // ---------------------------------------------------------

    const voucherNumberText = `Voucher No: ${voucher.voucher_id}`;
    const voucherNumberSize = 14;

    const voucherNumberWidth = boldFont.widthOfTextAtSize(
      voucherNumberText,
      voucherNumberSize
    );

    page.drawText(voucherNumberText, {
      x: PAGE_WIDTH - MARGIN - 18 - voucherNumberWidth,
      y: PAGE_HEIGHT - 95,
      size: voucherNumberSize,
      font: boldFont,
      color: BLACK,
    });

    // ---------------------------------------------------------
    // DATE
    // ---------------------------------------------------------

    const dateText = `Date  ${formatVoucherDate(voucher.voucher_date)}`;
    const dateSize = 13;

    const dateWidth = regularFont.widthOfTextAtSize(
      dateText,
      dateSize
    );

    page.drawText(dateText, {
      x: PAGE_WIDTH - MARGIN - 18 - dateWidth,
      y: PAGE_HEIGHT - 122,
      size: dateSize,
      font: regularFont,
    });

    // ---------------------------------------------------------
    // FIELD SETTINGS
    // ---------------------------------------------------------

    const labelX = MARGIN + 18;
    const valueX = MARGIN + 125;
    const rightX = PAGE_WIDTH - MARGIN - 18;

    const labelSize = 13;
    const valueSize = 14;

    let y = PAGE_HEIGHT - 160;

    function drawField(
      label: string,
      value: string,
      height: number,
      multiline = false
    ) {
      page.drawText(label, {
        x: labelX,
        y,
        size: labelSize,
        font: regularFont,
      });

      const lines = wrapText(
        value,
        boldFont,
        valueSize,
        rightX - valueX
      );

      lines.forEach((line, i) => {
        page.drawText(line, {
          x: valueX,
          y: y - i * 18,
          size: valueSize,
          font: boldFont,
        });
      });

      page.drawLine({
        start: {
          x: valueX,
          y: y - 7,
        },
        end: {
          x: rightX,
          y: y - 7,
        },
        thickness: 0.5,
        color: LIGHT_GREY,
      });

      y -= height;
    }

    // ---------------------------------------------------------
    // PAID TO
    // ---------------------------------------------------------

    const payeeType =
      voucher.type_of_payee === "Custom"
        ? voucher.custom_payee_type || "Custom"
        : voucher.type_of_payee;

    drawField(
      "Paid to",
      payeeType
        ? `${voucher.payee} (${payeeType})`
        : voucher.payee,
      45
    );

    // ---------------------------------------------------------
    // AMOUNT
    // ---------------------------------------------------------

    const amount = Number(voucher.amount);

    const formattedAmount = `₹ ${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    drawField(
      "Amount",
      `${formattedAmount} (${voucher.amount_in_words})`,
      57,
      true
    );

    // ---------------------------------------------------------
    // MODE OF PAYMENT
    // ---------------------------------------------------------

    drawField(
      "By way of",
      voucher.mode_of_payment,
      45
    );

    // ---------------------------------------------------------
    // TOWARDS
    // ---------------------------------------------------------

    drawField(
      "Towards",
      voucher.towards,
      57,
      true
    );

    // ---------------------------------------------------------
    // PAN
    // ---------------------------------------------------------

    drawField(
      "Payee PAN No#",
      voucher.payee_pan || "",
      45
    );

    // ---------------------------------------------------------
    // TDS
    // ---------------------------------------------------------

    drawField(
      "TDS (if applicable)",
      voucher.tds || "",
      45
    );

    // ---------------------------------------------------------
    // SIGNATURE SECTION
    // ---------------------------------------------------------

    const signatureLineY = 83;

    const left = MARGIN + 18;
    const right = PAGE_WIDTH - MARGIN - 18;

    const areaWidth = right - left;
    const gap = 50;

    const width = (areaWidth - gap * 2) / 3;

    [
      "Authorized by",
      "Verified by",
      "Receiver's Signature",
    ].forEach((label, index) => {
      const x = left + index * (width + gap);

      page.drawLine({
        start: {
          x,
          y: signatureLineY,
        },
        end: {
          x: x + width,
          y: signatureLineY,
        },
        thickness: 0.8,
        color: BLACK,
      });

      const size = 12;

      const labelWidth = regularFont.widthOfTextAtSize(
        label,
        size
      );

      page.drawText(label, {
        x: x + (width - labelWidth) / 2,
        y: signatureLineY - 19,
        size,
        font: regularFont,
      });
    });
  }

  return pdfDoc.save();
}