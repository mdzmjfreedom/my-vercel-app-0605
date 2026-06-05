"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";

type OrderRow = {
  id: string;
  externalCode?: string | null;
  receiverShop?: string | null;
  receiverName?: string | null;
  receiverPhone?: string | null;
  receiverAddress?: string | null;
  skuCode: string;
  skuName: string;
  qty: number;
  skuSpec?: string | null;
  remark?: string | null;
  createdAt: string;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
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

  return (
    <div className="container orders-page">
      <div className="page-heading">
        <div>
          <h2>已导入运单</h2>
          <p>从数据库读取历史提交记录，支持按外部编码、收件人/门店和提交时间筛选。</p>
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
            placeholder="搜索外部编码、收件人姓名或收货门店"
          />
        </div>
        <div className="date-range-filter" aria-label="提交时间范围">
          <label className="date-filter">
            <span>开始</span>
            <input
              type="date"
              value={createdFrom}
              onChange={(event) => setCreatedFrom(event.target.value)}
              aria-label="开始日期"
            />
            <CalendarDays size={16} />
          </label>
          <span className="date-range-divider" aria-hidden="true" />
          <label className="date-filter">
            <span>结束</span>
            <input
              type="date"
              value={createdTo}
              onChange={(event) => setCreatedTo(event.target.value)}
              aria-label="结束日期"
            />
            <CalendarDays size={16} />
          </label>
        </div>
        <button className="primary-button" onClick={search}>
          <Search size={16} />
          筛选
        </button>
      </section>

      <section className="card orders-card">
        <div className="orders-toolbar">
          <span>共 {total} 条记录</span>
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
                <th>SKU编码</th>
                <th>SKU名称</th>
                <th>数量</th>
                <th>规格</th>
                <th>提交时间</th>
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
                  <tr key={order.id}>
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
                    <td>{order.skuCode}</td>
                    <td>{order.skuName}</td>
                    <td>{order.qty}</td>
                    <td>{order.skuSpec || "-"}</td>
                    <td>{new Date(order.createdAt).toLocaleString()}</td>
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
