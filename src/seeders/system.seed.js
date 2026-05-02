import { Admin, Category, PlatformSetting } from "../models/index.js"
import { logger } from "../config/logger.js"

const categories = [
  "Photography",
  "Catering",
  "Decoration",
  "Entertainment",
  "DJs",
  "Venues",
  "Florists",
]

export const seedSystemData = async () => {
  const [admin, created] = await Admin.findOrCreate({
    where: { email: "pandaabhijit326@gmail.com" },
    defaults: {
      name: "Abhijit Panda",
      email: "pandaabhijit326@gmail.com",
      password: "admin123",
    },
  })

  if (!created && !(await admin.comparePassword("admin123"))) {
    admin.password = "admin123"
    await admin.save()
  }

  await Promise.all(
    categories.map((name) =>
      Category.findOrCreate({
        where: { name },
        defaults: {
          name,
          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          created_by_admin_id: admin.id,
        },
      }),
    ),
  )

  await PlatformSetting.findOrCreate({
    where: { id: 1 },
    defaults: {
      vendor_commission_percent: 5,
      customer_service_charge_percent: 2,
      platform_fee: 99,
      updated_by_admin_id: admin.id,
    },
  })

  logger.info("System seed completed")
}
