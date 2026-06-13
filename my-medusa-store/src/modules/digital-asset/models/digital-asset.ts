import { model } from "@medusajs/framework/utils"

export const DigitalAsset = model.define("digital_asset", {
  id: model.id().primaryKey(),
  name: model.text(),
  file_url: model.text(), // Where the file is stored (e.g., S3 URL or Local path)
  download_limit: model.number().nullable(), // E.g., 3 max downloads (optional)
  expires_at: model.dateTime().nullable(),   // E.g., Link expires in 7 days (optional)
})