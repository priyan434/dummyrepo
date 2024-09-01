const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const saltRounds = 10;
require("dotenv").config();
const Joi = require("joi");

const mongoose = require("mongoose");
const {
  INVALID_USERNAME,
  USERNAME_REQUIRED,
  INVALID_USERNAME_PATTERN,
  EMPTY_USERNAME,
  EMPTY_EMAIL,
  INVALID_EMAIL_INPUT,
  EMAIL_REQUIRED,
  INVALID_PASSWORD,
  INVALID_PASSWORD_PATTERN,
  EMPTY_PASSWORD,
  PASSWORD_REQUIRED,
  CONFIRM_PASSWORD_ERROR,
  CONFIRM_PASSWORD_REQUIRED,
  INVALID_BASECURRENCY_BASE,
  CURRENCY_REQUIRED,
  INVALID_BASECURRENCY,
  EXISTING_USER_ERROR,
  USER_REGISTER,
  USER_REGISTERATION_ERROR,
  SERVER_ERROR,
  USER_LOGIN,
  TOKEN_ERROR,
  INVALID_CREDS,
  USER_DETAILS_FOUND,
  USER_NOT_FOUND,
  USER_ID_INVALID,
  NO_FEILDS_TO_UPDATE,
  UPDATE_USER_ERROR,
  UPDATE_USER,
  LINK,
  NOT_AUTHORIZED,
  INVALID_TOKEN,
  INVALID_USER,
  PASSWORD_RESET,
} = require("../../Codes");
const { Users, Currencies } = require("../../database/mongodb.model");
const genAuthtoken = require("../../utils/genAuthtoken");
exports.register = async (req, res) => {
  const { username, email, password, confirmPassword, baseCurrency } = req.body;
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
    const { error, value } = registerSchema.validate(req.body);
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

    const existingUser = await Users.findOne({ email, isActive: true });
    if (existingUser) {
      return res.status(400).send({
        message: EXISTING_USER_ERROR.message,
        code: EXISTING_USER_ERROR.code,
        success: false,
      });
    }
    const currency = await Currencies.find({ currencyId: baseCurrency });

    if (!currency) {
      return res.status(400).json({ message: "Invalid base currency" });
    }

    //  console.log(currency[0].currencyId);

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = new Users({
      username,
      email,
      password: hashedPassword,
      baseCurrency: currency[0].currencyId,
      profileUrl: "example@url",
      isActive: true,
    });

    const data = await newUser.save();

    if (data) {
      const profile = {
        userId: data._id,
        username,
        email,
        baseCurrency: data.baseCurrency,
        profileUrl: data.profileUrl,
      };
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
    console.log(error);

    return res.status(500).send({
      message: SERVER_ERROR.message,
      success: false,
      code: SERVER_ERROR.code,
    });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string()
      .min(8)
      .pattern(new RegExp("^[a-zA-Z0-9]{3,30}$"))
      .required(),
  });

  try {
    const { error, value } = loginSchema.validate(req.body);
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

    const user = await Users.findOne({ email, isActive: true });

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

    const payload = {
      userId: user._id,
      username: user.username,
      email: user.email,
      baseCurrency: user.baseCurrency,
      profileUrl: user.profileUrl.toString("base64"),
    };

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
    if (!userId) {
      return res.status(404).json({
        message: USER_ID_INVALID.message,
        success: false,
        code: USER_ID_INVALID.code,
      });
    }
    const user = await Users.findOne(
      { _id: userId, isActive: true },
      { password: 0, isActive: 0 }
    );
    if (!user) {
      return res.status(400).json({
        message: USER_NOT_FOUND.message,
        success: false,
        code: USER_NOT_FOUND.code,
      });
    }
    res.status(200).json({
      message: USER_DETAILS_FOUND.message,
      success: true,
      code: USER_DETAILS_FOUND.code,
      data: {
        user,
      },
    });
  } catch (error) {
    console.log(error.name);
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
    password: Joi.string().min(8).pattern(new RegExp("^[a-zA-Z0-9]{3,30}$")),
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

    const { error, value } = updateSchema.validate(fieldsToUpdate);
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
        password: {
          "string.min": INVALID_PASSWORD,
          "string.pattern.base": INVALID_PASSWORD_PATTERN,
          "string.empty": EMPTY_PASSWORD,
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

    let currency;
    if (fieldsToUpdate.baseCurrency) {
      currency = await Currencies.find({
        currencyId: fieldsToUpdate.baseCurrency,
      });
      if (!currency) {
        return res.status(400).json({ message: "Invalid base currency" });
      }



      let updatedUser = await Users.findByIdAndUpdate(
        { _id: userId, isActive: true },
        {
          $set: { baseCurrency: currency[0].currencyId },
        },
        { new: true }
      );

      if (!updatedUser) {
        return res.status(400).send({
          message: UPDATE_USER_ERROR.message,
          success: false,
          code: UPDATE_USER_ERROR.code,
        });
      }
    }

    if (fieldsToUpdate.password) {
      hashedPassword = await bcrypt.hash(fieldsToUpdate.password, saltRounds);
      let updatedUser = await Users.findByIdAndUpdate(
        { _id: userId, isActive: true },
        {
          $set: { password: hashedPassword },
        },
        { new: true }
      );
      if (!updatedUser) {
        return res.status(400).send({
          message: UPDATE_USER_ERROR.message,
          success: false,
          code: UPDATE_USER_ERROR.code,
        });
      }
    }

    let updatedUser = await Users.findByIdAndUpdate(
      { _id: userId, isActive: true },
      {
        $set: { ...fieldsToUpdate },
      },
      { new: true }
    );
    if (!updatedUser) {
      return res.status(400).send({
        message: UPDATE_USER_ERROR.message,
        success: false,
        code: UPDATE_USER_ERROR.code,
      });
    }
    const {
      userId: _id,
      username,
      email,
      profileUrl,
      baseCurrency,
    } = updatedUser;

    return res.status(200).send({
      message: UPDATE_USER.message,
      success: true,
      code: UPDATE_USER.code,
      data: {
        profile: {
          userId,
          email,
          username,
          profileUrl,
          baseCurrency,
        },
      },
    });
  } catch (error) {
    console.error(error.name);
    return res.status(500).send({
      message: SERVER_ERROR.message,
      success: false,
      code: SERVER_ERROR.code,
    });
  }
};

exports.forgotpassword = async (req, res) => {
  const fieldsToUpdate = req.body;

  const validationSchema = Joi.object({
    email: Joi.string().email().required(),
  });

  const type = "resetPassword";
  try {
    const { error, value } = validationSchema.validate(fieldsToUpdate);
    if (error) {
      const errorDetails = error.details[0];
      const errorMap = {
        email: {
          "string.empty": EMPTY_EMAIL,
          "string.email": INVALID_EMAIL_INPUT,
          "any.required": EMAIL_REQUIRED,
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
    const user = await Users.findOne({
      email: fieldsToUpdate.email,
      isActive: true,
    });
    if (!user) {
      return res.status(400).send({
        message: INVALID_USER.message,
        success: "false",
        code: INVALID_USER.code,
      });
    }
    const token = genAuthtoken({ email: fieldsToUpdate.email }, type);

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
  const { password, confirmPassword } = req.body;
  const secretkey = process.env.JWT_SECRET;
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

    const { error, value } = validationSchema.validate({
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

    const user = await Users.findOne({ email, isActive: true });

    if (!user) {
      return res.status(400).send({
        message: USER_NOT_FOUND.message,
        success: false,
        code: USER_NOT_FOUND.code,
      });
    }
    hashedPassword = await bcrypt.hash(password, saltRounds);
    let updatedUser = await Users.findByIdAndUpdate(
      { _id: user._id, isActive: true },
      {
        $set: { password: hashedPassword },
      },
      { new: true }
    );
    if (!updatedUser) {
      return res.status(400).send({
        message: UPDATE_USER_ERROR.message,
        success: false,
        code: UPDATE_USER_ERROR.code,
      });
    }

    return res.status(200).send({
      message: PASSWORD_RESET.message,
      success: true,
      code: PASSWORD_RESET.code,
    });
  } catch (error) {
    console.log(error.name);
    return res.status(500).send({
      message: SERVER_ERROR.message,
      success: false,
      code: SERVER_ERROR.code,
    });
  }
};
