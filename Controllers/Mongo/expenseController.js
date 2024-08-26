const {
    INVALID_USER,
    GET_ALL_EXPENSE,
    SERVER_ERROR,
    EXPENSE_NOT_FOUND,
    INVALID_BASECURRENCY,
    INVALID_EXPENSE_DETAILS,
    INVALID_BASECURRENCY_BASE,
    CURRENCY_REQUIRED,
    INVALID_AMOUNT,
    AMOUNT_BASE,
    AMOUNT_REQUIRED,
    EXPENSE_PATTERN_BASE,
    EXPENSE_DETAILS_REQUIRED,
    EMPTY_EXPENSE,
    DATE_REQUIRED,
    INVALID_DATE,
    ADD_EXPENSE_ERROR,
    ADD_EXPENSE,
    INVALID_INPUT,
    UPDATE_EXPENSE,
    UPDATE_EXPENSE_ERROR,
    NO_FEILDS_TO_UPDATE,
    INVALID_EXPENSE_ID,
    DELETE_EXPENSE,
    DELETE_EXPENSE_ERROR,
    EXPENSE_FOUND,
    DATABASE_ERROR,
} = require("../../Codes");
const Joi = require("joi");
const {
    SplitExpenses,
    Expenses,
    Currencies,
} = require("../../database/mongodb.model");
const {createExpense} = require("../../Query/Queries");

exports.getAllExpense = async (req, res) => {
    const userId = req.user;
    try {
        if (!userId) {
            return res.status(400).send({
                message: INVALID_USER.message,
                success: false,
                code: INVALID_USER.code,
            });
        }

        const expenses = await Expenses.find({userId, isActive: true}).populate({
            path: "splitExpenses",
            match: {isActive: true},
        });
        if (!expenses) {
            return res.status(400).send({
                message: EXPENSE_NOT_FOUND.message,
                success: false,
                code: EXPENSE_NOT_FOUND.code,
            });
        }

        return res.status(200).json({
            message: GET_ALL_EXPENSE.message,
            success: true,
            code: GET_ALL_EXPENSE.code,
            data: {
                expenses,
            },
        });
    } catch (err) {
        console.error("Error fetching expenses:", err);
        return res.status(500).send({
            message: SERVER_ERROR.message,
            success: false,
            code: SERVER_ERROR.code,
        });
    }
};

exports.addExpense = async (req, res) => {
    const userId = req.user;
    const addExpenseSchema = Joi.object({
        date: Joi.date().iso().required(),
        expense: Joi.string().min(3).pattern(/^\S*$/).required(),
        currencyId: Joi.number().min(1).max(3).required(),
        amount: Joi.number().min(1).required(),
        userIds: Joi.array().items(Joi.string().hex().length(24)).optional(),
    });

    try {
        const {date, amount, expense, currencyId, userIds = []} = req.body;

        const {error} = addExpenseSchema.validate(req.body);
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

        const currency = await Currencies.findOne({currencyId});

        if (!currency) {
            return res.status(400).json({
                message: INVALID_BASECURRENCY.message,
                success: false,
                code: INVALID_BASECURRENCY.code,
            });
        }

        const newExpense = new Expenses({
            userId,
            date,
            amount,
            expense,
            currencyId: currency.currencyId,
        });

        const data = await newExpense.save();

        if (!data) {
            return res.status(400).send({
                message: ADD_EXPENSE_ERROR.message,
                success: false,
                code: ADD_EXPENSE_ERROR.code
            });
        }

        if (userIds.length > 0) {
            const expId = newExpense._id;
            const numberOfSplits = userIds.length + 1;
            const splitAmount = newExpense.amount / numberOfSplits;
            const splitPromises = userIds.map((splitUserId) => {
                return new SplitExpenses({
                    expId,
                    userId: splitUserId,
                    splitAmount: parseFloat(splitAmount.toFixed(2)),
                    isActive: true,
                }).save();
            });

            if (!userIds.includes(userId)) {
                splitPromises.push(
                    new SplitExpenses({
                        expId,
                        userId,
                        splitAmount,
                        isActive: true,
                    }).save()
                );
            }

            await Promise.all(splitPromises);
        }

        const allExpenses = await Expenses.find({
            userId,
            isActive: true,
        }).populate({
            path: "splitExpenses",
            match: {isActive: true},
        });

        return res.status(200).json({
            message: ADD_EXPENSE.message,
            success: true,
            code: ADD_EXPENSE.code,
            data: {
                expenses: allExpenses,
            },

        });
    } catch (error) {
        console.error(error);
        if (error.name === "ValidationError") {
            return res.status(400).send({success: false});
        }
        return res.status(500).send({message: SERVER_ERROR.message, success: false, code: SERVER_ERROR.code});
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
        removeUserIds: Joi.array().items(Joi.string().hex().length(24)).optional(),
        addUserIds: Joi.array().items(Joi.string().hex().length(24)).optional(),
    });

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
        const {error, value} = updateExpenseSchema.validate(fieldsToUpdate);
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

        const expense = await Expenses.findOne({
            _id: id,
            userId,
            isActive: true,
        });

        if (!expense) {
            return res.status(400).send({
                message: EXPENSE_NOT_FOUND.message,
                success: false,
                code: EXPENSE_NOT_FOUND.code,
            });
        }

        const {
            amount: updatedAmount,
            date,
            expense: updatedExpense,
            currencyId,
            removeUserIds = [],
            addUserIds = [],
        } = value;

        if (date) expense.date = date;
        if (updatedAmount) expense.amount = updatedAmount;
        if (updatedExpense) expense.expense = updatedExpense;
        if (currencyId) expense.currencyId = currencyId;

        const data = await expense.save();
        if (!data) {
            return res.status(400).send({
                message: UPDATE_EXPENSE_ERROR.message,
                success: false,
                code: UPDATE_EXPENSE_ERROR.code
            })
        }
        // console.log(data.amount);
        const Ids = removeUserIds.filter((id) => id != userId);
        if (Ids.length > 0) {
            await SplitExpenses.updateMany(
                {expId: id, userId: {$in: removeUserIds}},
                {isActive: false}
            );
        }

        const activeSplitExpenses = await SplitExpenses.find({
            expId: id,
            isActive: true,
        });

        if (activeSplitExpenses.length === 0 && addUserIds.length > 0) {
            const newNumberOfSplits = addUserIds.length + 1;

            const splitAmount = data.amount / newNumberOfSplits;
            // console.log(splitAmount);
            await Promise.all(
                activeSplitExpenses.map((split) =>
                    split.updateOne({splitAmount: parseFloat(splitAmount.toFixed(2))})
                )
            );
            const splitExpenspromise = await Promise.all(
                addUserIds.map((userId) =>
                    SplitExpenses.create({
                        expId: id,
                        userId: userId,
                        splitAmount: splitAmount,
                        isActive: true,
                    })
                )
            );

            splitExpenspromise.push(
                SplitExpenses.create({
                    expId: id,
                    userId: userId,
                    splitAmount: splitAmount,
                    isActive: true,
                })
            );
        } else {
            // const newNumberOfSplits = activeSplitExpenses.length + addUserIds.length;
            // const splitAmount = data.amount / newNumberOfSplits;

            // await Promise.all(
            //   activeSplitExpenses.map((split) =>
            //     split.updateOne({ splitAmount: splitAmount })
            //   )
            // );

            const existingUserIds = activeSplitExpenses.map((split) =>
                split.userId.toString()
            );

            const newUserIds = addUserIds.filter(
                (userId) => !existingUserIds.includes(userId.toString())
            );

            if (newUserIds.length == 0) {
                const newNumberOfSplits =
                    activeSplitExpenses.length + newUserIds.length;
                const splitAmount = data.amount / newNumberOfSplits;

                await Promise.all(
                    activeSplitExpenses.map((split) =>
                        split.updateOne({splitAmount: parseFloat(splitAmount.toFixed(2))})
                    )
                );
            } else {
                const newNumberOfSplits =
                    activeSplitExpenses.length + newUserIds.length;
                const splitAmount = data.amount / newNumberOfSplits;

                await Promise.all(
                    activeSplitExpenses.map((split) =>
                        split.updateOne({splitAmount: parseFloat(splitAmount.toFixed(2))})
                    )
                );

                const splitExpenspromise = await Promise.all(
                    addUserIds.map((userId) =>
                        SplitExpenses.create({
                            expId: id,
                            userId: userId,
                            splitAmount: splitAmount,
                            isActive: true,
                        })
                    )
                );
            }
        }

        await new Promise((resolve) => setTimeout(resolve, 100));

        const updatedExpenseWithSplits = await Expenses.findOne({
            _id: id,
        }).populate({
            path: "splitExpenses",
            match: {isActive: true},
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
        return res.status(500).send({
            message: SERVER_ERROR.message,
            success: false,
            code: SERVER_ERROR.code,
        });
    }
};

exports.deleteExpense = async (req, res) => {
    const id = req.params.id;
    const userId = req.user;

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
        const expense = await Expenses.findOne({
            _id: id,
            userId,
            isActive: true,
        });

        if (!expense) {
            return res.status(400).send({
                message: EXPENSE_NOT_FOUND.message,
                success: false,
                code: EXPENSE_NOT_FOUND.code,
            });
        }

        expense.isActive = false;
        const updatedExpense = await expense.save();

        if (updatedExpense) {
            await SplitExpenses.updateMany(
                {expId: id, isActive: true},
                {isActive: false}
            );

            const allExpenses = await Expenses.find({
                userId: userId,
                isActive: true,
            }).populate({
                path: "splitExpenses",
                match: {isActive: true},
            });

            return res.status(200).send({
                message: DELETE_EXPENSE.message,
                success: true,
                code: DELETE_EXPENSE.code,
                data: {
                    expenses: allExpenses,
                },
            });
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
        const expense = await Expenses.findOne({
            _id: id,
            userId,
            isActive: true,
        }).populate({
            path: "splitExpenses",
            match: {isActive: true},
        });

        if (!expense) {
            return res.status(404).send({
                message: EXPENSE_NOT_FOUND.message,
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
        console.log(error.name);
        if (error.name == "CastError") {
            return res.status(400).send({
                message: DATABASE_ERROR.message,
                success: false,
                code: DATABASE_ERROR.code,
            });
        }
        return res.status(500).send({
            message: SERVER_ERROR.message,
            success: false,
            code: SERVER_ERROR.code,
        });
    }
};
