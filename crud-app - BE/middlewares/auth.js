const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.header('Authorization').replace('Bearer ', '');
  if (!token) {
    return res.status(401).send('Acesso negado');
  }
  try {
    const decoded = jwt.verify(token, 'secrectKey');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).send('Token inválido');
  }
};
