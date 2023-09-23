const jwt = require('jsonwebtoken');
const key = 'eyJhbGciOiJIUzI1NiJ9.eyJSb2xlIjoiQWRtaW4iLCJJc3N1ZXIiOiJJc3N1ZXIiLCJVc2VybmFtZSI6IkphdmFJblVzZSIsImV4cCI6MTY5NTQ1OTAyMiwiaWF0IjoxNjk1NDU5MDIyfQ.AV9LAkze8oxNJR9yv4oHb2geqvne4a6aKoHTXXxpl1g'; 

// Middleware function for verifying and decoding the token
const verifyToken = (req, res, next) => {
  const token = req.headers['x-access-token'];
  if (token) {
    jwt.verify(token, key, (err, decoded) => {
      if (err) {
        return res.status(403).json({
          status: false,
          error: err.message, 
        });
      } else {
        req.decoded = decoded;
        next();
      }
    });
  } else {
    return res.status(401).json({
      status: false,
      error: 'No token provided', 
    });
  }
};

module.exports = verifyToken;
