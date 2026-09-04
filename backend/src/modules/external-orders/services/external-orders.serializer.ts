import { Prisma } from '@prisma/client';

/**
 * Serializador canonico del contrato con el middleware (M4.4 / RF-48).
 * Reglas R4/PC-4: el portal entrega SOLO los datos que puede poblar mas las
 * constantes orderFromSupplier=true y status="CONFIRMED".
 * NO se entregan en v1: warehouse, issuedOrderId, issuedInvoiceId ni items[]
 * (su valor solo puede originarse en el middleware).
 * Regla R5: externalId es SIEMPRE el UUID del portal.
 */

type OrderRow = Prisma.OrderGetPayload<{}>;

function num(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export interface CanonicalOrder {
  externalId: string;
  number: string;
  date: string;
  orderFromSupplier: true;
  status: 'CONFIRMED';
  customer: { company: string; patient: string };
  opticalDataOD: {
    sphere: number | null;
    cylinder: number | null;
    axis: number | null;
    addition: number | null;
    dnp: number | null;
    height: number | null;
    productCode: string | null;
  };
  opticalDataOI: {
    sphere: number | null;
    cylinder: number | null;
    axis: number | null;
    addition: number | null;
    dnp: number | null;
    height: number | null;
    productCode: string | null;
  };
  treatment: string | null;
  mount: {
    type: string | null;
    brand: string | null;
    model: string | null;
    color: string | null;
  };
  coloration: {
    color: string | null;
    unicolor: boolean;
    degradadoPercent: number | null;
  };
  observations: string | null;
}

export function toCanonicalOrder(order: OrderRow): CanonicalOrder {
  return {
    externalId: order.externalId, // UUID del portal (R5)
    number: order.orderNumber,
    date: order.createdAt.toISOString(),
    orderFromSupplier: true, // constante (PC-4)
    status: 'CONFIRMED', // constante (PC-4)
    customer: { company: order.company, patient: order.patient },
    opticalDataOD: {
      sphere: num(order.odSphere),
      cylinder: num(order.odCylinder),
      axis: num(order.odAxis),
      addition: num(order.odAddition),
      dnp: num(order.odDnp),
      height: num(order.odHeight),
      productCode: order.odProductCode ?? null,
    },
    opticalDataOI: {
      sphere: num(order.oiSphere),
      cylinder: num(order.oiCylinder),
      axis: num(order.oiAxis),
      addition: num(order.oiAddition),
      dnp: num(order.oiDnp),
      height: num(order.oiHeight),
      productCode: order.oiProductCode ?? null,
    },
    treatment: order.treatment ?? null,
    mount: {
      type: order.mountType ?? null,
      brand: order.mountBrand ?? null,
      model: order.mountModel ?? null,
      color: order.mountColor ?? null,
    },
    coloration: {
      color: order.colorationColor ?? null,
      unicolor: order.colorationUnicolor,
      degradadoPercent: num(order.colorationDegradadoPercent),
    },
    observations: order.observations ?? null,
  };
}
