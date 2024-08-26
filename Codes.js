const Codes = {
  USER_REGISTER: {
    message: "The user successfully registered.",
    code: "s-001",
  },
  USER_REGISTERATION_ERROR: {
    message: "failed to register a user",
    code: "L-001",
  },

  USER_LOGIN: {
    message: "user successfully logged In",
    code: "s-002",
  },

  USER_LOGIN_ERROR: {
    message: "login error",
    code: "L-002",
  },
  USER_FOUND: {
    message: "user found",
    code: "s-003",
  },
  USER_DETAILS_NOT_FOUND: {
    message: "user details not found",
    code: "L-010",
  },
  USER_DETAILS_FOUND: {
    message: "user details  found",
    code: "s-010",
  },
  USER_NOT_FOUND: {
    message: "user was not found.",
    code: "L-003",
  },
  ADD_EXPENSE: {
    message: "successfully added expense",
    code: "s-004",
  },
  ADD_EXPENSE_ERROR: {
    message: "error while adding   expense",
    code: "L-004",
  },
  GET_ALL_EXPENSE: {
    message: "expenses fetched successfully",
    code: "s-005",
  },
  GET_ALL_EXPENSE_ERROR: {
    message: "error fetching expense data",
    code: "L-005",
  },
  DELETE_EXPENSE: {
    message: "successfully deleted  expense",
    code: "s-006",
  },
  DELETE_EXPENSE_ERROR: {
    message: "error while deleting",
    code: "L-006",
  },
  UPDATE_EXPENSE: {
    message: "successfully updated expense",
    code: "s-007",
  },
  UPDATE_EXPENSE_ERROR: {
    message: "error while updating expense",
    code: "L-007",
  },
  INVALID_INPUT: {
    message: "The input provided is INVALID.",
    code: " V-008",
  },
  USER_ID_INVALID: {
    message: "user id INVALID",
    code: "V-009",
  },
  EXPENSE_FOUND: {
    message: "expense  found",
    code: "S-011",
  },
  EXPENSE_NOT_FOUND: {
    message: "expense not found",
    code: "L-011",
  },

  EXISTING_USER_ERROR: {
    message: "user already exists",
    code: "L-012",
  },
  INVALID_CREDS: {
    message: "INVALID credentials",
    code: "V-013",
  },
  SERVER_ERROR: {
    message: "server error",
    code: "L-014",
  },
  UPDATE_USER: {
    message: "user details updated",
    code: "s-012",
  },
  UPDATE_USER_ERROR: {
    message: "Could not update user details",
    code: "L-015",
  },
  LINK: {
    message: "Link sent successfully",
    code: "S-013",
  },
  TOKEN_ERROR: {
    message: "token not available",
    code: "L-017",
  },
  PASSWORD_RESET: {
    message: "Password reset successful",
    code: "s-014",
  },
  PASSWORD_RESET_ERROR: {
    message: "could not  reset password",
    code: "L-018",
  },
  NOT_AUTHORIZED: {
    message: "user not authorized",
    code: "L-019",
  },
  PASSWORD_REQUIRED: {
    message: "password is required",
    code: "V-020",
  },
  NO_FEILDS_TO_UPDATE: {
    message: "No feilds to update",
    code: "L-021",
  },
  INVALID_USER: {
    message: "INVALID user",
    code: "L-022",
  },
  INVALID_EXPENSE_ID: {
    message: "INVALID expense id",
    code: "L-023",
  },
  INVALID_EMAIL_INPUT: {
    message: "INVALID email",
    code: "V-024",
  },
  INVALID_DATE: {
    message: " date must be a valid date",
    code: "V-025",
  },
  INVALID_PASSWORD: {
    message: "password length must be at least 8 characters long  ",
    code: "V-026",
  },

  INVALID_USERNAME: {
    message: " username length must be at least 3 characters long ",
    code: "V-027",
  },
  INVALID_USERNAME_PATTERN: {
    message: "username fails to match the required pattern: /^S*$/ ",
    code: "V-035",
  },
  INVALID_EXPENSE_DETAILS: {
    message: "expense length must be at least 3 characters long",
    code: "V-028",
  },
  INVALID_AMOUNT: {
    message: "amount must be greater than or equal to 1",
    code: "V-028",
  },
  INVALID_BASECURRENCY: {
    message: "INVALID currency input:value should be between 1 and 3",
    code: "V-029",
  },
  EMPTY_EXPENSE: {
    message: "expense is not allowed to be empty",
    code: "V-030",
  },
  EMPTY_PASSWORD: {
    message: "password is not allowed to be empty",
    code: "V-031",
  },
  AMOUNT_BASE: {
    message: "amount must be a number",
    code: "V-032",
  },
  EXPENSE_PATTERN_BASE: {
    message: "INVALID characters in exprense string",
    code: "V-033",
  },
  INVALID_PASSWORD_PATTERN: {
    message:
      " password fails to match the required pattern: /^[a-zA-Z0-9]{3,30}$",
    code: "V-034",
  },
  EMPTY_EMAIL: {
    message: "email is not allowed to be empty",
    code: "V-036",
  },
  INVALID_BASECURRENCY_BASE: {
    message: "Currency id must be a number",
    code:"V-039"
  },
  Sequelize_query_SequelizeForeignKeyConstraintError:{
    message:"key constraint error ",
    code:"DB-001",
   
  },
  PASSWORD_STRING_BASE:{
    message:"password must be a string",
    code:"V-037",
  },
  EMPTY_USERNAME:{
    message:"username cannot be empty",
    code:"V-038"
  },
  PASSWORD_REQUIRED:{
    message:"password required",
    code:"V-039",
  },
  USERNAME_REQUIRED:{
    message:"username required",
    code:"V-40",
  },
  EMAIL_REQUIRED:{
    message:"email required",
    code:"V-041",
  },
  CURRENCY_REQUIRED:{
    message:"currency required",
    code:"V-042",
  },
  EXPENSE_DETAILS_REQUIRED:{
    message:"expense is required",
    code:"V-043"
  },
  DATE_REQUIRED:{
    message:"date is required",
    code:"V-044"
  },
  AMOUNT_REQUIRED:{
    message:"amount is required",
    code:"V-045"
  },
  CONFIRM_PASSWORD_ERROR:{
    message:"Passwords must match",
    code:"V-046"
  },
  CONFIRM_PASSWORD_REQUIRED:{
    message:" confirm password required",
    code:"V-047",
  },
  INVALID_TOKEN:{
    message:"INVALID token",
    code:"L-048"
  },
  SequelizeConnectionError:{
    message:" database connection error",
    code:"DB-002"
  },
  DATABASE_ERROR:{
    message:"database error",
    code:"DB-003"
  },
  INVALID_ADDUSERID:{
    message:"invalid user ids",
    code:"DB-004"
  },
  USERS_FOUND:{
    message:"users found successfully",
    code:"s-015"
  },
  USERS_NOT_FOUND:{
    message:"users not found",
    code:"DB-006"
  },
  EMAIL_UNIQUE:{
    message:"email must be unique",
    code:"DB-007"
  }
  
};

module.exports = Codes;
