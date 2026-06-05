# 智能多格式批量下单系统 V2

基于 Next.js App Router + TypeScript 的万能导入系统。应用按鲸天系统风格重做了后台壳、导航、表格和操作流，支持 Excel / Word / PDF 上传，使用规则引擎解析为出库单 SKU 明细，并按外部编码聚合展示为出库单。

## 本地运行

```bash
npm install
npx prisma generate
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## 环境变量

复制 `.env.example` 到 `.env` 或在 Vercel Project Settings 中配置同名变量。

```bash
DATABASE_URL=""
POSTGRES_PRISMA_URL=""
POSTGRES_URL_NON_POOLING=""

OPENAI_API_KEY=""
OPENAI_BASE_URL=""
OPENAI_MODEL=""
```

大模型配置只在服务端 Route Handler 中读取，没有 `NEXT_PUBLIC_` 前缀，不会进入浏览器包。考试可配置为：

```bash
OPENAI_BASE_URL="https://988665.xyz/v1"
OPENAI_MODEL="gpt-5.5"
OPENAI_API_KEY="<your server-side key>"
```

## 核心流程

1. 上传 Excel / Word / PDF。
2. 手动选择已有解析规则，或新建规则并由 LLM 生成推荐规则。
3. 在页面中编辑 JSON 规则并试解析。
4. 进入类 Excel 预览页，实时校验、标红、删除行、新增行、导出 Excel。
5. 提交前再次在服务端校验，使用 Prisma 事务写入数据库。
6. 已导入运单页从数据库分页读取，支持外部编码、收件人、门店、时间筛选。

## 规则引擎能力

规则 DSL 位于 `src/lib/types.ts`，执行器位于 `src/lib/parser-engine.ts`。当前支持：

- `table`：标准表格、跳过干扰头、合计行终止、尾部标签元信息。
- `matrix`：SKU 行与门店列的矩阵转置。
- `grid`：门店/日期网格与复合单元格拆分。
- `cards`：纵向卡片边界识别和卡片内小表解析。
- `text-sequence`：PDF/Word 文本中按 SKU 编码附近连续行抽取。
- `text-regex`：按分隔线拆记录，再用正则抽取上下文和物品行。

9 类考试文件的规则 JSON 示例见 `docs/rule-examples.json`。

## 校验与聚合

- SKU 编码、SKU 名称、发货数量必填，数量必须为正数。
- 收货门店，或收件人姓名 + 电话 + 地址二选一必填。
- 电话格式校验。
- 同一外部编码且收货信息一致时视为同一出库单多 SKU，预览页聚合展示并给提示。
- 同一外部编码但收货信息冲突时阻断提交。
- 与数据库历史外部编码重复时阻断提交。

## 验证命令

```bash
npx tsc --noEmit
npm run lint
npx prisma validate
npm run build
```

可用 `AI考试附件` 中的 Excel / PDF 文件在首页上传测试。LLM 网关异常时，后端会返回本地结构分析生成的推荐规则，并在规则 notes 中标注降级原因。
