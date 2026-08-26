import jwt from 'jsonwebtoken';
import 'dotenv/config';

const JWT_SECRET = process.env.JWT_SECRET || 'jwt_secret_key';

// Attach decoded user to req; reject if no valid token
export const verifyToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ Status: false, Error: 'Not authenticated' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ Status: false, Error: 'Token error' });
    req.user = decoded;
    next();
  });
};

// Role-specific guards (each also runs verifyToken)
const requireRole = (...roles) => [
  verifyToken,
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ Status: false, Error: 'Forbidden' });
    }
    next();
  },
];

export const verifyAdmin      = requireRole('admin');
export const verifyManager    = requireRole('admin', 'manager');
export const verifyTechnician = requireRole('admin', 'manager', 'technician');
