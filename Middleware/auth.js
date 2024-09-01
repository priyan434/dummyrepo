
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { SERVER_ERROR, NOT_AUTHORIZED, TOKEN_ERROR } = require("../Codes");
const secretkey = process.env.JWT_SECRET;

const auth = (req, res, next) => {
    try {
        const token = req.header('x-auth-token');
        if (!token) {
            return res.status(400).send({
                message: TOKEN_ERROR.message,
                success: false,
                code: TOKEN_ERROR.code
            });
        }

        const data = jwt.verify(token, secretkey);
        if (data.type === "auth") {
            
            
            req.user = data.userId;

            next();
        } else {
            return res.status(403).send({
                message: NOT_AUTHORIZED.message,
                success: false,
                code: NOT_AUTHORIZED.code
            });
        }
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({
                message: "JsonWebTokenError: jwt malformed",
                success: false,
                code: 'JWT--E001'
            });
        }
        return res.status(500).send({
            message: SERVER_ERROR.message,
            success: false,
            code: SERVER_ERROR.code
        });
    }
};

module.exports = { auth };
