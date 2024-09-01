const Joi = require("joi");
const { Expenses, SplitExpense } = require("../database/user.model");
const {
  GET_ALL_EXPENSE,
  INVALID_INPUT,
  ADD_EXPENSE,
  ADD_EXPENSE_ERROR,
  UPDATE_EXPENSE,
  UPDATE_EXPENSE_ERROR,
  DELETE_EXPENSE,
  DELETE_EXPENSE_ERROR,
  EXPENSE_NOT_FOUND,
  EXPENSE_FOUND,
  SERVER_ERROR,
  INVALID_USER,
  INVALID_EXPENSE_ID,
  NO_FEILDS_TO_UPDATE,
  INVALID_EXPENSE_DETAILS,
  INVALID_AMOUNT,
  INVALID_BASECURRENCY,
  EMPTY_EXPENSE,
  AMOUNT_BASE,
  EXPENSE_PATTERN_BASE,
  INVALID_DATE,
  INVALID_BASECURRENCY_BASE,
  Sequelize_query_SequelizeForeignKeyConstraintError,
  DATE_REQUIRED,
  CURRENCY_REQUIRED,
  AMOUNT_REQUIRED,
  EXPENSE_DETAILS_REQUIRED,
  USER_NOT_FOUND,
  DATABASE_ERROR,
  INVALID_ADDUSERID,
} = require("../Codes");
const { Op } = require("sequelize");
const {
  findExpenses,
  createExpense,
  createSplitexpense,
  findExpenseById,
  updateExpense,
  findAllSplitExpense,

  updateSplitExpense,
  deleteSplitExpense,
  checkUsersExist,
  updateSplitExpenseAmount,
  findOne,
  findById,
  findallExpenses,
  deactivatedExpenses,
  findsplitexpensebyid,
} = require("../Query/Queries");
const { default: mongoose } = require("mongoose");

exports.getAllExpense = async (req, res) => {
  const userId = req.user;
  if (process.env.DATABASE === "mongodb") {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(404).json({
        message: INVALID_EXPENSE_ID.message,
        success: false,
        code: INVALID_EXPENSE_ID.code,
      });
    }
  }
  try {
    if (!userId) {
      return res.status(400).send({
        message: INVALID_USER.message,
        success: false,
        code: INVALID_USER.code,
      });
    }
    const user = await findById(userId);
    if (!user) {
      return res.status(400).send({
        message: USER_NOT_FOUND.message,
        success: false,
        code: USER_NOT_FOUND.code,
      });
    }

    const expenses = await findExpenses(userId);
    const totalExpense = await Expenses.sum("myShare", {
      where: {
        userId: userId,
        isActive: true,
      },
    });
    return res.status(200).json({
      message: GET_ALL_EXPENSE.message,
      success: true,
      code: GET_ALL_EXPENSE.code,
      data: {
        expenses,
        totalExpense,
      },
    });
  } catch (err) {
    console.log("Error fetching expenses:", err);
    return res.status(500).send({
      message: SERVER_ERROR.message,
      success: false,
      code: SERVER_ERROR.code,
    });
  }
};

exports.addExpense = async (req, res) => {
  const userId = req.user;
  let SplitAmount;

  const addExpenseSchema = Joi.object({
    date: Joi.date().iso().required(),
    expense: Joi.string().min(3).required(),
    currencyId: Joi.number().min(1).max(3).required(),
    amount: Joi.number().min(1).required(),
    userIds: Joi.array().items().optional(),
  });

  let expId;
  try {
    const { date, amount, expense, currencyId, userIds = [] } = req.body;

    const { error } = addExpenseSchema.validate(req.body);
    if (error) {
      const errorDetails = error.details[0];
      const errorMap = {
        date: {
          "any.required": DATE_REQUIRED,
          "date.format": INVALID_DATE,
        },
        amount: {
          "number.min": INVALID_AMOUNT,
          "number.base": AMOUNT_BASE,
          "any.required": AMOUNT_REQUIRED,
        },
        expense: {
          "string.min": INVALID_EXPENSE_DETAILS,
          "string.pattern.base": EXPENSE_PATTERN_BASE,
          "string.empty": EMPTY_EXPENSE,
          "any.required": EXPENSE_DETAILS_REQUIRED,
        },
        currencyId: {
          "number.base": INVALID_BASECURRENCY_BASE,
          "number.min": INVALID_BASECURRENCY,
          "number.max": INVALID_BASECURRENCY,
          "any.required": CURRENCY_REQUIRED,
        },
      };

      const errorResponse =
        errorMap[errorDetails.path[0]]?.[errorDetails.type] || INVALID_INPUT;
      return res.status(400).send({
        message: errorResponse.message,
        success: false,
        code: errorResponse.code,
      });
    }

    if (!userId) {
      return res.status(400).send({
        message: INVALID_USER.message,
        success: false,
        code: INVALID_USER.code,
      });
    }

    if (userIds.length > 0) {
      const usersExist = await checkUsersExist(userIds);
      if (!usersExist) {
        return res.status(400).send({
          message: INVALID_ADDUSERID.message,
          success: false,
          code: INVALID_ADDUSERID.code,
        });
      }
    }

    const newExpense = await createExpense(userId, {
      date,
      amount,
      expense,
      currencyId,
      paid: true,
      paidBy: userId,
    });
    let paidUserId = userId;
    if (!newExpense) {
      return res.status(400).send({
        message: ADD_EXPENSE_ERROR.message,
        success: false,
        code: ADD_EXPENSE_ERROR.code,
      });
    }
    let splitAmount;
    let numberOfSplits;

    if (userIds.length > 0) {
      const Ids = userIds.filter((id) => id !== userId);
      expId =
        process.env.DATABASE === "mongodb"
          ? newExpense._id.toString()
          : newExpense.expId;

      numberOfSplits = Ids.length + 1;
      splitAmount = newExpense.amount / numberOfSplits;

      const borrowedexpense = Ids.map((id) => {
        return createExpense(id, {
          expId: newExpense.expId,
          date: newExpense.date,
          amount: newExpense.amount,
          expense: newExpense.expense,
          currencyId: newExpense,
          currencyId,
          myShare: splitAmount,
          paid: false,
          paidBy: paidUserId,
        });
      });

      const splitPromises = Ids.map((splitUserId) => {
        return createSplitexpense({
          expId,
          userId: splitUserId,
          splitAmount,
          isActive: true,
        });
      });

      splitPromises.push(
        createSplitexpense({
          expId,
          userId,
          splitAmount,
          isActive: true,
        })
      );

      try {
        await Promise.all(splitPromises);
        await Promise.all(borrowedexpense);
      } catch (error) {
        console.log(error);
        if (error.name === "SequelizeForeignKeyConstraintError") {
          return res.status(400).send({
            message: Sequelize_query_SequelizeForeignKeyConstraintError.message,
            success: false,
            code: Sequelize_query_SequelizeForeignKeyConstraintError.code,
          });
        }
        return res.status(500).send({
          message: SERVER_ERROR.message,
          success: false,
          code: SERVER_ERROR.code,
        });
      }
    }
    await updateExpense(newExpense, {
      myShare: splitAmount ? splitAmount : amount,
      moneyLent: (numberOfSplits - 1) * splitAmount,
    });

    const allExpenses = await findExpenses(userId);
    const totalExpense = await Expenses.sum("myShare", {
      where: {
        userId: userId,
        isActive: true,
      },
    });

    return res.status(201).json({
      message: ADD_EXPENSE.message,
      success: true,
      code: ADD_EXPENSE.code,
      data: {
        expenses: allExpenses,
        totalExpense,
      },
    });
  } catch (error) {
    console.log(error);

    if (error.name === "CastError") {
      return res.status(400).send({
        message: INVALID_USER.message,
        success: false,
        code: INVALID_USER.code,
      });
    }
    if (error.name === "SequelizeForeignKeyConstraintError") {
      return res.status(400).send({
        message: Sequelize_query_SequelizeForeignKeyConstraintError.message,
        success: false,
        code: Sequelize_query_SequelizeForeignKeyConstraintError.code,
      });
    }
    return res.status(500).send({
      message: SERVER_ERROR.message,
      success: false,
      code: SERVER_ERROR.code,
    });
  }
};

// ****************************************************************************

exports.updateExpense = async (req, res) => {
  const id = req.params.id;
  const fieldsToUpdate = req.body;
  const userId = req.user;

  const updateExpenseSchema = Joi.object({
    date: Joi.date().iso().optional(),
    expense: Joi.string().min(3).optional(),
    currencyId: Joi.number().min(1).max(3).optional(),
    amount: Joi.number().min(1).optional(),
    removeUserIds: Joi.array().items().optional(),
    addUserIds: Joi.array().items().optional(),
    userIds: Joi.array().items().optional(),

  });

  if (process.env.DATABASE === "mongodb") {
    if (!userId || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        message: INVALID_EXPENSE_ID.message,
        success: false,
        code: INVALID_EXPENSE_ID.code,
      });
    }
  }

  if (!userId) {
    return res.status(400).send({
      message: INVALID_USER.message,
      success: false,
      code: INVALID_USER.code,
    });
  }

  if (!id) {
    return res.status(400).send({
      message: INVALID_EXPENSE_ID.message,
      success: false,
      code: INVALID_EXPENSE_ID.code,
    });
  }

  if (Object.keys(fieldsToUpdate).length === 0) {
    return res.status(400).send({
      message: NO_FEILDS_TO_UPDATE.message,
      success: false,
      code: NO_FEILDS_TO_UPDATE.code,
    });
  }

  try {
    const { error, value } = updateExpenseSchema.validate(fieldsToUpdate);
    if (error) {
      const errorDetails = error.details[0];
      const errorMap = {
        date: {
          "date.format": INVALID_DATE,
        },
        amount: {
          "number.min": INVALID_AMOUNT,
          "number.base": AMOUNT_BASE,
        },
        expense: {
          "string.min": INVALID_EXPENSE_DETAILS,
          "string.pattern.base": EXPENSE_PATTERN_BASE,
          "string.empty": EMPTY_EXPENSE,
        },
        currencyId: {
          "number.base": INVALID_BASECURRENCY_BASE,
          "number.min": INVALID_BASECURRENCY,
          "number.max": INVALID_BASECURRENCY,
        },
      };

      const errorResponse =
        errorMap[errorDetails.path[0]]?.[errorDetails.type] || INVALID_INPUT;
      return res.status(400).send({
        message: errorResponse.message,
        success: false,
        code: errorResponse.code,
      });
    }

    if (fieldsToUpdate.addUserIds) {
      if (fieldsToUpdate.addUserIds.length > 0) {
        const usersExist = await checkUsersExist(fieldsToUpdate.addUserIds);
        if (!usersExist) {
          return res.status(400).send({
            message: "Invalid user IDs",
            success: false,
            code: "L-0015",
          });
        }
      }
    }

    const expenses = await findExpenseById({
      userId,
      expId: id,
      isActive: true,
    });

    if (!expenses) {
      return res.status(400).send({
        message: EXPENSE_NOT_FOUND.message,
        success: false,
        code: EXPENSE_NOT_FOUND.code,
      });
    }

    if (expenses.paidBy != userId) {
      return res.send({
        message: "Not authorized",
        success:false,
        code:"L-005"
      });
    }

    const {
      amount: updatedAmount,
      date,
      expense,
      currencyId,
      removeUserIds = [],
      addUserIds = [],
      userIds=[]
    } = fieldsToUpdate;

    let updatedAmountValue = updatedAmount ? updatedAmount : expenses.amount;
    let updatedDate = date ? date : expenses.date;
    let updatedExpense = expense ? expense : expenses.expense;
    let updatedCurrencyId = currencyId ? currencyId : expenses.currencyId;

    const allExpense = await findallExpenses(id);

    await Promise.all(
      allExpense.map((exp) => updateExpense(exp, fieldsToUpdate))
    );
    const existingUserIds =
    process.env.DATABASE === "mongodb"
      ? allExpense.map((exp) => exp.userId.toString())
      : allExpense.map((exp) => exp.userId);


    const userIdsToRemove = existingUserIds.filter(
      (existingUserId) =>
        !userIds.includes(existingUserId) && existingUserId !== userId
    );
    
    const newRemoveUserIds = userIdsToRemove
    
    

    if (newRemoveUserIds.length > 0) {
      await deleteSplitExpense(id, newRemoveUserIds);
      const allExpense = await findallExpenses(id);
      const expensesToUpdate = allExpense.filter((exp) =>
        newRemoveUserIds.includes(exp.userId)
      );

      await Promise.all(
        expensesToUpdate.map((exp) => updateExpense(exp, { isActive: false }))
      );
    }

    let splitAmount;
    if (userIds.length > 0) {
      const allExpense = await deactivatedExpenses(id);
    
      const expensesToReactivate = allExpense.filter((exp) =>
        userIds.includes(exp.userId)
      );
   
      

      if (expensesToReactivate.length > 0) {
        await Promise.all(
          expensesToReactivate.map((exp) =>
            updateExpense(exp, { isActive: true })
          )
        );
      }

      const activeSplitExpenses = await findAllSplitExpense({
        expId: id,
        isActive: true,
      });

      const existingUserIds =
        process.env.DATABASE === "mongodb"
          ? activeSplitExpenses.map((split) => split.userId.toString())
          : activeSplitExpenses.map((split) => split.userId);

      const newUserIds = userIds.filter(
        (userId) => !existingUserIds.includes(userId)
      );
      console.log(newUserIds);
      

      if (activeSplitExpenses.length === 0 && newUserIds.length > 0) {
        const newNumberOfSplits = newUserIds.length + 1;
        splitAmount = updatedAmountValue / newNumberOfSplits;

        const borrowedExpenses = newUserIds.map((id) => {
          return createExpense(id, {
            expId: expenses.expId,
            date: updatedDate,
            amount: updatedAmountValue,
            expense: updatedExpense,
            currencyId: updatedCurrencyId,
            myShare: splitAmount,
            paid: false,
            paidBy: expenses.paidBy,
          });
        });

        await updateExpense(expenses, {
          moneyLent: splitAmount * (newNumberOfSplits - 1),
        });

        await Promise.all(
          activeSplitExpenses.map((split) =>
            updateSplitExpenseAmount(split, { splitAmount: splitAmount })
          )
        );

        await Promise.all(
          newUserIds.map((userId) =>
            createSplitexpense({
              expId: id,
              userId: userId,
              splitAmount: splitAmount,
              isActive: true,
            })
          )
        );

        await createSplitexpense({
          expId: id,
          userId: userId,
          splitAmount: splitAmount,
          isActive: true,
        });

        await updateExpense(expenses, {
          moneyLent: updatedAmountValue - splitAmount,
        });

        const allExpense2 = await findallExpenses(id);

        await Promise.all(
          allExpense2.map((exp) =>
            updateExpense(exp, {
              myShare: splitAmount,
            })
          )
        );
      } else if (activeSplitExpenses.length > 0) {
        const newNumberOfSplits =
          activeSplitExpenses.length + newUserIds.length;
        splitAmount = updatedAmountValue / newNumberOfSplits;
        await Promise.all(
          activeSplitExpenses.map((split) =>
            updateSplitExpenseAmount(split, { splitAmount: splitAmount })
          )
        );

        await Promise.all(
          newUserIds.map((userId) =>
            createSplitexpense({
              expId: id,
              userId: userId,
              splitAmount: splitAmount,
              isActive: true,
            })
          )
        );

        const allExpense2 = await findallExpenses(id);

        await Promise.all(
          allExpense2.map((exp) =>
            updateExpense(exp, {
              myShare: splitAmount,
            })
          )
        );

        await updateExpense(expenses, {
          moneyLent: updatedAmountValue - splitAmount,
        });
      }
    }


    const activeSplitExpenses = await findAllSplitExpense({
      expId: id,
      isActive: true,
    });

    if (activeSplitExpenses.length > 0) {
      const newNumberOfSplits = activeSplitExpenses.length;
      splitAmount = updatedAmountValue / newNumberOfSplits;
      await Promise.all(
        activeSplitExpenses.map((split) =>
          updateSplitExpenseAmount(split, { splitAmount: splitAmount })
        )
      );
    } else {

      splitAmount = updatedAmountValue;
    }

    const data = {
      userId,
      id,
    };

    const splitexpense = await findsplitexpensebyid(data);

    const exp = await updateExpense(expenses, {
      myShare: splitexpense ? splitexpense.splitAmount : updatedAmountValue,
      moneyLent: updatedAmountValue - (splitexpense ? splitexpense.splitAmount : updatedAmountValue),
    });

    
    const updatedExpenseWithSplits = await findExpenseById({
      userId,
      expId: id,
      isActive: true,
    });

    return res.status(200).json({
      message: UPDATE_EXPENSE.message,
      success: true,
      code: UPDATE_EXPENSE.code,
      data: {
        expenses: updatedExpenseWithSplits,
      },
    });
  } catch (error) {
    console.log(error);

    if (error.name === "CastError") {
      return res.status(400).send({
        message: INVALID_USER.message,
        success: false,
        code: INVALID_USER.code,
      });
    }
    if (error.name === "SequelizeForeignKeyConstraintError") {
      return res.status(400).send({
        message: Sequelize_query_SequelizeForeignKeyConstraintError.message,
        success: false,
        code: Sequelize_query_SequelizeForeignKeyConstraintError.code,
      });
    }
    return res.status(500).send({
      message: SERVER_ERROR.message,
      success: false,
      code: SERVER_ERROR.code,
    });
  }
};

// *********************************************************
// exports.updateExpense = async (req, res) => {
//   const id = req.params.id;
//   const fieldsToUpdate = req.body;
//   const userId = req.user;

//   const updateExpenseSchema = Joi.object({
//     date: Joi.date().iso().optional(),
//     expense: Joi.string().min(3).optional(),
//     currencyId: Joi.number().min(1).max(3).optional(),
//     amount: Joi.number().min(1).optional(),
//     userIds: Joi.array().items().optional(),
//   });

//   if (process.env.DATABASE === "mongodb") {
//     if (!userId || !mongoose.Types.ObjectId.isValid(id)) {
//       return res.status(404).json({
//         message: INVALID_EXPENSE_ID.message,
//         success: false,
//         code: INVALID_EXPENSE_ID.code,
//       });
//     }
//   }

//   if (!userId) {
//     return res.status(400).send({
//       message: INVALID_USER.message,
//       success: false,
//       code: INVALID_USER.code,
//     });
//   }

//   if (!id) {
//     return res.status(400).send({
//       message: INVALID_EXPENSE_ID.message,
//       success: false,
//       code: INVALID_EXPENSE_ID.code,
//     });
//   }

//   if (Object.keys(fieldsToUpdate).length === 0) {
//     return res.status(400).send({
//       message: NO_FEILDS_TO_UPDATE.message,
//       success: false,
//       code: NO_FEILDS_TO_UPDATE.code,
//     });
//   }

//   try {
//     const { error, value } = updateExpenseSchema.validate(fieldsToUpdate);
//     if (error) {
//       const errorDetails = error.details[0];
//       const errorMap = {
//         date: {
//           "date.format": INVALID_DATE,
//         },
//         amount: {
//           "number.min": INVALID_AMOUNT,
//           "number.base": AMOUNT_BASE,
//         },
//         expense: {
//           "string.min": INVALID_EXPENSE_DETAILS,
//           "string.pattern.base": EXPENSE_PATTERN_BASE,
//           "string.empty": EMPTY_EXPENSE,
//         },
//         currencyId: {
//           "number.base": INVALID_BASECURRENCY_BASE,
//           "number.min": INVALID_BASECURRENCY,
//           "number.max": INVALID_BASECURRENCY,
//         },
//         usre,
//       };

//       const errorResponse =
//         errorMap[errorDetails.path[0]]?.[errorDetails.type] || INVALID_INPUT;
//       return res.status(400).send({
//         message: errorResponse.message,
//         success: false,
//         code: errorResponse.code,
//       });
//     }

//     const {
//       userIds = [],
//       amount: updatedAmount,
//       date,
//       expense,
//       currencyId,
//     } = fieldsToUpdate;

//     const expenses = await findExpenseById({
//       userId,
//       expId: id,
//       isActive: true,
//     });

//     if (!expenses) {
//       return res.status(400).send({
//         message: EXPENSE_NOT_FOUND.message,
//         success: false,
//         code: EXPENSE_NOT_FOUND.code,
//       });
//     }

//     if (expenses.paidBy != userId) {
//       return res.status(400).send({
//         message: "Not authorized",
//         success: false,
//         code: "L-005",
//       });
//     }

//     let updatedAmountValue = updatedAmount || expenses.amount;
//     let updatedDate = date || expenses.date;
//     let updatedExpense = expense || expenses.expense;
//     let updatedCurrencyId = currencyId || expenses.currencyId;

//     const allExpense = await findallExpenses(id);
//     // console.log(allExpense);

//     await Promise.all(
//       allExpense.map((exp) => updateExpense(exp, fieldsToUpdate))
//     );

//     const existingUserIds =
//       process.env.DATABASE === "mongodb"
//         ? allExpense.map((exp) => exp.userId.toString())
//         : allExpense.map((exp) => exp.userId);

//         console.log("EX use id",existingUserIds);

//         const userIdsToAdd = userIds.filter((id) => !existingUserIds.includes(id) && id!=userId);

//     // const userIdsToAdd = userIds.filter(
//     //   (userId) => !existingUserIds.includes(userId)
//     // );
//     // const userIdsToAdd = userIds.filter(
//     //   (Id) =>  !userIds.includes(Id) && Id !== userId
//     // );

//     console.log("userIdsToAdd",userIdsToAdd);

//     // const userIdsToRemove = existingUserIds.filter(
//     //   (userId) => !userIds.includes(userId)
//     // );
//     const userIdsToRemove = existingUserIds.filter(
//       (existingUserId) => !userIds.includes(existingUserId) && existingUserId !== userId
//     );
//     console.log("ids to remove ", userIdsToRemove);

//     // Handle removing users
//     if (userIdsToRemove.length > 0) {
//       await deleteSplitExpense(id, userIdsToRemove);
//       const allExpense=await findallExpenses(id)
//       const expensesToUpdate=allExpense.filter((exp)=>
//       userIdsToRemove.includes(exp.userId)
//       )
//       console.log("expensesToUpdate... /n");
//       console.log(expensesToUpdate);

//       await Promise.all(
//         expensesToUpdate.map((exp)=>updateExpense(exp,{isActive:false}))
//       )

//       // await Promise.all(
//       //   userIdsToRemove.map((userId) => updateExpense({ expId: id, userId }, { isActive: false }))
//       // );
//     }

// let splitAmount;
//     if (userIdsToRemove.length > 0) {

//       await deleteSplitExpense(id, userIdsToRemove);
//       const allExpense = await findallExpenses(id);

//       const expensesToUpdate = allExpense.filter((exp) =>
//         userIdsToRemove.includes(exp.userId)
//       );

//       await Promise.all(
//         expensesToUpdate.map((exp) => updateExpense(exp, { isActive: false }))
//       );
//     }

//     const activeSplitExpenses = await findAllSplitExpense({
//       expId: id,
//       isActive: true,
//     });
//     console.log("length of activeSplitExpenses",activeSplitExpenses.length);

//     // let splitAmount;
//     if (userIdsToAdd.length > 0) {
//       const allExpense = await deactivatedExpenses(id);

//       const expensesToReactivate = allExpense.filter((exp) =>
//         userIdsToAdd.includes(exp.userId)
//       );

//       if (expensesToReactivate.length > 0) {
//         await Promise.all(
//           expensesToReactivate.map((exp) =>
//             updateExpense(exp, { isActive: true })
//           )
//         );
//       }

//       const activeSplitExpenses = await findAllSplitExpense({
//         expId: id,
//         isActive: true,
//       });

//       const existingUserIds =
//         process.env.DATABASE === "mongodb"
//           ? activeSplitExpenses.map((split) => split.userId.toString())
//           : activeSplitExpenses.map((split) => split.userId);

//       // const newUserIds = addUserIds.filter(
//       //   (userId) => !existingUserIds.includes(userId)
//       // );

//       if (activeSplitExpenses.length === 0 && userIdsToAdd.length > 0) {
//         const newNumberOfSplits = userIdsToAdd.length + 1;
//         splitAmount = updatedAmountValue / newNumberOfSplits;

//         const borrowedExpenses = userIdsToAdd.map((id) => {
//           return createExpense(id, {
//             expId: expenses.expId,
//             date: updatedDate,
//             amount: updatedAmountValue,
//             expense: updatedExpense,
//             currencyId: updatedCurrencyId,
//             myShare: splitAmount,
//             paid: false,
//             paidBy: expenses.paidBy,
//           });
//         });

//         await updateExpense(expenses, {
//           moneyLent: splitAmount * (newNumberOfSplits - 1),
//         });

//         await Promise.all(
//           activeSplitExpenses.map((split) =>
//             updateSplitExpenseAmount(split, { splitAmount: splitAmount })
//           )
//         );

//         await Promise.all(
//           userIdsToAdd.map((userId) =>
//             createSplitexpense({
//               expId: id,
//               userId: userId,
//               splitAmount: splitAmount,
//               isActive: true,
//             })
//           )
//         );

//         await createSplitexpense({
//           expId: id,
//           userId: userId,
//           splitAmount: splitAmount,
//           isActive: true,
//         });

//         await updateExpense(expenses, {
//           moneyLent: updatedAmountValue - splitAmount,
//         });

//         const allExpense2 = await findallExpenses(id);

//         await Promise.all(
//           allExpense2.map((exp) =>
//             updateExpense(exp, {
//               myShare: splitAmount,
//             })
//           )
//         );
//       } else if (activeSplitExpenses.length > 0) {
//         const newNumberOfSplits =
//           activeSplitExpenses.length + userIdsToAdd.length;
//         splitAmount = updatedAmountValue / newNumberOfSplits;
//         console.log("splitAmount..........",splitAmount);

//         await Promise.all(
//           activeSplitExpenses.map((split) =>
//             updateSplitExpenseAmount(split, { splitAmount: splitAmount })
//           )
//         );

//         await Promise.all(
//           userIdsToAdd.map((userId) =>
//             createSplitexpense({
//               expId: id,
//               userId: userId,
//               splitAmount: splitAmount,
//               isActive: true,
//             })
//           )
//         );
//         const borrowedExpenses = userIdsToAdd.map((id) => {
//           return createExpense(id, {
//             expId: expenses.expId,
//             date: updatedDate,
//             amount: updatedAmountValue,
//             expense: updatedExpense,
//             currencyId: updatedCurrencyId,
//             myShare: splitAmount,
//             paid: false,
//             paidBy: expenses.paidBy,
//           });
//         });

//         const allExpense2 = await findallExpenses(id);

//         await Promise.all(
//           allExpense2.map((exp) =>
//             updateExpense(exp, {
//               myShare: splitAmount,
//             })
//           )
//         );

//         await updateExpense(expenses, {
//           moneyLent: updatedAmountValue - splitAmount,
//         });
//       }
//     }

//     const activeSplitExpenses2 = await findAllSplitExpense({ expId: id, isActive: true });
//      splitAmount =
//       activeSplitExpenses2.length > 0
//         ? updatedAmountValue / activeSplitExpenses.length
//         : expenses.amount;
//     console.log("splitamount", splitAmount);
//     console.log("updated amount amount", updatedAmountValue);
//     console.log(activeSplitExpenses2.length);

//     await Promise.all(
//       activeSplitExpenses.map((split) =>
//         updateSplitExpenseAmount(split, { splitAmount: splitAmount })
//       )
//     );

//     await updateExpense(expenses, {
//       myShare: splitAmount,
//       moneyLent: updatedAmountValue - splitAmount,
//     });

//     const updatedExpenseWithSplits = await findExpenseById({
//       userId,
//       expId: id,
//       isActive: true,
//     });

//     return res.status(200).json({
//       message: UPDATE_EXPENSE.message,
//       success: true,
//       code: UPDATE_EXPENSE.code,
//       data: {
//         expenses: updatedExpenseWithSplits,
//       },
//     });
//   } catch (error) {
//     console.log(error);

//     if (error.name === "CastError") {
//       return res.status(400).send({
//         message: INVALID_USER.message,
//         success: false,
//         code: INVALID_USER.code,
//       });
//     }
//     if (error.name === "SequelizeForeignKeyConstraintError") {
//       return res.status(400).send({
//         message: Sequelize_query_SequelizeForeignKeyConstraintError.message,
//         success: false,
//         code: Sequelize_query_SequelizeForeignKeyConstraintError.code,
//       });
//     }
//     return res.status(500).send({
//       message: SERVER_ERROR.message,
//       success: false,
//       code: SERVER_ERROR.code,
//     });
//   }
// };

// exports.updateExpense = async (req, res) => {
//   const id = req.params.id;
//   const fieldsToUpdate = req.body;
//   const userId = req.user;

//   const updateExpenseSchema = Joi.object({
//     date: Joi.date().iso().optional(),
//     expense: Joi.string().min(3).optional(),
//     currencyId: Joi.number().min(1).max(3).optional(),
//     amount: Joi.number().min(1).optional(),
//     removeUserIds: Joi.array().items().optional(),
//     addUserIds: Joi.array().items().optional(),
//   });

//   if (process.env.DATABASE === "mongodb") {
//     if (!userId || !mongoose.Types.ObjectId.isValid(id)) {
//       return res.status(404).json({
//         message: INVALID_EXPENSE_ID.message,
//         success: false,
//         code: INVALID_EXPENSE_ID.code,
//       });
//     }
//   }

//   if (!userId) {
//     return res.status(400).send({
//       message: INVALID_USER.message,
//       success: false,
//       code: INVALID_USER.code,
//     });
//   }

//   if (!id) {
//     return res.status(400).send({
//       message: INVALID_EXPENSE_ID.message,
//       success: false,
//       code: INVALID_EXPENSE_ID.code,
//     });
//   }

//   if (Object.keys(fieldsToUpdate).length === 0) {
//     return res.status(400).send({
//       message: NO_FEILDS_TO_UPDATE.message,
//       success: false,
//       code: NO_FEILDS_TO_UPDATE.code,
//     });
//   }

//   try {
//     const { error, value } = updateExpenseSchema.validate(fieldsToUpdate);
//     if (error) {
//       const errorDetails = error.details[0];
//       const errorMap = {
//         date: {
//           "date.format": INVALID_DATE,
//         },
//         amount: {
//           "number.min": INVALID_AMOUNT,
//           "number.base": AMOUNT_BASE,
//         },
//         expense: {
//           "string.min": INVALID_EXPENSE_DETAILS,
//           "string.pattern.base": EXPENSE_PATTERN_BASE,
//           "string.empty": EMPTY_EXPENSE,
//         },
//         currencyId: {
//           "number.base": INVALID_BASECURRENCY_BASE,
//           "number.min": INVALID_BASECURRENCY,
//           "number.max": INVALID_BASECURRENCY,
//         },
//       };

//       const errorResponse =
//         errorMap[errorDetails.path[0]]?.[errorDetails.type] || INVALID_INPUT;
//       return res.status(400).send({
//         message: errorResponse.message,
//         success: false,
//         code: errorResponse.code,
//       });
//     }

//     if (fieldsToUpdate.addUserIds) {
//       if (fieldsToUpdate.addUserIds.length > 0) {
//         const usersExist = await checkUsersExist(fieldsToUpdate.addUserIds);
//         if (!usersExist) {
//           return res.status(400).send({
//             message: "Invalid user IDs",
//             success: false,
//             code: "L-0015",
//           });
//         }
//       }
//     }

//     const expenses = await findExpenseById({
//       userId,
//       expId: id,
//       isActive: true,
//     });

//     if (!expenses) {
//       return res.status(400).send({
//         message: EXPENSE_NOT_FOUND.message,
//         success: false,
//         code: EXPENSE_NOT_FOUND.code,
//       });
//     }

//     if (expenses.paidBy != userId) {
//       return res.status(400).send({
//         message: "Not authorized",
//         success:false,
//         code:"L-005"
//       });
//     }

//     const {
//       amount: updatedAmount,
//       date,
//       expense,
//       currencyId,
//       removeUserIds = [],
//       addUserIds = [],
//     } = fieldsToUpdate;

//     let updatedAmountValue = updatedAmount ? updatedAmount : expenses.amount;
//     let updatedDate = date ? date : expenses.date;
//     let updatedExpense = expense ? expense : expenses.expense;
//     let updatedCurrencyId = currencyId ? currencyId : expenses.currencyId;

//     const allExpense = await findallExpenses(id);

//     await Promise.all(
//       allExpense.map((exp) => updateExpense(exp, fieldsToUpdate))
//     );

//     const newRemoveUserIds = removeUserIds.filter(Id => Id !==userId );

//     if (newRemoveUserIds.length > 0) {
//       await deleteSplitExpense(id, newRemoveUserIds);
//       const allExpense = await findallExpenses(id);
//       const expensesToUpdate = allExpense.filter((exp) =>
//         newRemoveUserIds.includes(exp.userId)
//       );

//       await Promise.all(
//         expensesToUpdate.map((exp) => updateExpense(exp, { isActive: false }))
//       );
//     }

//     let splitAmount;
//     if (addUserIds.length > 0) {
//       const allExpense = await deactivatedExpenses(id);

//       const expensesToReactivate = allExpense.filter((exp) =>
//         addUserIds.includes(exp.userId)
//       );

//       if (expensesToReactivate.length > 0) {
//         await Promise.all(
//           expensesToReactivate.map((exp) =>
//             updateExpense(exp, { isActive: true })
//           )
//         );
//       }

//       const activeSplitExpenses = await findAllSplitExpense({
//         expId: id,
//         isActive: true,
//       });

//       const existingUserIds =
//         process.env.DATABASE === "mongodb"
//           ? activeSplitExpenses.map((split) => split.userId.toString())
//           : activeSplitExpenses.map((split) => split.userId);

//       const newUserIds = addUserIds.filter(
//         (userId) => !existingUserIds.includes(userId)
//       );

//       if (activeSplitExpenses.length === 0 && newUserIds.length > 0) {
//         const newNumberOfSplits = newUserIds.length + 1;
//         splitAmount = updatedAmountValue / newNumberOfSplits;

//         const borrowedExpenses = newUserIds.map((id) => {
//           return createExpense(id, {
//             expId: expenses.expId,
//             date: updatedDate,
//             amount: updatedAmountValue,
//             expense: updatedExpense,
//             currencyId: updatedCurrencyId,
//             myShare: splitAmount,
//             paid: false,
//             paidBy: expenses.paidBy,
//           });
//         });

//         await updateExpense(expenses, {
//           moneyLent: splitAmount * (newNumberOfSplits - 1),
//         });

//         await Promise.all(
//           activeSplitExpenses.map((split) =>
//             updateSplitExpenseAmount(split, { splitAmount: splitAmount })
//           )
//         );

//         await Promise.all(
//           newUserIds.map((userId) =>
//             createSplitexpense({
//               expId: id,
//               userId: userId,
//               splitAmount: splitAmount,
//               isActive: true,
//             })
//           )
//         );

//         await createSplitexpense({
//           expId: id,
//           userId: userId,
//           splitAmount: splitAmount,
//           isActive: true,
//         });

//         await updateExpense(expenses, {
//           moneyLent: updatedAmountValue - splitAmount,
//         });

//         const allExpense2 = await findallExpenses(id);

//         await Promise.all(
//           allExpense2.map((exp) =>
//             updateExpense(exp, {
//               myShare: splitAmount,
//             })
//           )
//         );
//       } else if (activeSplitExpenses.length > 0) {
//         const newNumberOfSplits =
//           activeSplitExpenses.length + newUserIds.length;
//         splitAmount = updatedAmountValue / newNumberOfSplits;
//         await Promise.all(
//           activeSplitExpenses.map((split) =>
//             updateSplitExpenseAmount(split, { splitAmount: splitAmount })
//           )
//         );

//         await Promise.all(
//           newUserIds.map((userId) =>
//             createSplitexpense({
//               expId: id,
//               userId: userId,
//               splitAmount: splitAmount,
//               isActive: true,
//             })
//           )
//         );

//         const allExpense2 = await findallExpenses(id);

//         await Promise.all(
//           allExpense2.map((exp) =>
//             updateExpense(exp, {
//               myShare: splitAmount,
//             })
//           )
//         );

//         await updateExpense(expenses, {
//           moneyLent: updatedAmountValue - splitAmount,
//         });
//       }
//     }

//     const activeSplitExpenses = await findAllSplitExpense({
//       expId: id,
//       isActive: true,
//     });

//     if (activeSplitExpenses.length > 0) {
//       const newNumberOfSplits = activeSplitExpenses.length;
//       splitAmount = updatedAmountValue / newNumberOfSplits;
//       await Promise.all(
//         activeSplitExpenses.map((split) =>
//           updateSplitExpenseAmount(split, { splitAmount: splitAmount })
//         )
//       );
//     } else {

//       splitAmount = updatedAmountValue;
//     }

//     const data = {
//       userId,
//       id,
//     };

//     const splitexpense = await findsplitexpensebyid(data);

//     const exp = await updateExpense(expenses, {
//       myShare: splitexpense ? splitexpense.splitAmount : updatedAmountValue,
//       moneyLent: updatedAmountValue - (splitexpense ? splitexpense.splitAmount : updatedAmountValue),
//     });

//     const updatedExpenseWithSplits = await findExpenseById({
//       userId,
//       expId: id,
//       isActive: true,
//     });

//     return res.status(200).json({
//       message: UPDATE_EXPENSE.message,
//       success: true,
//       code: UPDATE_EXPENSE.code,
//       data: {
//         expenses: updatedExpenseWithSplits,
//       },
//     });
//   } catch (error) {
//     console.log(error);

//     if (error.name === "CastError") {
//       return res.status(400).send({
//         message: INVALID_USER.message,
//         success: false,
//         code: INVALID_USER.code,
//       });
//     }
//     if (error.name === "SequelizeForeignKeyConstraintError") {
//       return res.status(400).send({
//         message: Sequelize_query_SequelizeForeignKeyConstraintError.message,
//         success: false,
//         code: Sequelize_query_SequelizeForeignKeyConstraintError.code,
//       });
//     }
//     return res.status(500).send({
//       message: SERVER_ERROR.message,
//       success: false,
//       code: SERVER_ERROR.code,
//     });
//   }
// };

exports.deleteExpense = async (req, res) => {
  const id = req.params.id;
  const userId = req.user;
  if (process.env.DATABASE === "mongodb") {
    if (!userId || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        message: INVALID_EXPENSE_ID.message,
        success: false,
        code: INVALID_EXPENSE_ID.code,
      });
    }
  }
  if (!userId) {
    return res.status(400).send({
      message: INVALID_USER.message,
      success: false,
      code: INVALID_USER.code,
    });
  }

  if (!id) {
    return res.status(400).send({
      message: INVALID_EXPENSE_ID,
      success: false,
      code: INVALID_EXPENSE_ID.code,
    });
  }
  const user = await findById(userId);
  if (!user) {
    return res.status(400).send({
      message: USER_NOT_FOUND.message,
      success: false,
      code: USER_NOT_FOUND.code,
    });
  }

  try {
    const expense = await findExpenseById({
      userId,
      expId: id,
      isActive: true,
    });

    if (!expense) {
      return res.status(400).send({
        message: EXPENSE_NOT_FOUND.message,
        success: false,
        code: EXPENSE_NOT_FOUND.code,
      });
    }
    if (expense.userId !== expense.paidBy) {
      return res.status(400).send({
        message: "Not authorized",
        success: false,
        code: "L-005",
      });
    }

    if (expense.length == 0) {
      return res.status(400).send({
        message: EXPENSE_NOT_FOUND.message,
        success: false,
        code: EXPENSE_NOT_FOUND.code,
      });
    }

    const allExpense = await findallExpenses(id);
    const updatedExpense = await Promise.all(
      allExpense.map((exp) => updateExpense(exp, { isActive: false }))
    );

    if (updatedExpense) {
      if (process.env.DATABASE === "mongodb") {
        await updateSplitExpense(updatedExpense, { isActive: false });
      } else {
        const splitexpenses = await findAllSplitExpense({
          expId: id,
          isActive: true,
        });
        splitexpenses.map((split) =>
          updateSplitExpense(split, { isActive: false })
        );

        const allExpenses = await findExpenses(userId);
        const totalExpense = await Expenses.sum("myShare", {
          where: {
            userId: userId,
            isActive: true,
          },
        });
        return res.status(200).send({
          message: DELETE_EXPENSE.message,
          success: true,
          code: DELETE_EXPENSE.code,
          data: {
            expenses: allExpenses,
            totalExpense,
          },
        });
      }
    } else {
      return res.status(400).send({
        message: DELETE_EXPENSE_ERROR.message,
        success: false,
        code: DELETE_EXPENSE_ERROR.code,
      });
    }
  } catch (error) {
    console.error("Error updating expense:", error);

    return res.status(500).send({
      message: SERVER_ERROR.message,
      success: false,
      code: SERVER_ERROR.code,
    });
  }
};

exports.fetchExpenseById = async (req, res) => {
  const id = req.params.id;
  const userId = req.user;
  if (process.env.DATABASE === "mongodb") {
    if (!userId || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        message: INVALID_EXPENSE_ID.message,
        success: false,
        code: INVALID_EXPENSE_ID.code,
      });
    }
  }
  if (!userId) {
    return res.status(400).send({
      message: INVALID_USER.message,
      success: false,
      code: INVALID_USER.code,
    });
  }

  if (!id) {
    return res.status(400).send({
      message: INVALID_EXPENSE_ID.message,
      success: false,
      code: INVALID_EXPENSE_ID.code,
    });
  }

  try {
    const expense = await findExpenseById({
      userId,
      expId: id,
      isActive: true,
    });
    if (!expense) {
      return res.status(404).send({
        messsage: EXPENSE_NOT_FOUND.message,
        success: false,
        code: EXPENSE_NOT_FOUND.code,
      });
    }

    if (expense.length == 0) {
      return res.status(404).send({
        messsage: EXPENSE_NOT_FOUND.message,
        success: false,
        code: EXPENSE_NOT_FOUND.code,
      });
    }

    return res.status(200).send({
      message: EXPENSE_FOUND.message,
      success: true,
      data: {
        expense,
      },
    });
  } catch (error) {
    console.log(error);

    return res.status(500).send({
      message: SERVER_ERROR.message,
      success: false,
      code: SERVER_ERROR.code,
    });
  }
};
