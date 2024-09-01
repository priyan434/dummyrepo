const jwt = require('jsonwebtoken');
require('dotenv').config();
const secretkey = process.env.JWT_SECRET

const genAuthtoken = (data, type="auth") => {
 
    const decodedData = { ...data, type: type }
    const token = jwt.sign(decodedData, secretkey)
    return token
}
module.exports = genAuthtoken
