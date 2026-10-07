import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";

const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          hall: {
            select: { id: true, hallName: true, hallNumber: true },
          },
          room: {
            select: { id: true, roomNumber: true, floor: true, block: true },
          },
        },
      });

      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: "Account is inactive or no longer exists.",
        });
      }

      // Exclude password field from req.user
      const { password, ...userWithoutPassword } = user;
      req.user = {
        ...userWithoutPassword,
        _id: user.id,
        hallId: user.hall ? { ...user.hall, _id: user.hall.id } : user.hallId,
        roomId: user.room ? { ...user.room, _id: user.room.id } : user.roomId,
      };

      return next();
    } else {
      return res.status(401).json({
        success: false,
        message: "Not authorized, token missing",
      });
    }
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

export default protect;