const Sequelize = require("sequelize");
require('dotenv').config()


const sequelize = new Sequelize(
 process.env.MYSQL_ADDON_DB,
 process.env.MYSQL_ADDON_USER,
 process.env.MYSQL_ADDON_PASSWORD,
  {
    host: process.env.MYSQL_ADDON_HOST,
    port: process.env.MYSQL_ADDON_PORT,
    dialect: process.env.DATABASE_DIALECT
  },
 
);


 
module.exports=sequelize