// const mongoose = require("mongoose");

// const UserSchema = new mongoose.Schema({
 
//   username: {
//     type: String,
//     required: true,
//   },
//   email: {
//     type: String,
//     required: true,
//     unique: true,
//   },
//   password: {
//     type: String,
//     required: true,
//   },
//   baseCurrency: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Currencies",
//   },
//   profileUrl: {
//     type: String,
//   },
//   isActive: {
//     type: Boolean,
//     default: true,
//   },
// });

// const ExpenseSchema = new mongoose.Schema({
 
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Users",
//     required: true,
//   },
//   date: {
//     type: Date,
//   },
//   expense: {
//     type: String,
//   },
//   currencyId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Currencies",
//     required: true,
//   },
//   amount: {
//     type: Number,
//   },
//   isActive: {
//     type: Boolean,
//     default: true,
//   },
// });


// const SplitExpenseSchema = new mongoose.Schema(
//   {
 
//     expId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Expenses",
//       required: true,
//     },
//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Users",
//       required: true,
//     },
//     splitAmount: {
//       type: Number,
//       required: true,
//     },
//     isActive: {
//       type: Boolean,
//       default: true,
//     },
//   },
//   {
//     collection: "SplitExpenses",
//   }
// );
// const CurrencySchema = new mongoose.Schema({
//   currencyId: {
//     type: Number,
//     required: true,
//     unique: true,
//   },
//   currencyName: {
//     type: String,
//     required: true,
//   },
//   currencyCode: {
//     type: String,
//     required: true,
//   },
//   isActive: {
//     type: Boolean,
//     default: true,
//   },
// });
// const Currencies = mongoose.model("Currencies", CurrencySchema);
// const SplitExpenses = mongoose.model("SplitExpenses", SplitExpenseSchema);

// const Expenses = mongoose.model("Expenses", ExpenseSchema);

// const Users = mongoose.model("Users", UserSchema);
// module.exports = { SplitExpenses, Expenses, Users, Currencies };


const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  baseCurrency: {
    type: Number,
    ref: "Currencies",
  },
  profileUrl: {
    type: String,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

const ExpenseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true,
  },
  date: {
    type: Date,
  },
  expense: {
    type: String,
  },
  currencyId: {
    type: Number,
    ref: "Currencies",
    required: true,
  },
  amount: {
    type: Number,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

ExpenseSchema.virtual("splitExpenses", {
  ref: "SplitExpenses",
  localField: "_id",
  foreignField: "expId",
});

ExpenseSchema.set("toObject", { virtuals: true });
ExpenseSchema.set("toJSON", { virtuals: true });

const SplitExpenseSchema = new mongoose.Schema({
  expId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Expenses",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true,
  },
  splitAmount: {
    type: Number,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  collection: "SplitExpenses",
});

const CurrencySchema = new mongoose.Schema({
  currencyId: {
    type: Number,
    required: true,
    unique: true,
  },
  currencyName: {
    type: String,
    required: true,
  },
  currencyCode: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});


SplitExpenseSchema.pre('save', function (next) {
  if (this.splitAmount != null) {  
    this.splitAmount = parseFloat(this.splitAmount.toFixed(2));
  }
  next();
});

const Currencies = mongoose.model("Currencies", CurrencySchema);
const SplitExpenses = mongoose.model("SplitExpenses", SplitExpenseSchema);
const Expenses = mongoose.model("Expenses", ExpenseSchema);
const Users = mongoose.model("Users", UserSchema);

module.exports = { SplitExpenses, Expenses, Users, Currencies };
