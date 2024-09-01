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
    if (
      process.env.DATABASE === "mongodb" &&
      !mongoose.Types.ObjectId.isValid(id)
    ) {
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
  
      const errorResponse =
        errorMap[errorDetails.path[0]]?.[errorDetails.type] || INVALID_INPUT;
      return res.status(400).json({
        message: errorResponse.message,
        success: false,
        code: errorResponse.code,
      });
    }
  
    try {
      const { userIds = [], amount, date, expense, currencyId } = value;
  
      // Find the existing expense
      const expenses = await findExpenseById({
        userId,
        expId: id,
        isActive: true,
      });
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
  
      const allExpense = await findallExpenses(id);
  
      await Promise.all(
        allExpense.map((exp) => updateExpense(exp, fieldsToUpdate))
      );
  
      const existingUserIds =
        process.env.DATABASE === "mongodb"
          ? allExpense.map((exp) => exp.userId.toString())
          : allExpense.map((exp) => exp.userId);
  
  
      const userIdsToAdd = userIds.filter(
        (id) => !existingUserIds.includes(id) && id !== userId
      );
  
  
      console.log("existingUserIds", existingUserIds);
      console.log("ids to add", userIdsToAdd);
  
      const userIdsToRemove = existingUserIds.filter(
        (existingUserId) =>
          !userIds.includes(existingUserId) && existingUserId !== userId
      );
      console.log("ids to remove", userIdsToRemove);
  
      if (userIdsToRemove.length > 0) {
        await deleteSplitExpense(id, userIdsToRemove);
        const expensesToUpdate = allExpense.filter((exp) =>
          userIdsToRemove.includes(exp.userId)
        );
        await Promise.all(
          expensesToUpdate.map((exp) => updateExpense(exp, { isActive: false }))
        );
      }
  
      // "create splits add expense *************************************************************************************"
  
      if (userIdsToAdd.length > 0) {
        console.log("userIdstadd");
  
        console.log(userIdsToAdd);
  
        
  // recativate************************************************
        const deactivatedExpense = await deactivatedExpenses(id);
  
        const expensesToReactivate = deactivatedExpense.filter((exp) =>
          userIdsToAdd.includes(exp.userId)
        );
       
        
  
        if (expensesToReactivate.length > 0) {
          await Promise.all(
            expensesToReactivate.map((exp) =>
              updateExpense(exp, { isActive: true })
            )
          );
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
  
  
    // ****************************************************
  
        const activeSplitExpenses = await findAllSplitExpense({
          expId: id,
          isActive: true,
        });
  
       
        const newExpenses = await findallExpenses(id);
        const existingUserIds =
          process.env.DATABASE === "mongodb"
            ? newExpenses.map((exp) => exp.userId.toString())
            : newExpenses.map((exp) => exp.userId);
  
        await new Promise((resolve) => setTimeout(resolve, 100));
        console.log(existingUserIds, "inside exitsting user ids");
  
        const addUserIds = userIdsToAdd.filter(
          (id) => !existingUserIds.includes(id) && id !== userId
        );
  
  
        console.log("addUserIds", addUserIds);
  
        if (activeSplitExpenses.length == 0 && addUserIds.length > 0) {
          const numberOfSplits = addUserIds.length + 1;
          console.log("inside split");
          console.log("number of splits", numberOfSplits);
          const splitAmount = updatedAmountValue / numberOfSplits;
          const moneyLent = updatedAmountValue - splitAmount;
  
          await Promise.all(
            addUserIds.map((userId) =>
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
  
          const borrowedExpenses = addUserIds.map((id) => {
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
  
          await updateExpense(expenses, { moneyLent, myShare: splitAmount });
        } 
        else if (activeSplitExpenses.length > 0 && addUserIds.length>0 ) {
          const numberOfSplits = activeSplitExpenses.length + addUserIds.length;
          const splitAmount = updatedAmountValue / numberOfSplits;
          const moneyLent = updatedAmountValue - splitAmount;
  
          await Promise.all(
            addUserIds.map((userId) =>
              createSplitexpense({
                expId: id,
                userId: userId,
                splitAmount: splitAmount,
                isActive: true,
              })
            )
          );
  
          // const borrowedExpenses = addUserIds.map((id) => {
          //   return createExpense(id, {
          //     expId: expenses.expId,
          //     date: updatedDate,
          //     amount: updatedAmountValue,
          //     expense: updatedExpense,
          //     currencyId: updatedCurrencyId,
          //     myShare: splitAmount,
          //     paid: false,
          //     paidBy: expenses.paidBy,
          //   });
          // });
          await updateExpense(expenses, { moneyLent, myShare: splitAmount });
        }
      }
  
      const activeSplitExpenses2 = await findAllSplitExpense({
        expId: id,
        isActive: true,
      });
  
      const splitAmount =
        activeSplitExpenses2.length > 0
          ? updatedAmountValue / activeSplitExpenses2.length
          : expenses.amount;
  
      console.log("splitAmount...out", splitAmount);
  
      if (activeSplitExpenses2.length > 0) {
        await Promise.all(
          activeSplitExpenses2.map((split) =>
            updateSplitExpenseAmount(split, { splitAmount })
          )
        );
      }
  
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