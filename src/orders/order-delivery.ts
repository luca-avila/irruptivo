import { DELIVERY_METHOD } from "../domain/rules";
import { type PendingOrderDeliverySnapshot } from "./order-creation";

export function getDeliverySummary(delivery: PendingOrderDeliverySnapshot): string {
  if (delivery.method === DELIVERY_METHOD.shipping && delivery.shippingAddress) {
    const { addressLine, city, province, postalCode } = delivery.shippingAddress;

    return `${delivery.methodLabel}: ${addressLine}, ${city}, ${province} (${postalCode}).`;
  }

  return "Retiro local en Benavidez/Zona Norte. Coordinamos punto y horario por WhatsApp.";
}
