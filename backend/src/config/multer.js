import multer from "multer";

const storage = multer.memoryStorage();

const issueFileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "image/webp",
    "image/gif",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, JPEG, PNG, WebP, and GIF images are allowed."), false);
  }
};

const noticeFileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "image/webp",
    "video/mp4",
    "video/mov",
    "video/webm",
    "application/pdf",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only images, videos, and PDFs are allowed."), false);
  }
};

const upload = multer({
  storage,
  fileFilter: noticeFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

export const proofUpload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "application/pdf",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only images and PDFs are allowed."), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB for payment proof
  },
});

export const issueUpload = multer({
  storage,
  fileFilter: issueFileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB per image
  },
});

export const messExpenseUpload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/webp",
      "image/gif",
      "application/pdf",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only images and PDFs are allowed."), false);
    }
  },
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 5,
  },
});

export { upload };
export default upload;