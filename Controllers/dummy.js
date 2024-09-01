exports.updateExpense = async (req, res) => {
    const id = req.params.id;
    const userId = req.user;
    const fieldsToUpdate = req.body;
  
    const updateExpenseSchema = Joi.object({
      date: Joi.date().iso().optional(),
      expense: Joi.string().min(3).optional(),
      currencyId: Joi.number().min(1).max(3).optional(),
      amount: Joi.number().min(1).optional(),
      userIds: Joi.array().items().optional(),
    });
  
    // Basic Validation
    if (!userId || !id) {
      return res.status(400).json({
        message: id ? INVALID_USER.message : INVALID_EXPENSE_ID.message,
        success: false,
        code: id ? INVALID_USER.code : INVALID_EXPENSE_ID.code,
      });
    }
  
    // Validate MongoDB ObjectId if applicable
    if (process.env.DATABASE === "mongodb" && !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        message: INVALID_EXPENSE_ID.message,
        success: false,
        code: INVALID_EXPENSE_ID.code,
      });
    }
  
    // Validate request body using Joi schema
    const { error, value } = updateExpenseSchema.validate(fieldsToUpdate);
    if (error) {
      const errorDetails = error.details[0];
      const errorMap = {
        date: { "date.format": INVALID_DATE },
        amount: { "number.min": INVALID_AMOUNT, "number.base": AMOUNT_BASE },
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
  
      const errorResponse = errorMap[errorDetails.path[0]]?.[errorDetails.type] || INVALID_INPUT;
      return res.status(400).json({
        message: errorResponse.message,
        success: false,
        code: errorResponse.code,
      });
    }
  
    try {
      const { userIds = [], amount, date, expense, currencyId } = value;
  
      // Find the existing expense
      const expenses = await findExpenseById({ userId, expId: id, isActive: true });
      if (!expenses) {
        return res.status(404).json({
          message: EXPENSE_NOT_FOUND.message,
          success: false,
          code: EXPENSE_NOT_FOUND.code,
        });
      }
  
      // Authorization check
      if (expenses.paidBy !== userId) {
        return res.status(403).json({
          message: "Not authorized",
          success: false,
          code: "L-005",
        });
      }
  
      // Update fields if provided
      const updatedAmountValue = amount || expenses.amount;
      const updatedDate = date || expenses.date;
      const updatedExpense = expense || expenses.expense;
      const updatedCurrencyId = currencyId || expenses.currencyId;
  
      // Fetch all related expenses
      const allExpense = await findallExpenses(id);
  
      // Existing user IDs from expenses
      const existingUserIds = process.env.DATABASE === "mongodb"
        ? allExpense.map((exp) => exp.userId.toString())
        : allExpense.map((exp) => exp.userId);
  
      // Calculate users to add and remove
      const userIdsToAdd = userIds.filter((id) => !existingUserIds.includes(id) && id !== userId);
      const userIdsToRemove = existingUserIds.filter(
        (existingUserId) => !userIds.includes(existingUserId) && existingUserId !== userId
      );
  
      // Handle removing users
      if (userIdsToRemove.length > 0) {
        await deleteSplitExpense(id, userIdsToRemove);
        const expensesToUpdate = allExpense.filter((exp) => userIdsToRemove.includes(exp.userId));
        await Promise.all(expensesToUpdate.map((exp) => updateExpense(exp, { isActive: false })));
      }
  
      // Handle adding users
      let splitAmount;
      if (userIdsToAdd.length > 0) {
        const expensesToReactivate = allExpense.filter((exp) => userIdsToAdd.includes(exp.userId));
        if (expensesToReactivate.length > 0) {
          await Promise.all(expensesToReactivate.map((exp) => updateExpense(exp, { isActive: true })));
        }
  
        const activeSplitExpenses = await findAllSplitExpense({ expId: id, isActive: true });
        const newNumberOfSplits = activeSplitExpenses.length + userIdsToAdd.length;
        splitAmount = updatedAmountValue / newNumberOfSplits;
  
        await Promise.all(
          activeSplitExpenses.map((split) => updateSplitExpenseAmount(split, { splitAmount }))
        );
  
        await Promise.all(
          userIdsToAdd.map((userId) =>
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
  
        await updateExpense(expenses, { moneyLent: updatedAmountValue - splitAmount });
      }
  
      // Final split amount update
      const activeSplitExpenses2 = await findAllSplitExpense({ expId: id, isActive: true });
      splitAmount =
        activeSplitExpenses2.length > 0
          ? updatedAmountValue / activeSplitExpenses2.length
          : expenses.amount;
  
      await Promise.all(
        activeSplitExpenses2.map((split) =>
          updateSplitExpenseAmount(split, { splitAmount })
        )
      );
  
      await updateExpense(expenses, {
        myShare: splitAmount,
        moneyLent: updatedAmountValue - splitAmount,
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
      console.error(error);
  
      const errorResponse = {
        CastError: {
          message: INVALID_USER.message,
          code: INVALID_USER.code,
        },
        SequelizeForeignKeyConstraintError: {
          message: Sequelize_query_SequelizeForeignKeyConstraintError.message,
          code: Sequelize_query_SequelizeForeignKeyConstraintError.code,
        },
      };
  
      const errorDetails = errorResponse[error.name] || {
        message: SERVER_ERROR.message,
        code: SERVER_ERROR.code,
      };
  
      return res.status(500).json({
        message: errorDetails.message,
        success: false,
        code: errorDetails.code,
      });
    }
  };
  


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
      } = fieldsToUpdate;
  
      let updatedAmountValue = updatedAmount ? updatedAmount : expenses.amount;
      let updatedDate = date ? date : expenses.date;
      let updatedExpense = expense ? expense : expenses.expense;
      let updatedCurrencyId = currencyId ? currencyId : expenses.currencyId;
  
      const allExpense = await findallExpenses(id);
  
      await Promise.all(
        allExpense.map((exp) => updateExpense(exp, fieldsToUpdate))
      );
      
      
      const newRemoveUserIds = removeUserIds.filter(Id => Id !==userId );
      
      
  
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
      if (addUserIds.length > 0) {
        const allExpense = await deactivatedExpenses(id);
      
        const expensesToReactivate = allExpense.filter((exp) =>
          addUserIds.includes(exp.userId)
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
  
        const newUserIds = addUserIds.filter(
          (userId) => !existingUserIds.includes(userId)
        );
  
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