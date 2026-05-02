import { PlatformSetting } from "../models/index.js"

const roundMoney = (value) => Math.round(Number(value || 0) * 100) / 100

export const getPlatformSettings = async () => {
  const [settings] = await PlatformSetting.findOrCreate({
    where: { id: 1 },
    defaults: {
      vendor_commission_percent: 5,
      customer_service_charge_percent: 2,
      platform_fee: 99,
    },
  })
  return settings
}

export const calculateBookingPricing = async (vendorAmount) => {
  const settings = await getPlatformSettings()
  const vendorBaseAmount = roundMoney(vendorAmount)
  const vendorCommissionPercent = Number(settings.vendor_commission_percent)
  const customerServiceChargePercent = Number(settings.customer_service_charge_percent)
  const platformFee = roundMoney(settings.platform_fee)
  const vendorCommissionAmount = roundMoney((vendorBaseAmount * vendorCommissionPercent) / 100)
  const customerSubtotal = roundMoney(vendorBaseAmount + vendorCommissionAmount + platformFee)
  const customerServiceCharge = roundMoney((customerSubtotal * customerServiceChargePercent) / 100)
  const customerPayableAmount = roundMoney(customerSubtotal + customerServiceCharge)

  return {
    vendorBaseAmount,
    vendorCommissionPercent,
    vendorCommissionAmount,
    platformFee,
    customerSubtotal,
    customerServiceChargePercent,
    customerServiceCharge,
    customerPayableAmount,
    adminRevenue: roundMoney(vendorCommissionAmount + platformFee + customerServiceCharge),
  }
}

export const attachPricingToServices = async (services = []) => {
  const priced = await Promise.all(services.map(async (service) => {
    const plain = typeof service.toJSON === "function" ? service.toJSON() : service
    const pricing = await calculateBookingPricing(plain.price)
    return {
      ...plain,
      pricing: {
        customerSubtotal: pricing.customerSubtotal,
        customerServiceChargePercent: pricing.customerServiceChargePercent,
        customerServiceCharge: pricing.customerServiceCharge,
        customerPayableAmount: pricing.customerPayableAmount,
      },
    }
  }))
  return priced
}
