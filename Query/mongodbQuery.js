const {
    Users: mongodbUser,
    Currencies: mongodbCurrencies, Expenses,
    Currencies,
    SplitExpenses,
} = require("../database/mongodb.model");


exports.MonFindOne = async (email) => {
    return mongodbUser.findOne({email, isActive: true});

};

exports.MonCreateUser = async (data) => {

    const currency = await mongodbCurrencies.find({
        currencyId: data.baseCurrency,
    });
    if (!currency) {
        return 'not a valid currency';
    }
    return await mongodbUser.create({
        username: data.username,
        email: data.email,
        password: data.hashedPassword,
        baseCurrency: data.baseCurrency,
        profileUrl: data.profileUrl,
        isActive: true,
    });
}
exports.MonFindById = async (userId) => {
    return mongodbUser.findOne({_id: userId, isActive: true},{
        password:0,isActive:0
    });

}
exports.MonUpdateUser = async (user, updateData) => {

    if (updateData.currencyId) {
        const currency = await mongodbCurrencies.find({
            currencyId: updateData.baseCurrency,
        });

        if (!currency) {
            return;
        }
        return mongodbUser.findByIdAndUpdate(
            {_id: user.userId, isActive: true},
            {
                $set: {baseCurrency: currency[0].currencyId},
            },
            {new: true}
        );
    }
    if (updateData.password) {
        return await mongodbUser.updateOne({email: user.email}, {
            password: updateData.password
        })
    }
    return await mongodbUser.updateOne({email: user.email}, updateData, {new: true})

}

exports.MonFindAllExpense = async (userId) => {

    const data = await Expenses.find({userId, isActive: true}).populate({
        path: "splitExpenses",
        match: {isActive: true}
    });

    return data
}

exports.MonCreateExpense = async (userId, data) => {

    
   
    const currency = await Currencies.find({
      currencyId: data.currencyId,
    });
  
    
    

    if (!currency || currency.length === 0) {
    
      throw new Error('Currency not found');
    }
  
 
    const newExpense = new Expenses({
      userId,
      date: data.date,
      amount: data.amount,
      expense: data.expense,
      currencyId: currency[0].currencyId,
    });
  

    return await newExpense.save();
  }

  exports.MonFindExpenseById = async (data) => {
    
    try {
      const expense = await Expenses.findOne({
        _id: data.expId,
        userId: data.userId,
        isActive: true,
      })
        .populate({
          path: "splitExpenses",
          match: { isActive: true },
        });
  
      if (expense) {
      
        return expense;
      } else {
        return [];
      }
    } catch (error) {
      console.error(error); // Log the error for debugging
      return [];
    }
  };
  


exports.MonUpdateExpense = async (expense, data = {}) => {

    const updatedExpense = await Expenses.findByIdAndUpdate(
        {_id: expense._id},
        data,
        {new: true}
    );
    return updatedExpense

}
exports.MonDeleteSplitExpenses = async (id, ids) => {
    
    await SplitExpenses.updateMany({ userId: { $in: ids } }, { isActive: false });
  };

exports.MonCreateSplitExpense = async (data) => {

    return new SplitExpenses({
        expId: data.expId,
        userId: data.userId,
        splitAmount: parseFloat(data.splitAmount.toFixed(2)),
        isActive: true,
    }).save();

}
exports.MonFindAllSplitExpense = async (data) => {
    return SplitExpenses.find({
        expId: data.expId,
        isActive: true,
    });
}
exports.MonFindAllExpense = async (userId) => {
    return await Expenses.find({userId, isActive: true}).populate({
        path: "splitExpenses",
        match: {isActive: true}
    })
}
exports.MonUpdateSplitExpenseAmount = async (expense, data) => {

  return await expense.updateOne({ splitAmount: parseFloat(data.splitAmount.toFixed(2)) });

}


exports.MonUpdateSplitExpense=async(expense,data)=>{
    await SplitExpenses.updateMany(
        { expId: expense._id },
        data
      );
}

exports.MoncheckUserExists=async(userIds)=>{
    const users = await mongodbUser.find({ _id: { $in: userIds } });
    return users.length === userIds.length;
}