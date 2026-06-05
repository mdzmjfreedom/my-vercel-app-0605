"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";

type OrderItem = {
  id: string;
  skuCode: string;
  skuName: string;
  qty: number;
  skuSpec?: string | null;
  remark?: string | null;
  createdAt: string;
};

type OrderGroup = {
  groupKey: string;
  externalCode?: string | null;
  receiverShop?: string | null;
  receiverName?: string | null;
  receiverPhone?: string | null;
  receiverAddress?: string | null;
  skuLineCount: number;
  totalQty: number;
  createdAt: string;
  firstCreatedAt: string;
  lastCreatedAt: string;
  hasReceiverConflict: boolean;
  items: OrderItem[];
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderGroup[]>([]);
  const [query, setQuery] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [filters, setFilters] = useState({ query: "", createdFrom: "", createdTo: "" });
  const [reloadKey, setReloadKey] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ type: "error" | "info"; text: string } | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [pageSize, total]);

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      await Promise.resolve();
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (filters.query) params.set("q", filters.query);
      if (filters.createdFrom) params.set("createdFrom", filters.createdFrom);
      if (filters.createdTo) params.set("createdTo", filters.createdTo);

      try {
        const res = await fetch(`/api/orders?${params.toString()}`, { cache: "no-store" });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "读取运单失败");
        if (!cancelled) {
          setOrders(data.orders ?? []);
          setTotal(data.total ?? 0);
          setNotice(null);
        }
      } catch (error) {
        if (!cancelled) {
          setNotice({ type: "error", text: error instanceof Error ? error.message : "读取运单失败" });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadOrders();

    return () => {
      cancelled = true;
    };
  }, [filters, page, pageSize, reloadKey]);

  function search() {
    setLoading(true);
    setPage(1);
    setFilters({
      query: query.trim(),
      createdFrom,
      createdTo,
    });
    setReloadKey((value) => value + 1);
  }

  function openDatePicker(input: HTMLInputElement) {
    try {
      input.showPicker?.();
    } catch {
      // Some browsers only allow showPicker during pointer activation; native focus still works.
    }
  }

  return (
    <div className="container orders-page">
      <div className="page-heading">
        <div>
          <h2>已导入运单</h2>
          <p>从数据库按出库单聚合历史记录，一个外部编码可对应多条 SKU 明细。</p>
        </div>
      </div>

      {notice && <div className={`notice ${notice.type}`}>{notice.text}</div>}

      <section className="card filter-card">
        <div className="search-input">
          <Search size={18} />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") search();
            }}
            placeholder="搜索外部编码、收件人、门店、电话或 SKU"
          />
        </div>
        <div className="date-range-filter" aria-label="提交时间范围">
          <label className="date-filter">
            <span>开始</span>
            <input
              type="date"
              value={createdFrom}
              onClick={(event) => openDatePicker(event.currentTarget)}
              onFocus={(event) => openDatePicker(event.currentTarget)}
              onChange={(event) => setCreatedFrom(event.target.value)}
              aria-label="开始日期"
            />
          </label>
          <span className="date-range-divider" aria-hidden="true" />
          <label className="date-filter">
            <span>结束</span>
            <input
              type="date"
              value={createdTo}
              onClick={(event) => openDatePicker(event.currentTarget)}
              onFocus={(event) => openDatePicker(event.currentTarget)}
              onChange={(event) => setCreatedTo(event.target.value)}
              aria-label="结束日期"
            />
          </label>
        </div>
        <button className="primary-button" onClick={search}>
          <Search size={16} />
          筛选
        </button>
      </section>

      <section className="card orders-card">
        <div className="orders-toolbar">
          <span>共 {total} 个出库单</span>
          <div className="pager">
            <button
              className="btn-icon"
              disabled={page <= 1}
              onClick={() => {
                setLoading(true);
                setPage((value) => Math.max(1, value - 1));
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <span>{page} / {totalPages}</span>
            <button
              className="btn-icon"
              disabled={page >= totalPages}
              onClick={() => {
                setLoading(true);
                setPage((value) => Math.min(totalPages, value + 1));
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="orders-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>外部编码</th>
                <th>收货方</th>
                <th>联系方式</th>
                <th>SKU明细</th>
                <th>SKU行数</th>
                <th>总数量</th>
                <th>提交时间</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8}>
                    <div className="table-empty">
                      <Loader2 className="spin" size={20} />
                      加载中...
                    </div>
                  </td>
                </tr>
              ) : orders.length ? (
                orders.map((order) => (
                  <tr key={order.groupKey}>
                    <td>{order.externalCode || "-"}</td>
                    <td>
                      {order.receiverShop ? (
                        <span className="tag-soft">{order.receiverShop}</span>
                      ) : (
                        order.receiverName || "-"
                      )}
                    </td>
                    <td>
                      <div className="cell-stack">
                        <span>{order.receiverPhone || "-"}</span>
                        <small>{order.receiverAddress || ""}</small>
                      </div>
                    </td>
                    <td>
                      <div className="sku-summary">
                        {order.items.slice(0, 4).map((item) => (
                          <span key={item.id}>
                            {item.skuCode} · {item.skuName} x {item.qty}
                            {item.skuSpec ? ` · ${item.skuSpec}` : ""}
                          </span>
                        ))}
                        {order.items.length > 4 && <small>还有 {order.items.length - 4} 条 SKU 明细</small>}
                      </div>
                    </td>
                    <td>{order.skuLineCount}</td>
                    <td>{order.totalQty}</td>
                    <td>{new Date(order.lastCreatedAt || order.createdAt).toLocaleString()}</td>
                    <td>
                      <span className={order.hasReceiverConflict ? "tag-soft warning" : "tag-soft"}>
                        {order.hasReceiverConflict ? "收货冲突" : "已聚合"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8}>
                    <div className="table-empty">暂无已提交记录。</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
