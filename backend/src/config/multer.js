import multer from "multer";
import path from "path";
import fs from "fs";

// Upload folder
const uploadPath = "uploads/issues";

// Create folder automatically if it doesn't exist
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, {
    recursive: true,
  });
}

// Storage configuration
const storage = multer.diskStorage({

  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {

    const uniqueName =
      Date.now() +
      "-" +
      Math.round(
        Math.random() * 1e9
      ) +
      path.extname(file.originalname);

    cb(null, uniqueName);
  },

});

// Allowed file types
const fileFilter = (
  req,
  file,
  cb
) => {

  const allowedTypes = [

    "image/jpeg",
    "image/png",
    "image/jpg",
    "image/webp",

    "video/mp4",
    "video/mov",
    "video/webm",

  ];

  if (
    allowedTypes.includes(
      file.mimetype
    )
  ) {

    cb(null, true);

  } else {

    cb(
      new Error(
        "Only images and videos are allowed."
      ),
      false
    );

  }

};

const upload = multer({

  storage,

  fileFilter,

  limits: {

    fileSize:
      50 * 1024 * 1024,

  },

});

export default upload;