import {
  PDFDocument,
  rgb,
} from "pdf-lib";

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

  attachment_data?: Uint8Array | null;
  attachment_mime_type?: string | null;
  attachment_file_name?: string | null;
};

const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;
const MARGIN = 38;

const BLACK = rgb(
  0,
  0,
  0
);

const GREY = rgb(
  0.45,
  0.45,
  0.45
);

const LIGHT_GREY = rgb(
  0.7,
  0.7,
  0.7
);

const ATTACHMENT_GREY =
  rgb(
    0.92,
    0.92,
    0.92
  );

function formatVoucherDate(
  value: string
) {
  if (!value) return "";

  const s =
    String(value).trim();

  const m = s.match(
    /^(\d{4})-(\d{2})-(\d{2})/
  );

  if (m) {
    return `${m[3]}-${m[2]}-${m[1]}`;
  }

  const d = new Date(s);

  if (
    !Number.isNaN(
      d.getTime()
    )
  ) {
    return `${String(
      d.getDate()
    ).padStart(2, "0")}-${String(
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

  const words =
    text.trim().split(
      /\s+/
    );

  const lines: string[] =
    [];

  let current = "";

  for (const word of words) {
    const test = current
      ? `${current} ${word}`
      : word;

    if (
      font.widthOfTextAtSize(
        test,
        fontSize
      ) <= maxWidth
    ) {
      current = test;
    } else {
      if (current) {
        lines.push(
          current
        );
      }

      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function hasAttachment(
  voucher: VoucherPDFData
) {
  return Boolean(
    voucher.attachment_data &&
      voucher.attachment_data.length >
        0 &&
      voucher.attachment_mime_type
  );
}

export async function generateVoucherPDF(
  vouchers: VoucherPDFData[]
): Promise<Uint8Array> {
  const pdfDoc =
    await PDFDocument.create();

  pdfDoc.registerFontkit(
    fontkit
  );

  const regularBytes =
    await fs.readFile(
      path.join(
        process.cwd(),
        "public",
        "fonts",
        "DejaVuSans.ttf"
      )
    );

  const boldBytes =
    await fs.readFile(
      path.join(
        process.cwd(),
        "public",
        "fonts",
        "DejaVuSans-Bold.ttf"
      )
    );

  const regularFont =
    await pdfDoc.embedFont(
      regularBytes
    );

  const boldFont =
    await pdfDoc.embedFont(
      boldBytes
    );

  for (const voucher of vouchers) {
    const attached =
      hasAttachment(
        voucher
      );

    const page =
      pdfDoc.addPage([
        PAGE_WIDTH,
        PAGE_HEIGHT,
      ]);

    /*
     * =========================================================
     * PAGE BORDER
     * =========================================================
     */

    page.drawRectangle({
      x: MARGIN,
      y: MARGIN,
      width:
        PAGE_WIDTH -
        MARGIN * 2,
      height:
        PAGE_HEIGHT -
        MARGIN * 2,
      borderWidth: 1,
      borderColor: BLACK,
    });

    /*
     * =========================================================
     * TITLE
     * =========================================================
     */

    const title =
      "PAYMENT VOUCHER";

    const titleSize = 26;

    const titleWidth =
      boldFont.widthOfTextAtSize(
        title,
        titleSize
      );

    page.drawText(
      title,
      {
        x:
          (PAGE_WIDTH -
            titleWidth) /
          2,

        y:
          PAGE_HEIGHT - 67,

        size: titleSize,

        font: boldFont,
      }
    );

    /*
     * =========================================================
     * PROJECT TITLE
     * =========================================================
     */

    const project =
      "#99 SESHADRIPURAM 2ND MAIN ROAD PROJECT";

    const projectSize = 16;

    const projectWidth =
      regularFont.widthOfTextAtSize(
        project,
        projectSize
      );

    page.drawText(
      project,
      {
        x:
          (PAGE_WIDTH -
            projectWidth) /
          2,

        y:
          PAGE_HEIGHT - 95,

        size: projectSize,

        font: regularFont,
      }
    );

    /*
     * =========================================================
     * VOUCHER NUMBER
     * =========================================================
     */

    const voucherNo =
      `Voucher No: ${voucher.voucher_id}`;

    const voucherNoSize = 14;

    const voucherNoWidth =
      boldFont.widthOfTextAtSize(
        voucherNo,
        voucherNoSize
      );

    page.drawText(
      voucherNo,
      {
        x:
          PAGE_WIDTH -
          MARGIN -
          18 -
          voucherNoWidth,

        y:
          PAGE_HEIGHT - 95,

        size:
          voucherNoSize,

        font: boldFont,

        color: BLACK,
      }
    );

    /*
     * =========================================================
     * ATTACHMENT LAYOUT
     * =========================================================
     *
     * No attachment:
     *     Existing full-width voucher.
     *
     * Attachment:
     *     Voucher area ≈ 63%
     *     Transaction proof ≈ 37%
     *     Same page.
     */

    const voucherLeft =
      MARGIN + 18;

    const voucherRight =
      attached
        ? 522
        : PAGE_WIDTH -
          MARGIN -
          18;

    const labelX =
      voucherLeft;

    const valueX =
      attached
        ? 150
        : MARGIN + 125;

    const rightX =
      voucherRight;

    const labelSize =
      attached ? 12.5 : 13;

    const valueSize =
      attached ? 13.5 : 14;

    const dateText =
      `Date  ${formatVoucherDate(
        voucher.voucher_date
      )}`;

    const dateSize =
      attached ? 12 : 13;

    const dateWidth =
      regularFont.widthOfTextAtSize(
        dateText,
        dateSize
      );

    page.drawText(
      dateText,
      {
        x:
          attached
            ? voucherLeft
            : PAGE_WIDTH -
              MARGIN -
              18 -
              dateWidth,

        y:
          PAGE_HEIGHT - 122,

        size: dateSize,

        font: regularFont,
      }
    );

    let y =
      PAGE_HEIGHT - 160;

    /*
     * =========================================================
     * FIELD RENDERER
     * =========================================================
     */

    function drawField(
      label: string,
      value: string,
      height: number
    ) {
      page.drawText(
        label,
        {
          x: labelX,
          y,
          size: labelSize,
          font: regularFont,
        }
      );

      const lines =
        wrapText(
          value,
          boldFont,
          valueSize,
          rightX -
            valueX
        );

      lines.forEach(
        (
          line,
          index
        ) => {
          page.drawText(
            line,
            {
              x: valueX,

              y:
                y -
                index *
                  (attached
                    ? 17
                    : 18),

              size:
                valueSize,

              font: boldFont,
            }
          );
        }
      );

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

    const payeeType =
      voucher.type_of_payee ===
      "Custom"
        ? voucher.custom_payee_type ||
          "Custom"
        : voucher.type_of_payee;

    drawField(
      "Paid to",
      payeeType
        ? `${voucher.payee} (${payeeType})`
        : voucher.payee,
      45
    );

    const amount =
      Number(voucher.amount);

    const formattedAmount =
      `₹ ${amount.toLocaleString(
        "en-IN",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }
      )}`;

    drawField(
      "Amount",
      `${formattedAmount} (${voucher.amount_in_words})`,
      57
    );

    drawField(
      "By way of",
      voucher.mode_of_payment,
      45
    );

    drawField(
      "Towards",
      voucher.towards,
      57
    );

    drawField(
      "Payee PAN No#",
      voucher.payee_pan || "",
      45
    );

    drawField(
      "TDS (if applicable)",
      voucher.tds || "",
      45
    );

    /*
     * =========================================================
     * SIGNATURES
     * =========================================================
     */

    const signatureLineY = 83;

    const left =
      voucherLeft;

    const right =
      rightX;

    const areaWidth =
      right - left;

    const gap =
      attached ? 18 : 50;

    const width =
      (areaWidth -
        gap * 2) /
      3;

    [
      "Authorized by",
      "Verified by",
      "Receiver's Signature",
    ].forEach(
      (
        label,
        index
      ) => {
        const x =
          left +
          index *
            (width +
              gap);

        page.drawLine({
          start: {
            x,
            y: signatureLineY,
          },

          end: {
            x:
              x + width,
            y: signatureLineY,
          },

          thickness: 0.8,

          color: BLACK,
        });

        const size =
          attached ? 10 : 12;

        const labelWidth =
          regularFont.widthOfTextAtSize(
            label,
            size
          );

        page.drawText(
          label,
          {
            x:
              x +
              (width -
                labelWidth) /
                2,

            y:
              signatureLineY -
              19,

            size,

            font: regularFont,
          }
        );
      }
    );

    /*
     * =========================================================
     * TRANSACTION PROOF
     * =========================================================
     */

    if (attached) {
      const panelLeft =
        545;

      const panelRight =
        PAGE_WIDTH -
        MARGIN -
        18;

      const panelTop =
        PAGE_HEIGHT - 135;

      const panelBottom =
        65;

      /*
       * Vertical divider.
       */

      page.drawLine({
        start: {
          x: 532,
          y: 70,
        },

        end: {
          x: 532,
          y:
            PAGE_HEIGHT -
            115,
        },

        thickness: 0.8,

        color: LIGHT_GREY,
      });

      const heading =
        "TRANSACTION PROOF";

      const headingSize =
        12;

      const headingWidth =
        boldFont.widthOfTextAtSize(
          heading,
          headingSize
        );

      page.drawText(
        heading,
        {
          x:
            panelLeft +
            (panelRight -
              panelLeft -
              headingWidth) /
              2,

          y:
            panelTop,

          size:
            headingSize,

          font: boldFont,

          color: GREY,
        }
      );

      /*
       * Image box.
       */

      const imageBoxX =
        panelLeft;

      const imageBoxY =
        panelBottom;

      const imageBoxWidth =
        panelRight -
        panelLeft;

      const imageBoxHeight =
        panelTop -
        panelBottom -
        25;

      page.drawRectangle({
        x: imageBoxX,
        y: imageBoxY,
        width:
          imageBoxWidth,
        height:
          imageBoxHeight,
        borderWidth: 0.8,
        borderColor:
          LIGHT_GREY,
        color:
          ATTACHMENT_GREY,
      });

      let image;

      if (
        voucher.attachment_mime_type ===
        "image/jpeg"
      ) {
        image =
          await pdfDoc.embedJpg(
            voucher.attachment_data!
          );
      } else if (
        voucher.attachment_mime_type ===
        "image/png"
      ) {
        image =
          await pdfDoc.embedPng(
            voucher.attachment_data!
          );
      }

      if (image) {
        const imageWidth =
          image.width;

        const imageHeight =
          image.height;

        const scale =
          Math.min(
            imageBoxWidth /
              imageWidth,

            imageBoxHeight /
              imageHeight
          );

        const drawWidth =
          imageWidth *
          scale;

        const drawHeight =
          imageHeight *
          scale;

        page.drawImage(
          image,
          {
            x:
              imageBoxX +
              (imageBoxWidth -
                drawWidth) /
                2,

            y:
              imageBoxY +
              (imageBoxHeight -
                drawHeight) /
                2,

            width:
              drawWidth,

            height:
              drawHeight,
          }
        );
      }
    }

    /*
     * =========================================================
     * VOUCHER NUMBER FOOTER REMOVED
     * =========================================================
     *
     * Voucher number is now at the top-right.
     */
  }

  return pdfDoc.save();
}