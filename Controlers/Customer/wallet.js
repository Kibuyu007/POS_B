import Deposit from "../../Models/Customers/wallet.js";
import Sales from "../../Models/Transactions/sales.js";

// Deposit money
const depozit = async (req, res) => {
  try {
    const { customerId, depositAmount } = req.body;

    // Get latest balance
    const lastTransaction = await Deposit.findOne({ customerId }).sort({
      createdAt: -1,
    });

    const prevBalance = lastTransaction ? lastTransaction.balance : 0;
    const newBalance = prevBalance + depositAmount;

    const deposit = new Deposit({
      customerId,
      depositAmount,
      balance: newBalance,
      createdBy: req.userId,
    });

    await deposit.save();
    res.json({ success: true, balance: newBalance, deposit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Withdraw money
const withDraw = async (req, res) => {
  try {
    const { customerId, withdrawAmount } = req.body;

    const lastTransaction = await Deposit.findOne({ customerId }).sort({
      createdAt: -1,
    });

    const prevBalance = lastTransaction ? lastTransaction.balance : 0;

    if (withdrawAmount > prevBalance) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    const newBalance = prevBalance - withdrawAmount;

    const withdraw = new Deposit({
      customerId,
      withdrawAmount,
      balance: newBalance,
      createdBy: req.userId,
    });

    await withdraw.save();
    res.json({ success: true, balance: newBalance, withdraw });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get current balance
const getCurrentBalance = async (req, res) => {
  try {
    const { id } = req.params; // <-- FIX: use id, not customerId

    const lastTransaction = await Deposit.findOne({ customerId: id }).sort({
      createdAt: -1,
    });

    const balance = lastTransaction ? lastTransaction.balance : 0;

    res.json({ success: true, balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Pay bills
const payBill = async (req, res) => {
  try {
    const { customerId, paidAmount, payFull } = req.body;

    // find bills with status 'Bill'
    const bills = await Sales.find({
      customerDetails: customerId,
      status: "Bill",
    }).sort({
      createdAt: 1, // oldest first
    });

    let remaining = paidAmount;

    for (let bill of bills) {
      if (payFull) {
        // full payment: mark entire bill as paid
        bill.status = "Paid";
        bill.paidAmount = bill.totalAmount;
        await bill.save();
        remaining -= bill.totalAmount;
      } else if (remaining > 0) {
        // partial payment: mark items until amount is exhausted
        let covered = 0;
        bill.items.forEach((item) => {
          const itemTotal = item.quantity * item.price;
          if (covered + itemTotal <= remaining) {
            item.status = "Paid"; // add status field in schema if not exists
            covered += itemTotal;
          }
        });
        bill.paidAmount = covered;
        await bill.save();
        remaining -= covered;
      }
    }

    res.json({ success: true, message: "Payment successful" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Report of all deposits & withdrawals for a customer
const getCustomerReport = async (req, res) => {
  try {
    const { id } = req.params; // customerId

    // Fetch all transactions (both deposit & withdraw) for this customer
    const transactions = await Deposit.find({ customerId: id })
      .sort({ createdAt: -1 }) // latest first
      .populate("createdBy", "name email"); // optional: show who performed

    if (!transactions || transactions.length === 0) {
      return res.status(404).json({ message: "No transactions found" });
    }

    // Calculate totals
    const totalDeposits = transactions.reduce(
      (sum, tx) => sum + (tx.depositAmount || 0),
      0
    );
    const totalWithdrawals = transactions.reduce(
      (sum, tx) => sum + (tx.withdrawAmount || 0),
      0
    );

    res.json({
      customerId: id,
      totalDeposits,
      totalWithdrawals,
      balance: totalDeposits - totalWithdrawals,
      transactions,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export { depozit, withDraw, payBill, getCurrentBalance, getCustomerReport };
