const {
    Users: mongodbUser,
    Currencies: mongodbCurrencies,
} = require("../database/mongodb.model");
const {Users, Expenses, SplitExpense} = require("../database/user.model");
const {
    MonFindOne,
    MonCreateUser,
    MonFindById,
    MonUpdateUser,
    MonFindAllExpense,
    MonCreateExpense, MonFindExpenseById, MonUpdateExpense, MonDeleteSplitExpenses, MonCreateSplitExpense,
    MonFindAllSplitExpense, MonUpdateSplitExpense,
    MoncheckUserExists,
    MonUpdateSplitExpenseAmount
} = require("./mongodbQuery");
const {
    SeqFindOne,
    SeqCreateUser,
    SeqFindById,
    SeqUpdateUser,
    SeqFindAllExpense,
    SeqCreateExpense, SeqCreateSplitExpense, SeqFindExpenseById, SeqUpdateExpense, SeqFindAllSplitExpense,
    SeqUpdateSplitExpense, SeqDeleteSplitExpense,
    SeqCheckUserExists,
    SeqUpdateSplitExpenseAmount,
    SeqFindAllUsers,
    SeqFindAllExpensesById,
    SeqDeactivateExpenses,
    SeqDeactivatedExpenses,
    SeqFindSplitExpenseById,
    SeqFindUserByEmail
} = require("./sequelizeQuery");
const {Op} = require("sequelize");

require("dotenv").config();

exports.findOne = async (email) => {

    if (process.env.DATABASE === "mongodb") {
        return await MonFindOne(email)

    } else {
        return await SeqFindOne(email);
    }
};

exports.createUser = async (user) => {

    if (process.env.DATABASE === "mongodb") {
        return await MonCreateUser(user);

    } else {
        return await SeqCreateUser(user);
    }
};


exports.findById = async (userId) => {
    if (process.env.DATABASE === "mongodb") {
        return await MonFindById(userId)
    } else {

        return await SeqFindById(userId)
    }
};


exports.updateUser = async (user, updateData) => {
    if (process.env.DATABASE === "mongodb") {
        return await MonUpdateUser(user, updateData)
    } else {
        return await SeqUpdateUser(user, updateData)
    }
};


exports.findExpenses = async (userId) => {
    if (process.env.DATABASE === "mongodb") {
        
        return await MonFindAllExpense(userId)
    } else {
        return await SeqFindAllExpense(userId)
    }

}

exports.createExpense = async (userId, data) => {
    if (process.env.DATABASE === "mongodb") {
        return await MonCreateExpense(userId, data)
    } else {
        return await SeqCreateExpense(userId, data)

    }
}


exports.checkUsersExist = async (userIds) => {
    if (process.env.DATABASE === "mongodb") {
      return MoncheckUserExists(userIds)
     
    } else {
      return SeqCheckUserExists(userIds)
    }
  };

exports.createSplitexpense = async (data) => {
    if (process.env.DATABASE === "mongodb") {
        return await MonCreateSplitExpense(data);
    } else {

        return await SeqCreateSplitExpense(data)

    }
}
exports.findExpenseById = async (data) => {
    if (process.env.DATABASE === "mongodb") {
        return await MonFindExpenseById(data)
    } else {
        return await SeqFindExpenseById(data)

    }
}

exports.updateExpense = async (expense, data) => {
    if (process.env.DATABASE === "mongodb") {
        return await MonUpdateExpense(expense, data)
    } else {
        return await SeqUpdateExpense(expense, data)

    }
}
exports.updateSplitExpense = async (expense, data) => {
    if (process.env.DATABASE === "mongodb") {
        return await MonUpdateSplitExpense(expense, data)
    } else {
        return await SeqUpdateSplitExpense(expense, data)

    }
}
exports.updateSplitExpenseAmount=async(expense,data)=>{
    if (process.env.DATABASE === "mongodb") {
        return await MonUpdateSplitExpenseAmount(expense, data)
    } else {
        return await SeqUpdateSplitExpenseAmount(expense, data)

    }
    
}
exports.deleteSplitExpense = async ( id='',removeuserIds = []) => {

    if (process.env.DATABASE === "mongodb") {
        return await MonDeleteSplitExpenses(id,removeuserIds)
    } else {
        return await SeqDeleteSplitExpense(id, removeuserIds)

    }

}

exports.findAllSplitExpense = async (data) => {
    if (process.env.DATABASE === "mongodb") {
        return await MonFindAllSplitExpense(data)
    } else {
        return await SeqFindAllSplitExpense(data)

    }
}

exports.updateSplit = async (data) => {
    if (process.env.DATABASE === "mongodb") {

    } else {
        return await SeqUpdateExpense(data)

    }
}
exports.deleteSplit = async (id, removeUserIds) => {

    if (process.env.DATABASE === "mongodb") {

    } else {
        return await SeqDeleteSplitExpense(id, removeUserIds)

    }

}

exports.findallUsers=async(userId)=>{
    if (process.env.DATABASE === "mongodb") {

    } else {
        return await SeqFindAllUsers(userId)

    }
}
exports.findallExpenses=async(id)=>{
    if (process.env.DATABASE === "mongodb") {

    } else {
        return await SeqFindAllExpensesById(id)

    }
}

exports.deactivatedExpenses=async(id)=>{
    if (process.env.DATABASE === "mongodb") {

    } else {
        return await SeqDeactivatedExpenses(id)

    }
}
exports.findsplitexpensebyid=async(data)=>{
    if (process.env.DATABASE === "mongodb") {

    } else {
        return await SeqFindSplitExpenseById(data)

    }
}

exports.findUserByEmail=async(email)=>{
    if (process.env.DATABASE === "mongodb") {

    } else {
        return await SeqFindUserByEmail(email)

    }
}

