import { validationResult } from "express-validator";

export const rejectInvalidRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Request validation failed.",
      errors: errors.array().map(({ path, msg }) => ({ field: path, message: msg })),
    });
  }
  return next();
};

export const requireObjectId = (parameter) => (req, res, next) => {
  const value = req.params[parameter];
  const isUuid = typeof value === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(value);

  if (!isUuid) {
    return res.status(400).json({ success: false, message: `Invalid ${parameter}.` });
  }

  return next();
};