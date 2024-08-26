const express=require("express")
require('dotenv').config()

const {auth}=require('../Middleware/auth');

const { addExpense, updateExpense, getAllExpense, deleteExpense, fetchExpenseById,   } = require("../Controllers/expenseController");
const { register, login, fetchUserDetails, updateProfile, forgotpassword, resetPassword, getallUsers } = require("../Controllers/authController");

const routers=express.Router()
const multer = require('multer');
const path = require('path');


const storage = multer.memoryStorage();
const upload = multer({ storage });
const version='v1'

routers.post(`/${version}/users`,upload.single('profileUrl'), register)
routers.post(`/${version}/users/login`,login)
routers.get(`/${version}/users/:id`,fetchUserDetails)

routers.get(`/${version}/users/all-users/users`,auth,getallUsers)



routers.put(`/${version}/users/profile`,auth,updateProfile)
routers.post(`/${version}/expenses`,auth,addExpense)
routers.put(`/${version}/expenses/:id`,auth,updateExpense)
routers.get(`/${version}/expenses`,auth,getAllExpense)
routers.delete(`/${version}/expenses/:id`,auth,deleteExpense)
routers.get(`/${version}/expenses/:id`,auth,fetchExpenseById)
routers.post(`/${version}/users/forgot-password`,forgotpassword)
routers.post(`/${version}/users/reset-password`,resetPassword)



module.exports=routers