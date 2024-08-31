const express = require("express");
require("dotenv").config();

const { auth } = require("../Middleware/auth");

const {
  register,
  login,
  fetchUserDetails,
  updateProfile,
  forgotpassword,
  resetPassword,
} = require("../Controllers/Mongo/authController");
const {
  getAllExpense,
  addExpense,
  updateExpense,
  deleteExpense,
  fetchExpenseById,
} = require("../Controllers/Mongo/expenseController");

const mongodbRouters = express.Router();
const multer = require("multer");
const path = require("path");

const storage = multer.memoryStorage();
const upload = multer({ storage });
const version = "v1";

mongodbRouters.post(`/${version}/users`, upload.single("profileUrl"), register);
mongodbRouters.post(`/${version}/users/login`, login);
mongodbRouters.get(`/${version}/users/:id`, fetchUserDetails);
mongodbRouters.put(`/${version}/users/profile`, auth, updateProfile);
mongodbRouters.post(`/${version}/expenses`, auth, addExpense);
mongodbRouters.put(`/${version}/expenses/:id`, auth, updateExpense);
mongodbRouters.get(`/${version}/expenses`, auth, getAllExpense);
mongodbRouters.delete(`/${version}/expenses/:id`, auth, deleteExpense);
mongodbRouters.get(`/${version}/expenses/:id`, auth, fetchExpenseById);
mongodbRouters.post(`/${version}/users/forgot-password`, forgotpassword);
mongodbRouters.post(`/${version}/users/reset-password`, resetPassword);

module.exports = mongodbRouters;
