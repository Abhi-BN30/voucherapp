import {
  NextRequest,
  NextResponse,
} from "next/server";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/session";

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
      return new NextResponse(
        "Unauthorized",
        {
          status: 401,
        }
      );
    }

    const { id } =
      await params;

    const voucherId =
      Number(id);

    if (
      !Number.isInteger(
        voucherId
      )
    ) {
      return new NextResponse(
        "Invalid voucher ID",
        {
          status: 400,
        }
      );
    }

    const rows =
      await sql`
        SELECT
          attachment_data,
          attachment_mime_type,
          attachment_file_name
        FROM vouchers
        WHERE
          voucher_id =
            ${voucherId}
          AND created_by =
            ${session.userId}
          AND attachment_data
            IS NOT NULL
        LIMIT 1
      `;

    if (!rows.length) {
      return new NextResponse(
        "Attachment not found",
        {
          status: 404,
        }
      );
    }

    const row = rows[0];

    return new NextResponse(
      Buffer.from(
        row.attachment_data
      ),
      {
        status: 200,
        headers: {
          "Content-Type":
            row.attachment_mime_type ||
            "application/octet-stream",

          "Content-Disposition":
            `inline; filename="${String(
              row.attachment_file_name ||
                "attachment"
            ).replace(
              /["\r\n]/g,
              ""
            )}"`,

          "Cache-Control":
            "private, no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Attachment error:",
      error
    );

    return new NextResponse(
      "Unable to load attachment",
      {
        status: 500,
      }
    );
  }
}