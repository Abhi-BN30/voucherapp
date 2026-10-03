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

async function idOf(
  params: Promise<{
    id: string;
  }>
) {
  const { id } =
    await params;

  const n = Number(id);

  return Number.isInteger(n) &&
    n > 0
    ? n
    : null;
}

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

function validateVoucher(
  d: any
) {
  if (!d.voucherDate)
    return "Date is required.";

  if (!d.payee)
    return "Paid To is required.";

  if (
    !Number.isFinite(d.amount) ||
    d.amount <= 0
  )
    return "Please enter a valid amount.";

  if (!d.amountInWords)
    return "Amount in words is required.";

  if (!d.typeOfPayee)
    return "Type of payee is required.";

  if (
    d.typeOfPayee ===
      "Custom" &&
    !d.customPayeeType
  )
    return "Custom payee type is required.";

  if (!d.modeOfPayment)
    return "Mode of payment is required.";

  if (!d.towards)
    return "Towards is required.";

  return null;
}

export async function GET(
  _request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
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

    const id =
      await idOf(params);

    if (id === null) {
      return NextResponse.json(
        {
          message:
            "Invalid voucher ID.",
        },
        { status: 400 }
      );
    }

    const rows =
      await sql`
        SELECT
          voucher_id,
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
          created_at,
          updated_at,
          deleted_at,
          (
            attachment_data
            IS NOT NULL
          ) AS has_attachment,
          attachment_file_name,
          attachment_mime_type
        FROM vouchers
        WHERE
          voucher_id = ${id}
          AND created_by =
            ${session.userId}
        LIMIT 1
      `;

    if (!rows.length) {
      return NextResponse.json(
        {
          message:
            "Voucher not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      voucher: rows[0],
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        message:
          "Unable to fetch voucher.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
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

    const id =
      await idOf(params);

    if (id === null) {
      return NextResponse.json(
        {
          message:
            "Invalid voucher ID.",
        },
        { status: 400 }
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

    const removeAttachment =
      String(
        formData.get(
          "removeAttachment"
        ) || ""
      ) === "true";

    const validationError =
      validateVoucher({
        voucherDate,
        payee,
        amount,
        amountInWords,
        typeOfPayee,
        customPayeeType,
        modeOfPayment,
        towards,
      });

    if (validationError) {
      return NextResponse.json(
        {
          message:
            validationError,
        },
        { status: 400 }
      );
    }

    if (!allowDuplicate) {
      const duplicate =
        await sql`
          SELECT voucher_id
          FROM vouchers
          WHERE
            created_by =
              ${session.userId}
            AND deleted_at IS NULL
            AND voucher_id <> ${id}
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

    const attachmentValue =
      formData.get(
        "attachment"
      );

    let attachmentData:
      | Buffer
      | null
      | undefined;

    let attachmentMimeType:
      | string
      | null
      | undefined;

    let attachmentFileName:
      | string
      | null
      | undefined;

    if (
      attachmentValue &&
      attachmentValue instanceof
        File &&
      attachmentValue.size > 0
    ) {
      const extension =
        "." +
        attachmentValue.name
          .split(".")
          .pop()
          ?.toLowerCase();

      if (
        !ALLOWED_MIME_TYPES.includes(
          attachmentValue.type
        ) ||
        !ALLOWED_EXTENSIONS.includes(
          extension
        )
      ) {
        return NextResponse.json(
          {
            message:
              "Only JPG, JPEG and PNG images are allowed.",
          },
          { status: 400 }
        );
      }

      if (
        attachmentValue.size >
        MAX_ATTACHMENT_SIZE
      ) {
        return NextResponse.json(
          {
            message:
              "Attachment must be 3 MB or smaller.",
          },
          { status: 400 }
        );
      }

      attachmentData =
        Buffer.from(
          await attachmentValue.arrayBuffer()
        );

      attachmentMimeType =
        attachmentValue.type;

      attachmentFileName =
        attachmentValue.name;
    }

    await sql`
      INSERT INTO payees (
        payee_name
      )
      VALUES (
        ${payee}
      )
      ON CONFLICT DO NOTHING
    `;

    let rows;

    if (
      attachmentData !==
        undefined
    ) {
      rows =
        await sql`
          UPDATE vouchers
          SET
            payee =
              ${payee},
            amount =
              ${amount},
            amount_in_words =
              ${amountInWords},
            type_of_payee =
              ${typeOfPayee},
            custom_payee_type =
              ${
                typeOfPayee ===
                "Custom"
                  ? customPayeeType
                  : null
              },
            mode_of_payment =
              ${modeOfPayment},
            towards =
              ${towards},
            payee_pan =
              ${payeePan},
            tds =
              ${tds},
            voucher_date =
              ${voucherDate},
            attachment_data =
              ${attachmentData},
            attachment_mime_type =
              ${attachmentMimeType},
            attachment_file_name =
              ${attachmentFileName},
            updated_at =
              NOW()
          WHERE
            voucher_id =
              ${id}
            AND created_by =
              ${session.userId}
            AND deleted_at IS NULL
          RETURNING *
        `;
    } else if (
      removeAttachment
    ) {
      rows =
        await sql`
          UPDATE vouchers
          SET
            payee =
              ${payee},
            amount =
              ${amount},
            amount_in_words =
              ${amountInWords},
            type_of_payee =
              ${typeOfPayee},
            custom_payee_type =
              ${
                typeOfPayee ===
                "Custom"
                  ? customPayeeType
                  : null
              },
            mode_of_payment =
              ${modeOfPayment},
            towards =
              ${towards},
            payee_pan =
              ${payeePan},
            tds =
              ${tds},
            voucher_date =
              ${voucherDate},
            attachment_data =
              NULL,
            attachment_mime_type =
              NULL,
            attachment_file_name =
              NULL,
            updated_at =
              NOW()
          WHERE
            voucher_id =
              ${id}
            AND created_by =
              ${session.userId}
            AND deleted_at IS NULL
          RETURNING *
        `;
    } else {
      rows =
        await sql`
          UPDATE vouchers
          SET
            payee =
              ${payee},
            amount =
              ${amount},
            amount_in_words =
              ${amountInWords},
            type_of_payee =
              ${typeOfPayee},
            custom_payee_type =
              ${
                typeOfPayee ===
                "Custom"
                  ? customPayeeType
                  : null
              },
            mode_of_payment =
              ${modeOfPayment},
            towards =
              ${towards},
            payee_pan =
              ${payeePan},
            tds =
              ${tds},
            voucher_date =
              ${voucherDate},
            updated_at =
              NOW()
          WHERE
            voucher_id =
              ${id}
            AND created_by =
              ${session.userId}
            AND deleted_at IS NULL
          RETURNING *
        `;
    }

    if (!rows.length) {
      return NextResponse.json(
        {
          message:
            "Voucher not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      voucher: rows[0],
    });
  } catch (error) {
    console.error(
      "Update voucher error:",
      error
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to update voucher.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
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

    const id =
      await idOf(params);

    if (id === null) {
      return NextResponse.json(
        {
          message:
            "Invalid voucher ID.",
        },
        { status: 400 }
      );
    }

    const rows =
      await sql`
        UPDATE vouchers
        SET
          deleted_at =
            NOW(),
          deleted_by =
            ${session.userId},
          updated_at =
            NOW()
        WHERE
          voucher_id =
            ${id}
          AND created_by =
            ${session.userId}
          AND deleted_at IS NULL
        RETURNING voucher_id
      `;

    if (!rows.length) {
      return NextResponse.json(
        {
          message:
            "Voucher not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      voucherId:
        Number(
          rows[0]
            .voucher_id
        ),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        message:
          "Unable to archive voucher.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  _request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
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

    const id =
      await idOf(params);

    if (id === null) {
      return NextResponse.json(
        {
          message:
            "Invalid voucher ID.",
        },
        { status: 400 }
      );
    }

    const rows =
      await sql`
        UPDATE vouchers
        SET
          deleted_at =
            NULL,
          deleted_by =
            NULL,
          updated_at =
            NOW()
        WHERE
          voucher_id =
            ${id}
          AND created_by =
            ${session.userId}
          AND deleted_at IS NOT NULL
        RETURNING voucher_id
      `;

    if (!rows.length) {
      return NextResponse.json(
        {
          message:
            "Archived voucher not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      voucherId:
        Number(
          rows[0]
            .voucher_id
        ),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        message:
          "Unable to restore voucher.",
      },
      { status: 500 }
    );
  }
}