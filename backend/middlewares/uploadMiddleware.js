const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Cloudinary configuration is automatically loaded from CLOUDINARY_URL environment variable
// No need to manually call cloudinary.config() if CLOUDINARY_URL is set

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "uploads", // Folder name in Cloudinary
        allowed_formats: ["jpg", "jpeg", "png"],
        transformation: [{ quality: "auto" }] // Optional: auto quality optimization
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
    if(allowedTypes.includes(file.mimetype)){
        cb(null, true);
    } else {
        cb(new Error("Only .jpg, .jpeg and .png files are allowed"), false);
    }
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
