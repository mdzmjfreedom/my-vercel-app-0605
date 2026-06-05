import { Prisma } from "@prisma/client";
import { jsonError, readJson } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import type { ParsedOrder } from "@/lib/types";
import { aggregateOrders, normalizeText, toPositiveNumber, validateOrders } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = normalizeText(url.searchParams.get("q"));
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize") ?? 20)));
    const createdFrom = normalizeText(url.searchParams.get("createdFrom"));
    const createdTo = normalizeText(url.searchParams.get("createdTo"));

    const where = {
      ...(q
        ? {
            OR: [
              { externalCode: { contains: q, mode: "insensitive" as const } },
              { receiverName: { contains: q, mode: "insensitive" as const } },
              { receiverShop: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(createdFrom || createdTo
        ? {
            createdAt: {
              ...(createdFrom ? { gte: new Date(createdFrom) } : {}),
              ...(createdTo ? { lte: new Date(`${createdTo}T23:59:59`) } : {}),
            },
          }
        : {}),
    };

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return Response.json({ success: true, orders, total, page, pageSize });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "读取运单失败");
  }
}

export async function POST(req: Request) {
  try {
    const body = await readJson<{ orders: ParsedOrder[] }>(req);
    const orders = Array.isArray(body.orders) ? body.orders : [];
    if (!orders.length) return jsonError("没有可提交的订单数据", 400);
    const groups = aggregateOrders(orders);
    const incomingCodes = Array.from(
      new Set(orders.map((order) => normalizeText(order.externalCode)).filter(Boolean)),
    );

    const result = await prisma.$transaction(async (tx) => {
      const existingCodes = await tx.order.findMany({
        where: incomingCodes.length ? { externalCode: { in: incomingCodes } } : { externalCode: { not: null } },
        select: { externalCode: true },
        distinct: ["externalCode"],
        take: 20000,
      });

      const issues = validateOrders(
        orders,
        existingCodes.map((item) => item.externalCode).filter((code): code is string => Boolean(code)),
      ).filter((issue) => issue.severity === "error");

      if (issues.length) {
        return { ok: false as const, issues };
      }

      const created = await tx.order.createMany({
        data: orders.map((order) => ({
          externalCode: normalizeText(order.externalCode) || null,
          receiverShop: normalizeText(order.receiverShop) || null,
          receiverName: normalizeText(order.receiverName) || null,
          receiverPhone: normalizeText(order.receiverPhone) || null,
          receiverAddress: normalizeText(order.receiverAddress) || null,
          skuCode: normalizeText(order.skuCode),
          skuName: normalizeText(order.skuName),
          qty: Math.round(toPositiveNumber(order.qty)),
          skuSpec: normalizeText(order.skuSpec) || null,
          remark: normalizeText(order.remark) || null,
        })),
      });

      return { ok: true as const, count: created.count };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    if (!result.ok) {
      return Response.json({ success: false, error: "存在校验错误，无法提交", issues: result.issues }, { status: 422 });
    }

    return Response.json({
      success: true,
      summary: {
        successCount: result.count,
        failedCount: 0,
        outboundOrderCount: groups.length,
      },
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "提交下单失败");
  }
}
