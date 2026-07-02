import cloudinary from "../config/cloudinary.config.js";

/**
 * Upload buffer to Cloudinary in a specific folder.
 * @param {Buffer} fileBuffer 
 * @param {string} folder 
 * @returns {Promise<object>}
 */
export const uploadToCloudinary = (fileBuffer, folder = "hrms_profiles") => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                resource_type: "image"
            },
            (error, result) => {
                if (error) {
                    console.error("Cloudinary upload stream error:", error);
                    return reject(error);
                }
                resolve(result);
            }
        );

        uploadStream.end(fileBuffer);
    });
};

/**
 * Delete asset from Cloudinary using its secure URL.
 * @param {string} url 
 * @returns {Promise<object>}
 */
export const deleteFromCloudinary = async (url) => {
    if (!url || !url.includes("cloudinary.com")) return null;
    try {
        // Extract public ID from Cloudinary URL
        // Example: https://res.cloudinary.com/cloudname/image/upload/v12345/hrms_profiles/xyz.png
        const parts = url.split("/");
        const uploadIndex = parts.indexOf("upload");
        if (uploadIndex === -1) return null;

        // Public ID is everything after version tag (starts with 'v' followed by numbers)
        const relevantParts = parts.slice(uploadIndex + 2); // skip "upload" and version segment
        const fullPublicId = relevantParts.join("/");
        
        // Strip file extension (.png, .jpg, etc.)
        const publicId = fullPublicId.split(".").slice(0, -1).join(".");

        const response = await cloudinary.uploader.destroy(publicId);
        return response;
    } catch (error) {
        console.error("Cloudinary delete error:", error);
        return null;
    }
};
