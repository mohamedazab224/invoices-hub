const jwt = require('jsonwebtoken');
const dataStore = require('../utils/dataStore');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'يرجى تسجيل الدخول' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await dataStore.findById('users', decoded.userId);

    if (!user) {
      throw new Error('المستخدم غير موجود');
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ error: 'يرجى تسجيل الدخول' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'غير مصرح لك بهذه العملية' });
    }
    next();
  };
};

const authorizeDepartment = (...departments) => {
  return (req, res, next) => {
    if (!departments.includes(req.user.department)) {
      return res.status(403).json({ error: 'غير مصرح لك بهذه العملية' });
    }
    next();
  };
};

module.exports = { auth, authorize, authorizeDepartment };