const bcrypt = require("bcrypt");
const genAuthtoken = require("../utils/genAuthtoken");
const saltRounds = 10;
const jwt = require("jsonwebtoken");
require("dotenv").config();
const mongoose = require('mongoose');
const multer = require("multer");

const {Users} = require("../database/user.model");
const Joi = require("joi");
const {
    INVALID_INPUT,
    USER_REGISTER,
    USER_REGISTERATION_ERROR,
    USER_LOGIN,
    USER_NOT_FOUND,
    USER_FOUND,
    USER_ID_INVALID,
    USER_DETAILS_FOUND,
    EXISTING_USER,
    EXISTING_USER_ERROR,
    INVALID_CREDS,
    SERVER_ERROR,
    UPDATE_USER_ERROR,
    UPDATE_USER,
    TOKEN_ERROR,
    LINK,
    PASSWORD_RESET,
    PASSWORD_RESET_ERROR,
    NOT_AUTHORIZED,
    PASSWORD_REQUIRED,
    NO_FEILDS_TO_UPDATE,
    INVALID_username,
    INVALID_EMAIL_INPUT,
    INVALID_BASECURRENCY,
    INVALID_PASSWORD,
    INVALID_USERNAME,
    INVALID_USERNAME_PATTERN,
    INVALID_PASSWORD_PATTERN,
    EMPTY_PASSWORD,
    INVALID_BASECURRENCY_BASE,
    PASSWORD_STRING_BASE,
    EMPTY_USERNAME,
    EMPTY_EMAIL,
    EMAIL_REQUIRED,
    USERNAME_REQUIRED,
    CURRENCY_REQUIRED,
    CONFIRM_PASSWORD_ERROR,
    INVALID_TOKEN,
    CONFIRM_PASSWORD_REQUIRED,
    Sequelize_query_SequelizeForeignKeyConstraintError,
    USER_LOGIN_ERROR,
    INVALID_USER,
    USERS_FOUND,
    DATABASE_ERROR,
    EMAIL_UNIQUE,
    INVALID_CURRENT_PASSWORD,
    QUERY_ERROR,
} = require("../Codes");
const {findOne, createUser, findById, update, updateUser, findallUsers} = require("../Query/Queries");
const {SeqCreateUser, SeqUpdateUser} = require("../Query/sequelizeQuery");
INVALID_PASSWORD_PATTERN;
const secretkey = process.env.JWT_SECRET;

const storage = multer.memoryStorage();



exports.register = async (req, res) => {
    const {username, email, password, confirmPassword, baseCurrency} = req.body;
    const profileUrl = "example@url";

    const registerSchema = Joi.object({
        username: Joi.string().min(3).max(30).pattern(/^\S*$/).required(),
        email: Joi.string().email().required(),
        password: Joi.string()
            .min(8)
            .pattern(new RegExp("^[a-zA-Z0-9]{3,30}$"))
            .required(),
        confirmPassword: Joi.string()
            .valid(Joi.ref("password"))
            .required()
            .messages({
                "any.only": "Passwords must match",
            }),
        baseCurrency: Joi.number().min(1).max(3).required(),
    });

    try {
        const {error, value} = registerSchema.validate(req.body);
        if (error) {
            const errorDetails = error.details[0];
            const errorMap = {
                username: {
                    "string.min": INVALID_USERNAME,
                    "any.required": USERNAME_REQUIRED,
                    "string.pattern.base": INVALID_USERNAME_PATTERN,
                    "string.empty": EMPTY_USERNAME,
                },
                email: {
                    "string.empty": EMPTY_EMAIL,
                    "string.email": INVALID_EMAIL_INPUT,
                    "any.required": EMAIL_REQUIRED,
                },
                password: {
                    "string.min": INVALID_PASSWORD,
                    "string.pattern.base": INVALID_PASSWORD_PATTERN,
                    "string.empty": EMPTY_PASSWORD,
                    "any.required": PASSWORD_REQUIRED,
                },
                confirmPassword: {
                    "any.only": CONFIRM_PASSWORD_ERROR,
                    "any.required": CONFIRM_PASSWORD_REQUIRED,
                },
                baseCurrency: {
                    "number.base": INVALID_BASECURRENCY_BASE,
                    "any.required": CURRENCY_REQUIRED,
                    default: INVALID_BASECURRENCY,
                },
            };

            const errorResponse =
                errorMap[errorDetails.path[0]]?.[errorDetails.type] ||
                errorMap[errorDetails.path[0]]?.["default"] ||
                INVALID_INPUT;
            return res.status(400).send({
                message: errorResponse.message,
                success: false,
                code: errorResponse.code,
            });
        }

        const existingUser = await findOne(email);

        if (existingUser) {
            return res.status(400).send({
                message: EXISTING_USER_ERROR.message,
                code: EXISTING_USER_ERROR.code,
                success: false,
            });
        }

        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const data = {
            username,
            email,
            hashedPassword,
            baseCurrency,
            profileUrl,
        };
       
        const newUser = await createUser(data);


        if (newUser) {
            let profile = {}
            if (newUser._id) {
                profile = {
                    userId: newUser._id,
                    username,
                    email,
                    baseCurrency,
                    profileUrl,
                };

            } else {
                profile = {
                    userId: newUser.userId,
                    username,
                    email,
                    baseCurrency,
                    profileUrl,
                };
            }
            const token = genAuthtoken(profile);

            return res.status(201).json({
                message: USER_REGISTER.message,
                success: true,
                code: USER_REGISTER.code,
                data: {
                    token,
                    profile,
                },
            });
        } else {
            return res.status(400).json({
                message: USER_REGISTERATION_ERROR.message,
                success: false,
                code: USER_REGISTERATION_ERROR.code,
            });
        }
    } catch (error) {
        if (error.name === "SequelizeForeignKeyConstraintError") {
            return res.status(400).send({
                message: Sequelize_query_SequelizeForeignKeyConstraintError.message,
                success: false,
                code: Sequelize_query_SequelizeForeignKeyConstraintError.code,
            });
        }

        console.log(error);
        return res.status(500).send({

            message: SERVER_ERROR.message,
            success: false,
            code: SERVER_ERROR.code,
        });
    }
};








exports.login = async (req, res) => {
    const {email, password} = req.body;

    const loginSchema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string()
            .min(8)
            .pattern(new RegExp("^[a-zA-Z0-9]{3,30}$"))
            .required(),
    });

    try {
        const {error, value} = loginSchema.validate(req.body);
        if (error) {
            const errorDetails = error.details[0];
            const errorMap = {
                email: {
                    "string.empty": EMPTY_EMAIL,
                    "string.email": INVALID_EMAIL_INPUT,
                    "any.required": EMAIL_REQUIRED,
                },
                password: {
                    "string.min": INVALID_PASSWORD,
                    "string.pattern.base": INVALID_PASSWORD_PATTERN,
                    "string.empty": EMPTY_PASSWORD,
                    "any.required": PASSWORD_REQUIRED,
                },
            };

            const errorResponse =
                errorMap[errorDetails.path[0]]?.[errorDetails.type] || INVALID_INPUT;
            return res.status(400).send({
                message: errorResponse.message,
                success: false,
                code: errorResponse.code,
            });
        }

        const user = await findOne(email);

        if (!user) {
            return res.status(400).json({
                message: INVALID_CREDS.message,
                success: false,
                code: INVALID_CREDS.code,
            });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(400).json({
                message: INVALID_CREDS.message,
                success: false,
                code: INVALID_CREDS.code,
            });
        }
        let payload = {}
        
        if (process.env.DATABASE === "mongodb") {
           
            payload = {
                userId: user._id,
                username: user.username,
                email: user.email,
                baseCurrency: user.baseCurrency,
                profileUrl: user.profileUrl.toString(),
            };
        } else {
            payload = {
                userId: user.userId,
                username: user.username,
                email: user.email,
                baseCurrency: user.baseCurrency,
                profileUrl: user.profileUrl.toString(),
            };
        }
      


        const token = genAuthtoken(payload);
        if (!token) {
            return res.status(400).send({
                message: TOKEN_ERROR.message,
                success: false,
                code: TOKEN_ERROR.code,
            });
        }

        res.status(201).json({
            message: USER_LOGIN.message,
            success: true,
            code: USER_LOGIN.code,
            data: {
                profile: payload,
                token,
            },
        });
    } catch (error) {
        console.error("Error logging in user:", error);

        return res.status(500).send({
            message: SERVER_ERROR.message,
            success: false,
            code: SERVER_ERROR.code,
        });
    }
};






exports.fetchUserDetails = async (req, res) => {
    const userId = req.params.id;

    try {
        if (process.env.DATABASE === "mongodb") {
            if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
                return res.status(404).json({
                    message: USER_ID_INVALID.message,
                    success: false,
                    code: USER_ID_INVALID.code,
                });
            }
        } else {
            if (!userId || isNaN(userId)) {
                return res.status(404).json({
                    message: USER_ID_INVALID.message,
                    success: false,
                    code: USER_ID_INVALID.code,
                });
            }
        }
    
        const user = await findById(userId);
        if (!user) {
            return res.status(400).json({
                message: USER_NOT_FOUND.message,
                success: false,
                code: USER_NOT_FOUND.code,
            });
        }

const profile = {
    userId: user.userId,
    username: user.username,
    email: user.email,
    baseCurrency: user.baseCurrency,
    profileUrl: user.profileUrl.toString(),

};
        res.status(200).json({
            message: USER_DETAILS_FOUND.message,
            success: true,
            code: USER_DETAILS_FOUND.code,
            data: {
                profile,
            },
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: SERVER_ERROR.message,
            success: false,
            code: SERVER_ERROR.code,
        });
    }
};

exports.updateProfile = async (req, res) => {

    const userId = req.user;

    const fieldsToUpdate = req.body;

    const updateSchema = Joi.object({
        username: Joi.string().min(3).max(30).pattern(/^\S*$/),
        email: Joi.string().email(),
        currentPassword:Joi.string().min(8).pattern(new RegExp("^[a-zA-Z0-9]{3,30}$")),
        newPassword: Joi.string().min(8).pattern(new RegExp("^[a-zA-Z0-9]{3,30}$")),
        confirmPassword: Joi.string()
        .valid(Joi.ref("newPassword"))
        .messages({
            "any.only": "Passwords must match",
        }),
        baseCurrency: Joi.number().min(1).max(3),
        profileUrl: Joi.binary(),
    });

    try {
    
        if (Object.keys(fieldsToUpdate).length === 0) {
            return res.status(400).send({
                message: NO_FEILDS_TO_UPDATE.message,
                success: false,
                code: NO_FEILDS_TO_UPDATE.code,
            });
        }

        const {error, value} = updateSchema.validate(fieldsToUpdate);
        if (error) {
            const errorDetails = error.details[0];
            const errorMap = {
                username: {
                    "string.min": INVALID_USERNAME,
                    "string.pattern.base": INVALID_USERNAME_PATTERN,
                    "string.empty": EMPTY_USERNAME,
                },
                email: {
                    "string.email": INVALID_EMAIL_INPUT,
                    "string.empty": EMPTY_EMAIL,
                },
                currentPassword:{
                    "string.min": INVALID_PASSWORD,
                    "string.pattern.base": INVALID_PASSWORD_PATTERN,
                    "string.empty": EMPTY_PASSWORD,
                },
                newPassword: {
                    "string.min": INVALID_PASSWORD,
                    "string.pattern.base": INVALID_PASSWORD_PATTERN,
                    "string.empty": EMPTY_PASSWORD,
                },
                confirmPassword: {
                    "any.only": CONFIRM_PASSWORD_ERROR,
                    "any.required": CONFIRM_PASSWORD_REQUIRED,
                },
                baseCurrency: {
                    "number.base": INVALID_BASECURRENCY_BASE,
                    "number.min": INVALID_BASECURRENCY,
                    "number.max": INVALID_BASECURRENCY,
                },
            };

            const errorResponse =
                errorMap[errorDetails.path[0]]?.[errorDetails.type] || INVALID_INPUT;
            return res.status(400).send({
                message: errorResponse.message,
                success: false,
                code: errorResponse.code,
            });
        }

        // const dat=findById(userId)
        // dat.then((res)=>{
        //     console.log("response............");
            
        //     console.log(res);
            
        // }).catch((err)=>{
        //     return res.send({
        //         message:QUERY_ERROR.message,
        //         success:false,
        //         code:QUERY_ERROR.code,
        //     })
            
        // })


        const user = await findById(userId);
        if (!user) {
            return res.status(404).send({
                message: USER_NOT_FOUND.message,
                success: false,
                code: USER_NOT_FOUND.code,
            });
        }

        const updateData = {...fieldsToUpdate};
        
        

        if (updateData.currentPassword && updateData.newPassword) {
            
            
            const isMatch=await bcrypt.compare(updateData.currentPassword, user.password);
            if(!isMatch){
                return res.send({
                    message:INVALID_CURRENT_PASSWORD.message,
                    success:false,
                    code:INVALID_CURRENT_PASSWORD.code
                })
            }

            updateData.password = await bcrypt.hash(updateData.newPassword, saltRounds);
        }

        const updatedUser = await updateUser(user, updateData)
        if (!updatedUser) {
            return res.status(500).send({
                message: UPDATE_USER_ERROR.message,
                success: false,
                code: UPDATE_USER_ERROR.code
            })
        }


        const profileData = await findById(userId);

        const profile = {
            userId: profileData.userId,
            username: profileData.username,
            email: profileData.email,
            baseCurrency: profileData.baseCurrency,
            profileUrl: profileData.profileUrl.toString(),

        };

        res.status(200).send({
            message: UPDATE_USER.message,
            success: true,
            code: UPDATE_USER.code,
            data: {profile},
        });
    } catch (error) {
    //    console.log(error);
       if(error.name=="SequelizeUniqueConstraintError"){
        return res.status(400).send({
            message: EMAIL_UNIQUE.message,
            success: false,
            code: EMAIL_UNIQUE.code,
        });
       }
       console.log(error);
       
        return res.status(500).send({
            message: SERVER_ERROR.message,
            success: false,
            code: SERVER_ERROR.code,
        });
    }
};


exports.forgotpassword = async(req, res) => {
  
    const fieldsToUpdate = req.body;

    const validationSchema = Joi.object({
        email: Joi.string().email().required(),
    });
    const type = "resetPassword";
    try {
        const {error, value} = validationSchema.validate(fieldsToUpdate);
        if (Object.keys(fieldsToUpdate).length === 0) {
            return res.status(400).send({
                message: NO_FEILDS_TO_UPDATE.message,
                success: false,
                code: NO_FEILDS_TO_UPDATE.code,
            });
        }
        if (error) {
            const errorDetails = error.details[0];
            const errorMap = {
               
                email: {
                    "string.email": INVALID_EMAIL_INPUT,
                    "string.empty": EMPTY_EMAIL,
                    "any.required": EMAIL_REQUIRED,
                },
    
             
            };

            const errorResponse =
                errorMap[errorDetails.path[0]]?.[errorDetails.type] || INVALID_INPUT;
            return res.status(400).send({
                message: errorResponse.message,
                success: false,
                code: errorResponse.code,
            });
        }
        const user=await findOne(fieldsToUpdate.email)
        if(!user){
            return res.status(400).send({message:INVALID_USER.message,success:false,code:INVALID_USER.code})
        }

        const token = genAuthtoken({email:fieldsToUpdate.email}, type);
        if (!token) {
            return res.status(400).send({
                message: TOKEN_ERROR.message,
                success: false,
                code: TOKEN_ERROR.code,
            });
        }
        const link = `/v1/users/reset-password?token=${token}`;
        return res.status(200).send({
            message: LINK.message,
            success: true,
            code: LINK.code,
            data: {
                link,
            },
        });
    } catch (error) {
        console.log(error);
        
        return res.status(500).send({
            message: SERVER_ERROR.message,
            success: false,
            code: SERVER_ERROR.code,
        });
    }
};


exports.resetPassword = async (req, res) => {
    const token = req.query.token;
    const {password, confirmPassword} = req.body;

    let decodedData;
    try {
        decodedData = jwt.verify(token, secretkey);
    } catch (error) {
        return res.status(400).send({
            message: INVALID_TOKEN.message,
            success: false,
            code: INVALID_TOKEN.code,
        });
    }

    if (!decodedData || decodedData.type !== "resetPassword") {
        return res.status(401).send({
            message: NOT_AUTHORIZED.message,
            success: false,
            code: NOT_AUTHORIZED.code,
        });
    }
    if (!decodedData.email) {
        return res.status(40).send({
            message: NOT_AUTHORIZED.message,
            success: false,
            code: NOT_AUTHORIZED.code,
        });
    }
    const email = decodedData.email;

    const validationSchema = Joi.object({
        password: Joi.string()
            .min(8)
            .pattern(new RegExp("^[a-zA-Z0-9]{3,30}$"))
            .required(),
        confirmPassword: Joi.string()
            .valid(Joi.ref("password"))
            .required()
            .messages({
                "any.only": "Passwords must match",
            }),
    });

    try {
        if (!password) {
            return res.status(400).send({
                message: PASSWORD_REQUIRED.message,
                success: false,
                code: PASSWORD_REQUIRED.code,
            });
        }

        const {error, value} = validationSchema.validate({
            password,
            confirmPassword,
        });
        if (error) {
            const errorDetails = error.details[0];
            const errorMap = {
                password: {
                    "string.min": INVALID_PASSWORD,
                    "string.pattern.base": INVALID_PASSWORD_PATTERN,
                    "string.empty": EMPTY_PASSWORD,
                    "any.required": PASSWORD_REQUIRED,
                },
                confirmPassword: {
                    "any.only": CONFIRM_PASSWORD_ERROR,
                    "any.required": CONFIRM_PASSWORD_REQUIRED,
                },
            };

            const errorResponse =
                errorMap[errorDetails.path[0]]?.[errorDetails.type] ||
                errorMap[errorDetails.path[0]]?.["default"] ||
                INVALID_INPUT;
            return res.status(400).send({
                message: errorResponse.message,
                success: false,
                code: errorResponse.code,
            });
        }

        if (!email) {
            return res.status(401).send({
                message: NOT_AUTHORIZED.message,
                success: false,
                code: NOT_AUTHORIZED.code,
            });
        }

        const user = await findOne(email)

        if (!user) {
            return res.status(400).send({
                message: USER_NOT_FOUND.message,
                success: false,
                code: USER_NOT_FOUND.code,
            });
        }

        const hashedPassword = await bcrypt.hash(value.password, saltRounds);
        const updateData = {
            password: hashedPassword
        }
        const updatedUser = await updateUser(user, updateData)

        if (!updatedUser) {
            return res.status(400).send({
                message: PASSWORD_RESET_ERROR.message,
                success: false,
                code: PASSWORD_RESET_ERROR.code,
            });
        }

        return res.status(200).send({
            message: PASSWORD_RESET.message,
            success: true,
            code: PASSWORD_RESET.code,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            message: SERVER_ERROR.message,
            success: false,
            code: SERVER_ERROR.code,
        });
    }
};

exports.getallUsers=async(req,res)=>{
const userId=req.user
if(!userId){
    return res.send({
        message:INVALID_USER.message,
        success:false,
        code:INVALID_USER.code
    })
}
try {
    const users=await findallUsers(userId);

return res.send({message:USERS_FOUND.message,
    success:true,
    code:USERS_FOUND.code,
    data:{
        users
    }

})
} catch (error) {
    return res.status(500).send({
        message: SERVER_ERROR.message,
        success: false,
        code: SERVER_ERROR.code,
    });
}


}