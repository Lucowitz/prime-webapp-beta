import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthRequest extends Request {
  userId?: string;
  isBusiness?: boolean;
}

const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded: any = jwt.verify(token, 'your-secret-key');
    req.userId = decoded.userId;
    req.isBusiness = decoded.isBusiness;
    next();
  } catch (e) {
    res.status(400).json({ message: 'Token is not valid' });
  }
};

export default authMiddleware;
