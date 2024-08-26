const Sequelize = require("sequelize");
require('dotenv').config()


// const sequelize = new Sequelize(
//  process.env.MYSQL_ADDON_DB,
//  process.env.MYSQL_ADDON_USER,
//  process.env.MYSQL_ADDON_PASSWORD,
//   {
//     host: process.env.MYSQL_ADDON_HOST,
//     port: process.env.MYSQL_ADDON_PORT,
//     dialect: process.env.DATABASE_DIALECT
//   },
 
// );

const sequelize = new Sequelize(
  process.env.DATABASE_NAME,
  process.env.DATABASE_USER,
  process.env.DATABASE_PASSWORD,
   {
     host: process.env.DATABASE_HOST,
     port: process.env.MYSQL_ADDON_PORT,
     dialect: process.env.DATABASE_DIALECT
   },
  
 );
 
module.exports=sequelize