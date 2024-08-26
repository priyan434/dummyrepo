const { DataTypes } = require("sequelize");
const sequelize = require("./db");
const Currency = sequelize.define("Currency", {
  currencyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true
  },
  currencyName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  currencyCode: {
    type: DataTypes.STRING,
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});


const Users = sequelize.define("User", {
  userId: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  baseCurrency: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Currencies',
      key: 'currencyId'
    }
  },
  profileUrl: {
    type: DataTypes.BLOB
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});


// const Expenses = sequelize.define("Expense", {
//   expId: {
//     type: DataTypes.INTEGER,
//     autoIncrement: true,
//     // primaryKey: true
//   },
//   userId: {
//     type: DataTypes.INTEGER,
//     allowNull: false,
//     references: {
//       model: "Users",
//       key: 'userId'
//     }
//   },
//   date: {
//     type: DataTypes.DATE,
//   },
//   expense: {
//     type: DataTypes.STRING,
//   },
//   currencyId: {
//     type: DataTypes.INTEGER,
//     allowNull: false,
//     references: {
//       model: 'Currencies',
//       key: 'currencyId'
//     }
//   },
//   amount: {
//     type: DataTypes.INTEGER
//   },
//   myShare:{
//     type:DataTypes.INTEGER,
//     defaultValue: 0
//   },
//   isActive: {
//     type: DataTypes.BOOLEAN,
//     defaultValue: true
//   },
  
 

// });

const Expenses = sequelize.define("Expense", {
  expId: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,  
  },
  userId: {
    type: DataTypes.INTEGER,
    primaryKey: true, 
    allowNull: false,
    references: {
      model: "Users",
      key: 'userId'
    }
  },
  date: {
    type: DataTypes.DATE,
  },
  expense: {
    type: DataTypes.STRING,
  },
  currencyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Currencies',
      key: 'currencyId'
    }
  },
  amount: {
    type: DataTypes.INTEGER
  },
  myShare: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  paid:{
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  paidBy:{
    type:DataTypes.INTEGER,
    defaultValue:0
  },
  moneyLent:{
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['expId', 'userId']  
    }
  ]
});

const SplitExpense = sequelize.define('SplitExpense', {
  splitId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  expId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Expenses',
      key: 'expId'
    }
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'userId'
    }
  },
  splitAmount: {
    type: DataTypes.FLOAT,
    allowNull: false,
    scale:2
  },
  isActive:{
    type:DataTypes.BOOLEAN,
    defaultValue:true
  }
}, {
  tableName: 'SplitExpenses'
});


Users.hasMany(Expenses, {
  foreignKey: 'userId',
  as: 'expenses'
});

Expenses.belongsTo(Users, {
  foreignKey: 'userId',
  as: 'user'
});

Currency.hasMany(Users, {
  foreignKey: 'baseCurrency',
  as: 'users'
});

Users.belongsTo(Currency, {
  foreignKey: 'baseCurrency',
  as: 'currency'
});

Currency.hasMany(Expenses, {
  foreignKey: 'currencyId',
  as: 'expenses'
});

Expenses.belongsTo(Currency, {
  foreignKey: 'currencyId',
  as: 'currency'
});

Expenses.hasMany(SplitExpense, {
  foreignKey: 'expId',
  as: 'splitExpenses'
});

SplitExpense.belongsTo(Expenses, {
  foreignKey: 'expId',
  as: 'expense'
});


sequelize
      .sync()
      .then(() => {
        
      })
      .catch((error) => {
        // console.error("Error creating database & tables:", error);

      });

// 1.first insert currency records in currency table  
// 2.insert users records in user table  
// 3.insert expense records after inserting  records in currency and users table 


const insertDummyData = async () => {
  try {
    
    const count = await Currency.count();
    if (count === 0) {
      
      await Currency.bulkCreate([
        { currencyId: 1, currencyName: 'US Dollar', currencyCode: 'USD' },
        { currencyId: 2, currencyName: 'Indian rupees', currencyCode: 'IND' },
        { currencyId: 3, currencyName: 'British Pound', currencyCode: 'GBP' }
      ]);
     
    } 
  } catch (error) {
    console.error('Error inserting dummy data into Currency table:', error);
  }
};
insertDummyData()




module.exports = { Users, Currency, Expenses, sequelize,SplitExpense }