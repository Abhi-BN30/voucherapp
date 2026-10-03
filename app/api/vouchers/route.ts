import {
  NextRequest,
  NextResponse,
} from "next/server";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/session";

const MAX_ATTACHMENT_SIZE =
  3 * 1024 * 1024;

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
];

const ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
];

function validateAttachment(
  file: File
) {
  const extension =
    "." +
    file.name
      .split(".")
      .pop()
      ?.toLowerCase();

  if (
    !ALLOWED_MIME_TYPES.includes(
      file.type
    ) ||
    !ALLOWED_EXTENSIONS.includes(
      extension
    )
  ) {
    return "Only JPG, JPEG and PNG images are allowed.";
  }

  if (
    file.size >
    MAX_ATTACHMENT_SIZE
  ) {
    return "Attachment must be 3 MB or smaller.";
  }

  return null;
}

async function readAttachment(
  formData: FormData
) {
  const value =
    formData.get("attachment");

  if (
    !value ||
    !(value instanceof File) ||
    value.size === 0
  ) {
    return {
      data: null,
      mimeType: null,
      fileName: null,
    };
  }

  const error =
    validateAttachment(value);

  if (error) {
    throw new Error(error);
  }

  const bytes =
    await value.arrayBuffer();

  return {
    data: Buffer.from(bytes),
    mimeType: value.type,
    fileName: value.name,
  };
}

export async function GET(
  request: NextRequest
) {
  try {
    const session =
      await getSession();

    if (!session) {
      return NextResponse.json(
        {
          error:
            "Unauthorized",
        },
        { status: 401 }
      );
    }

    const {
      searchParams,
    } = new URL(
      request.url
    );

    const search =
      searchParams
        .get("search")
        ?.trim() || "";

    const from =
      searchParams
        .get("from")
        ?.trim() || "";

    const to =
      searchParams
        .get("to")
        ?.trim() || "";

    const type =
      searchParams
        .get("type")
        ?.trim() || "";

    const mode =
      searchParams
        .get("mode")
        ?.trim() || "";

    const archived =
      searchParams.get(
        "archived"
      ) === "1";

    const p = search
      ? `%${search}%`
      : null;

    const fromDate =
      from || null;

    const toDate =
      to || null;

    const typeFilter =
      type || null;

    const modeFilter =
      mode || null;

    const vouchers =
      await sql`
        SELECT
          v.voucher_id,
          v.created_by,
          v.payee,
          v.amount,
          v.amount_in_words,
          v.type_of_payee,
          v.custom_payee_type,
          v.mode_of_payment,
          v.towards,
          v.payee_pan,
          v.tds,
          v.voucher_date,
          v.created_at,
          v.updated_at,
          v.deleted_at,
          (v.attachment_data IS NOT NULL)
            AS has_attachment,
          v.attachment_file_name,
          v.attachment_mime_type,
          u.name AS created_by_name,
          u.username AS created_by_username
        FROM vouchers v
        INNER JOIN users u
          ON u.user_id = v.created_by
        WHERE
          v.created_by =
            ${session.userId}

          AND (${archived} =
            (v.deleted_at IS NOT NULL))

          AND (
            ${p}::text IS NULL
            OR
            CAST(
              v.voucher_id
              AS text
            ) ILIKE ${p}
            OR v.payee ILIKE ${p}
            OR v.type_of_payee::text
              ILIKE ${p}
            OR COALESCE(
              v.custom_payee_type,
              ''
            ) ILIKE ${p}
            OR v.towards ILIKE ${p}
            OR CAST(
              v.amount AS text
            ) ILIKE ${p}
            OR v.mode_of_payment::text
              ILIKE ${p}
          )

          AND (
            ${fromDate}::date IS NULL
            OR v.voucher_date >=
              ${fromDate}::date
          )

          AND (
            ${toDate}::date IS NULL
            OR v.voucher_date <=
              ${toDate}::date
          )

          AND (
            ${typeFilter}::text IS NULL
            OR v.type_of_payee::text =
              ${typeFilter}
          )

          AND (
            ${modeFilter}::text IS NULL
            OR v.mode_of_payment::text =
              ${modeFilter}
          )

        ORDER BY
          v.voucher_date DESC,
          v.voucher_id DESC
      `;

    return NextResponse.json({
      success: true,
      vouchers,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          "Unable to fetch vouchers",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const session =
      await getSession();

    if (!session) {
      return NextResponse.json(
        {
          message:
            "Unauthorized",
        },
        { status: 401 }
      );
    }

    const formData =
      await request.formData();

    const voucherDate =
      String(
        formData.get(
          "voucherDate"
        ) || ""
      ).trim();

    const payee =
      String(
        formData.get("payee") ||
          ""
      ).trim();

    const amount =
      Number(
        formData.get("amount")
      );

    const amountInWords =
      String(
        formData.get(
          "amountInWords"
        ) || ""
      ).trim();

    const typeOfPayee =
      String(
        formData.get(
          "typeOfPayee"
        ) || ""
      ).trim();

    const customPayeeType =
      String(
        formData.get(
          "customPayeeType"
        ) || ""
      ).trim() || null;

    const modeOfPayment =
      String(
        formData.get(
          "modeOfPayment"
        ) || ""
      ).trim();

    const towards =
      String(
        formData.get(
          "towards"
        ) || ""
      ).trim();

    const payeePan =
      String(
        formData.get(
          "payeePan"
        ) || ""
      ).trim() || null;

    const tds =
      String(
        formData.get("tds") ||
          ""
      ).trim() || null;

    const allowDuplicate =
      String(
        formData.get(
          "allowDuplicate"
        ) || ""
      ) === "true";

    if (!voucherDate) {
      return NextResponse.json(
        {
          message:
            "Date is required.",
        },
        { status: 400 }
      );
    }

    if (!payee) {
      return NextResponse.json(
        {
          message:
            "Paid To is required.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(
        amount
      ) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          message:
            "Please enter a valid amount.",
        },
        { status: 400 }
      );
    }

    if (!amountInWords) {
      return NextResponse.json(
        {
          message:
            "Amount in words is required.",
        },
        { status: 400 }
      );
    }

    if (!typeOfPayee) {
      return NextResponse.json(
        {
          message:
            "Type of payee is required.",
        },
        { status: 400 }
      );
    }

    if (
      typeOfPayee ===
        "Custom" &&
      !customPayeeType
    ) {
      return NextResponse.json(
        {
          message:
            "Custom payee type is required.",
        },
        { status: 400 }
      );
    }

    if (!modeOfPayment) {
      return NextResponse.json(
        {
          message:
            "Mode of payment is required.",
        },
        { status: 400 }
      );
    }

    if (!towards) {
      return NextResponse.json(
        {
          message:
            "Towards is required.",
        },
        { status: 400 }
      );
    }

    if (!allowDuplicate) {
      const duplicate =
        await sql`
          SELECT
            voucher_id,
            voucher_date,
            payee,
            amount,
            towards
          FROM vouchers
          WHERE
            created_by =
              ${session.userId}
            AND deleted_at IS NULL
            AND voucher_date =
              ${voucherDate}
            AND LOWER(
              BTRIM(payee)
            ) =
              LOWER(
                BTRIM(${payee})
              )
            AND amount =
              ${amount}
            AND LOWER(
              BTRIM(towards)
            ) =
              LOWER(
                BTRIM(${towards})
              )
          LIMIT 1
        `;

      if (duplicate.length) {
        return NextResponse.json(
          {
            message:
              `A similar voucher already exists: #${duplicate[0].voucher_id}. Save anyway if this is intentional.`,
            duplicate:
              duplicate[0],
          },
          { status: 409 }
        );
      }
    }

    const attachment =
      await readAttachment(
        formData
      );

    await sql`
      INSERT INTO payees (
        payee_name
      )
      VALUES (
        ${payee}
      )
      ON CONFLICT DO NOTHING
    `;

    const rows =
      await sql`
        INSERT INTO vouchers (
          created_by,
          payee,
          amount,
          amount_in_words,
          type_of_payee,
          custom_payee_type,
          mode_of_payment,
          towards,
          payee_pan,
          tds,
          voucher_date,
          attachment_data,
          attachment_mime_type,
          attachment_file_name
        )
        VALUES (
          ${session.userId},
          ${payee},
          ${amount},
          ${amountInWords},
          ${typeOfPayee},
          ${
            typeOfPayee ===
            "Custom"
              ? customPayeeType
              : null
          },
          ${modeOfPayment},
          ${towards},
          ${payeePan},
          ${tds},
          ${voucherDate},
          ${attachment.data},
          ${attachment.mimeType},
          ${attachment.fileName}
        )
        RETURNING *
      `;

    return NextResponse.json(
      {
        success: true,
        voucher: rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Create voucher error:",
      error
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to save voucher.",
      },
      { status: 500 }
    );
  }
}