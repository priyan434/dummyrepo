const { Users, Expenses, SplitExpense } = require("../database/user.model");
const { Op, Sequelize } = require("sequelize");

exports.SeqFindOne = async (email) => {
  try {
    const user = await Users.findOne({ where: { email, isActive: 1 } });

    if (!user) {
      console.warn(`No user found with email: ${email}`);
    }

    return user;
  } catch (error) {
    console.error("error   while finding user by email:", error);
    throw new Error("database query failed.");
    
    
  }
};

exports.SeqCreateUser = async (data) => {
  try {
    return await Users.create({
      username: data.username,
      email: data.email,
      password: data.hashedPassword,
      baseCurrency: data.baseCurrency,
      profileUrl: data.profileUrl,
      isActive: true,
    });
  } catch (error) {
    console.error("Error in SeqCreateUser:", error);
    throw error;
  }
};

exports.SeqFindById = async (userId) => {
  try {
    return await Users.findOne({
      where: { userId: userId, isActive: true },
      // attributes: { exclude: ["password"] },
    });
  } catch (error) {
    console.error("Error in SeqFindById:", error);
    throw error;
  }
};

exports.SeqUpdateUser = async (user, updateData) => {
  try {
    return await user.update(updateData);
  } catch (error) {
    console.error("Error in SeqUpdateUser:", error);
    throw error;
  }
};

exports.SeqFindAllExpense = async (userId) => {
  try {
    return await Expenses.findAll({
      where: { userId: userId, isActive: true },
      attributes: {
        exclude: ["isActive"],
      },
      include: [
        {
          model: SplitExpense,
          as: "splitExpenses",
          where: { isActive: true, userId: { [Op.ne]: userId } },
          required: false,
          attributes: ["userId", "splitAmount"],
        },
      ],
    });
  } catch (error) {
    throw error;
  }

};

exports.SeqCreateExpense = async (userId, data) => {
  try {
    return await Expenses.create({
      expId: data.expId,
      userId: userId,
      date: data.date,
      amount: data.amount,
      expense: data.expense,
      currencyId: data.currencyId,
      myShare: data.myShare,
      paid: data.paid,
      paidBy:data.paidBy,
      moneyLent: data.moneyLent,
    });
  } catch (error) {
    throw error;
  }

};

exports.SeqCreateSplitExpense = async (data) => {
  try {
    return SplitExpense.create({
      expId: data.expId,
      userId: data.userId,
      splitAmount: data.splitAmount,
      isActive: true,
    });
  } catch (error) {
    throw error
  }
  
};

exports.SeqCheckUserExists = async (userIds) => {
  try {
    const users = await Users.findAll({
      where: {
        userId: {
          [Sequelize.Op.in]: userIds,
        },
      },
    });
    return users.length === userIds.length;
  } catch (error) {
    throw error;
  }
  
};

exports.SeqFindExpenseById = async (data) => {
  // return await Expenses.findOne({
  //     where: {
  //         expId: data.expId,
  //         userId: data.userId,
  //         isActive: true,
  //     },
  // });
  try {
    return await Expenses.findOne({
      where: { expId: data.expId, userId: data.userId, isActive: data.isActive },
      include: [
        {
          model: SplitExpense,
          as: "splitExpenses",
          where: { isActive: true, userId: { [Op.ne]: data.userId } },
          required: false,
          attributes: ["userId", "splitAmount"],
        },
      ],
    });
  } catch (error) {
    throw error
  }

};
exports.SeqUpdateExpense = async (expense, data) => {
  
  try {
    return await expense.update(data);
  } catch (error) {
    throw error
  }
 
};
exports.SeqUpdateSplitExpense = async (splitExpense, data) => {
  try {
    return splitExpense.update(data);
  } catch (error) {
    throw error
  }
  
};

exports.SeqFindAllSplitExpense = async (data) => {
  try {
    return await SplitExpense.findAll({
      where: {
        expId: data.expId,
        isActive: true,
      },
    });
  } catch (error) {
    throw error
  }
  
};


exports.SeqDeleteSplitExpense = async (id, removeUserIds) => {


  try {
    await SplitExpense.update(
      { isActive: false },
      {
        where: {
          expId: id,
          userId: {
            [Op.in]: removeUserIds,
          },
        },
      }
    );
  } catch (error) {
    throw error
  }

  
};
exports.SeqUpdateSplitExpenseAmount = async (splitExpense, data) => {
  try {
    return await splitExpense.update({
      splitAmount: parseFloat(data.splitAmount.toFixed(2)),
    });
  } catch (error) {
    throw error
  }
  
};

exports.SeqFindAllUsers = async (userId) => {
  try {
    return await Users.findAll({
      where: {
        isActive: true,
        userId: {
          [Op.ne]: userId,
        },
      },
      attributes: ["userId", "username"],
    });
  } catch (error) {
    console.log(error);
    throw error
  }
};

exports.SeqFindAllExpensesById = async (id) => {
  try {
    return await Expenses.findAll({
      where: {
        expId: id,
        isActive: true,
      },
    });
  } catch (error) {
    console.log(error);
    throw error
  }
};

exports.SeqDeactivatedExpenses=async(id)=>{
  try {
    return await Expenses.findAll({
      where: {
        expId: id,
        isActive: false,
      },
    });
  } catch (error) {
    console.log(error);
    throw error
  }
}
exports.SeqFindSplitExpenseById=async(data)=>{
  
  
  try {
    return await SplitExpense.findOne({
      where: {
        expId: data.id,
        userId:data.userId,
        isActive: true,
      },
    });
  } catch (error) {
    console.log(error);
    throw error
  }
}