import { http, HttpResponse } from "msw";
import type { PackageInput, PackageItem, ProductInput, ProductItem, PublicEnquiryInput } from "../../features/catalog/types";
import { packageFixture, productFixture } from "../fixtures/catalog.fixture";
import { userFromRequest } from "../session-store";

const products: ProductItem[] = productFixture.map((item) => ({ ...item }));
const packages: PackageItem[] = packageFixture.map((item) => ({ ...item, items: item.items?.map((line) => ({ ...line })) }));

function unauthorized() {
  return HttpResponse.json({ success: false, message: "Authentication required." }, { status: 401 });
}

function forbidden() {
  return HttpResponse.json({ success: false, message: "You do not have access to this action." }, { status: 403 });
}

export const catalogHandlers = [
  http.get("/api/public/packages", () => {
    return HttpResponse.json({ success: true, data: packages.filter((item) => item.isActive).map(({ items: _items, ...rest }) => rest) });
  }),

  http.get("/api/public/packages/:id", ({ params }) => {
    const found = packages.find((item) => item.id === params.id && item.isActive);
    if (!found) return HttpResponse.json({ success: false, message: "Package not found." }, { status: 404 });
    return HttpResponse.json({ success: true, data: found });
  }),

  http.post("/api/public/enquiries", async ({ request }) => {
    const body = (await request.json()) as PublicEnquiryInput;
    return HttpResponse.json(
      {
        success: true,
        data: {
          customer: { id: `cus-${Date.now().toString(36)}` },
          enquiry: { id: `enq-${Date.now().toString(36)}`, requestedKw: body.requestedKw, status: "new", source: "web_form" }
        },
        message: "Enquiry received."
      },
      { status: 201 }
    );
  }),

  http.get("/api/products", ({ request }) => {
    if (!userFromRequest(request)) return unauthorized();
    return HttpResponse.json({ success: true, data: products });
  }),

  http.post("/api/products", async ({ request }) => {
    const user = userFromRequest(request);
    if (!user) return unauthorized();
    if (user.role !== "admin") return forbidden();
    const body = (await request.json()) as ProductInput;
    const product: ProductItem = {
      id: `prd-${Date.now().toString(36)}`,
      sku: body.sku,
      name: body.name,
      category: body.category,
      unit: body.unit ?? "pcs",
      unitPriceInr: body.unitPriceInr,
      unitCostInr: body.unitCostInr ?? 0,
      isSerialized: body.isSerialized ?? false,
      defaultWarrantyMonths: body.defaultWarrantyMonths ?? null,
      isActive: body.isActive ?? true
    };
    products.push(product);
    return HttpResponse.json({ success: true, data: product }, { status: 201 });
  }),

  http.patch("/api/products/:id", async ({ request, params }) => {
    const user = userFromRequest(request);
    if (!user) return unauthorized();
    if (user.role !== "admin") return forbidden();
    const index = products.findIndex((item) => item.id === params.id);
    if (index < 0) return HttpResponse.json({ success: false, message: "Product not found." }, { status: 404 });
    const body = (await request.json()) as Partial<ProductInput>;
    products[index] = { ...products[index], ...body };
    return HttpResponse.json({ success: true, data: products[index] });
  }),

  http.get("/api/packages", ({ request }) => {
    if (!userFromRequest(request)) return unauthorized();
    return HttpResponse.json({ success: true, data: packages.map(({ items: _items, ...rest }) => rest) });
  }),

  http.get("/api/packages/:id", ({ request, params }) => {
    if (!userFromRequest(request)) return unauthorized();
    const found = packages.find((item) => item.id === params.id);
    if (!found) return HttpResponse.json({ success: false, message: "Package not found." }, { status: 404 });
    return HttpResponse.json({ success: true, data: found });
  }),

  http.post("/api/packages", async ({ request }) => {
    const user = userFromRequest(request);
    if (!user) return unauthorized();
    if (user.role !== "admin") return forbidden();
    const body = (await request.json()) as PackageInput;
    const id = `pkg-${Date.now().toString(36)}`;
    const created: PackageItem = {
      id,
      code: body.code,
      name: body.name,
      systemKind: body.systemKind,
      capacityKw: body.capacityKw ?? null,
      basePriceInr: body.basePriceInr,
      isActive: body.isActive ?? true,
      items: body.items.map((item, index) => ({ id: `pki-${index}-${id}`, packageId: id, productId: item.productId, qty: item.qty }))
    };
    packages.push(created);
    return HttpResponse.json({ success: true, data: created }, { status: 201 });
  }),

  http.patch("/api/packages/:id", async ({ request, params }) => {
    const user = userFromRequest(request);
    if (!user) return unauthorized();
    if (user.role !== "admin") return forbidden();
    const index = packages.findIndex((item) => item.id === params.id);
    if (index < 0) return HttpResponse.json({ success: false, message: "Package not found." }, { status: 404 });
    const body = (await request.json()) as Partial<PackageInput>;
    const current = packages[index];
    packages[index] = {
      ...current,
      ...body,
      capacityKw: body.capacityKw === undefined ? current.capacityKw : body.capacityKw,
      items: body.items
        ? body.items.map((item, line) => ({
            id: current.items?.[line]?.id ?? `pki-${line}-${current.id}`,
            packageId: current.id,
            productId: item.productId,
            qty: item.qty
          }))
        : current.items
    };
    return HttpResponse.json({ success: true, data: packages[index] });
  })
];
