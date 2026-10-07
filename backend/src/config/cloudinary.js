import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = async (buffer, fileName, folder = "uploads", resourceType = "auto") => {
  try {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: resourceType,
          public_id: fileName,
          folder: folder,
          overwrite: true,
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      const readable = Readable.from(buffer);
      readable.pipe(uploadStream);
    });
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw error;
  }
};

export const deleteCloudinaryResource = async (cloudinaryUrl) => {
  try {
    if (!cloudinaryUrl) return;

    const url = new URL(cloudinaryUrl);
    const urlParts = url.pathname.split("/").filter(Boolean);
    let resourceType = "image"; // Default

    const resourceTypeIndex = urlParts.findIndex((part) =>
      ["image", "raw", "video"].includes(part)
    );
    if (resourceTypeIndex === -1) return;
    resourceType = urlParts[resourceTypeIndex];

    const uploadIndex = urlParts.indexOf("upload", resourceTypeIndex);
    if (uploadIndex === -1) return;

    const publicIdParts = urlParts.slice(uploadIndex + 1);
    if (/^s--.*--$/.test(publicIdParts[0])) {
      publicIdParts.shift();
    }
    if (/^v\d+$/.test(publicIdParts[0])) {
      publicIdParts.shift();
    }

    if (resourceType !== "raw") {
      publicIdParts[publicIdParts.length - 1] = publicIdParts[publicIdParts.length - 1].replace(
        /\.[^.]+$/,
        ""
      );
    }

    const publicId = publicIdParts.join("/");

    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    console.log("Deleted from Cloudinary:", publicId, "type:", resourceType);
  } catch (error) {
    console.warn("Could not delete from Cloudinary:", error);
    // Don't throw, just log warning
  }
};

export default cloudinary;
