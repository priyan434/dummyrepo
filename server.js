const { app, setDbConnectionStatus } = require("./app");
const sequelize = require("./database/db");
require("dotenv").config();
const mongoose = require("mongoose");
const { Currency } = require("./database/user.model");
const { Currencies } = require("./database/mongodb.model");
const PORT = process.env.PORT;
const Database = process.env.DATABASE;

if (Database==="mongodb") {
  mongoose
    .connect("mongodb://localhost:27017/apis", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {
      console.log("Connected to MongoDB");
      setDbConnectionStatus(true);

      // const dummyData = [
      //   { currencyId: 1, currencyName: 'US Dollar', currencyCode: 'USD' },
      //   { currencyId: 2, currencyName: 'Euro', currencyCode: 'EUR' },
      //   { currencyId: 3, currencyName: 'rupees', currencyCode: 'IND' },
        
      // ];
  
      // Currencies.insertMany(dummyData)
      //   .then((docs) => {
      //     console.log('Dummy data inserted:', docs);
      //     mongoose.connection.close();
      //   })
      //   .catch((error) => {
      //     console.error('Error inserting dummy data:', error);
      //     mongoose.connection.close();
      //   });
    
      app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error("Error connecting to MongoDB", err);
      setDbConnectionStatus(false);
      app.listen(PORT, () => {
        console.log(
          `Server is running on http://localhost:${PORT} but with database connection issues.`
        );
      });
    });

    
} else {
  sequelize
    .authenticate()
    .then(() => {
      console.log("DBConnection has been established successfully.");
      sequelize
      .sync()
      .then(() => {
    
      })
      .catch((error) => {
      
      });
      setDbConnectionStatus(true);
      app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
      });
    })
    .catch((error) => {
      setDbConnectionStatus(false);
      app.listen(PORT, () => {
        console.log(
          `Server is running on http://localhost:${PORT} but with database connection issues.`
        );
      });
    });
}
